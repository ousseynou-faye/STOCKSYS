import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type PrismaLike = any;

@Injectable()
export class AuditNotifyService {
  async audit(prisma: PrismaLike, params: { action: string; details: string; user?: { sub?: string; username?: string }; entityType?: string; entityId?: string; }) {
    const { action, details, user, entityType, entityId } = params;
    await prisma.auditLog.create({
      data: {
        action,
        details,
        userId: user?.sub,
        username: user?.username,
        entityType,
        entityId,
      },
    });
  }

  async notify(prisma: PrismaLike, params: { type: string; message: string; storeId?: string; variationId?: string; }) {
    const { type, message, storeId, variationId } = params;
    await prisma.notification.create({
      data: { type, message, storeId, variationId },
    });
  }

  async notifyLowStock(
    prisma: PrismaLike,
    params: {
      storeId: string;
      quantity: number;
      variation:
        | string
        | {
            id: string;
            sku?: string | null;
            attributes?: Prisma.JsonValue | null;
            product?: { name: string; lowStockThreshold: number | null } | null;
          };
      storeName?: string | null;
    },
  ) {
    const { storeId, quantity, storeName } = params;
    if (typeof storeId !== 'string' || storeId.length === 0) return;

    const resolveVariation = async () => {
      if (!params.variation) return null;
      if (typeof params.variation === 'string') {
        return prisma.productVariation.findUnique({
          where: { id: params.variation },
          include: { product: { select: { name: true, lowStockThreshold: true } } },
        });
      }
      if (params.variation?.product) return params.variation;
      return prisma.productVariation.findUnique({
        where: { id: params.variation.id },
        include: { product: { select: { name: true, lowStockThreshold: true } } },
      });
    };

    const variation: any = await resolveVariation();
    const product = variation?.product;
    if (!variation || !product) return;

    const threshold = Number(product.lowStockThreshold ?? 0);
    if (!Number.isFinite(threshold) || threshold <= 0) return;
    if (Number(quantity) > threshold) return;

    const attrs = (() => {
      const raw = variation.attributes;
      if (!raw) return [] as string[];
      if (Array.isArray(raw)) {
        return raw.map((v) => (v != null ? String(v) : '')).filter((v) => v.length > 0);
      }
      if (typeof raw === 'object') {
        const obj = raw as Prisma.JsonObject;
        return Object.values(obj)
          .map((v) => (v != null ? String(v) : ''))
          .filter((v) => v.length > 0);
      }
      return [];
    })();
    const varLabel = attrs.length ? ` (${attrs.join(' / ')})` : '';
    const skuLabel = variation.sku ? ` [${variation.sku}]` : '';
    const storeLabel = storeName || storeId;
    const message = `Stock bas: ${product.name}${varLabel}${skuLabel} à ${storeLabel}.`;

    const existing = await prisma.notification.findFirst({
      where: { type: 'ALERT', storeId, variationId: variation.id, read: false },
    });
    if (existing) {
      await prisma.notification.update({
        where: { id: existing.id },
        data: { message, createdAt: new Date() },
      });
      return;
    }

    await prisma.notification.create({
      data: { type: 'ALERT', message, storeId, variationId: variation.id },
    });
  }
}
