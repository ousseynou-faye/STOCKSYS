import { BadRequestException, Injectable } from '@nestjs/common';
import { FR } from '../common/i18n/fr.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditNotifyService } from '../common/services/audit-notify.service.js';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService, private audit: AuditNotifyService) {}

  async list(q: any) {
    const where: any = {};
    if (q.storeId) where.storeId = q.storeId;
    if (q.status) where.status = q.status;
    if (q.from) where.createdAt = { ...(where.createdAt || {}), gte: new Date(q.from) };
    if (q.to) where.createdAt = { ...(where.createdAt || {}), lte: new Date(q.to) } as any;

    const page = Math.max(parseInt(q?.page ?? '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '20', 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const sort = (q?.sort as string) || '-createdAt';
    const orderBy = Array.isArray(sort)
      ? (sort as any[]).map((s: any) => (s.startsWith('-') ? { [s.slice(1)]: 'desc' } : { [s]: 'asc' }))
      : (sort.startsWith('-') ? { [sort.slice(1)]: 'desc' } : { [sort]: 'asc' });

    const total = await this.prisma.sale.count({ where });
    const data = await this.prisma.sale.findMany({ where, orderBy, skip, take: limit });
    return { data, meta: { page, limit, total } };
  }

  async create(sale: any, user?: any) {
    const exists = await this.prisma.sale.findUnique({ where: { id: sale.id } });
    if (exists) return exists;
    return this.prisma.$transaction(async (tx: any) => {
      // Create sale record
      const created = await tx.sale.create({
        data: {
          id: sale.id,
          userId: sale.userId,
          storeId: sale.storeId,
          totalAmount: sale.totalAmount,
          status: sale.status,
          createdAt: new Date(sale.createdAt),
          items: {
            create: sale.items.map((i: any) => ({ variationId: i.variationId, quantity: i.quantity, priceAtSale: i.priceAtSale })),
          },
          payments: {
            create: sale.payments.map((p: any) => ({ method: p.method, amount: p.amount, createdAt: new Date(p.createdAt) })),
          },
        },
      });

      // Load products/variations map
      const variationIds = Array.from(new Set(sale.items.map((i: any) => i.variationId)));
      const variations = await tx.productVariation.findMany({
        where: { id: { in: variationIds } },
        include: { product: { include: { bundleComponents: true } } },
      });
      const varMap = new Map(variations.map((v: any) => [v.id, v]));

      // Precompute required stock delta (bundles expanded)
      const required: Record<string, number> = {};
      for (const item of sale.items) {
        const v: any = varMap.get(item.variationId);
        if (!v) throw new BadRequestException(`Variation not found: ${item.variationId}`);
        const product = v.product;
        if (product.type === 'BUNDLE') {
          for (const comp of product.bundleComponents) {
            required[comp.componentVariationId] = (required[comp.componentVariationId] || 0) + comp.quantity * item.quantity;
          }
        } else {
          required[item.variationId] = (required[item.variationId] || 0) + item.quantity;
        }
      }

      // Ensure stock sufficient
      for (const [variationId, qty] of Object.entries(required)) {
        const ps = await tx.productStock.findUnique({ where: { storeId_variationId: { storeId: sale.storeId, variationId } } });
        if (!ps || ps.quantity < qty) throw new BadRequestException(FR.ERR_STOCK_INSUFFICIENT);
      }

      // Decrement and notify low stock
      const store = await tx.store.findUnique({ where: { id: sale.storeId } });
      for (const [variationId, qty] of Object.entries(required)) {
        const ps = await tx.productStock.findUnique({ where: { storeId_variationId: { storeId: sale.storeId, variationId } } });
        const newQty = ps!.quantity - qty;
        await tx.productStock.update({ where: { id: ps!.id }, data: { quantity: newQty } });

        const varRec: any = variations.find((vv: any) => vv.id === variationId);
        const prodAny: any = varRec?.product;
        if (prodAny && newQty <= prodAny.lowStockThreshold) {
          const sku = varRec?.sku ? ` [${varRec.sku}]` : '';
          const varLabel = varRec?.attributes && Object.keys(varRec.attributes).length > 0
            ? ` (${Object.values(varRec.attributes).join(' / ')})`
            : '';
          const storeLabel = store?.name || sale.storeId;
          await this.audit.notify(tx, {
            type: 'ALERT',
            message: `Stock bas: ${prodAny.name}${varLabel}${sku} à ${storeLabel}.`,
            storeId: sale.storeId,
            variationId,
          });
        }
      }

      // Audit detailed consumption
      const consumption = Object.entries(required)
        .map(([vId, q]) => {
          const v: any = varMap.get(vId);
          const name = v?.product?.name || vId;
          const sku = v?.sku ? ` [${v.sku}]` : '';
          const varLabel = v?.attributes && Object.keys(v.attributes).length > 0
            ? ` (${Object.values(v.attributes).join(' / ')})`
            : '';
          return `${name}${varLabel}${sku}: -${q}`;
        })
        .join(', ');
      await this.audit.audit(tx, {
        action: 'PRODUCT_UPDATE',
        details: `Vente #${String(created.id).slice(-6)} créée. Consommation: ${consumption}`,
        user,
        entityType: 'Sale',
        entityId: created.id,
      });

      return created;
    });
  }

  async bulk(sales: any[], user?: any) {
    const ops: any[] = [];
    for (const s of sales) {
      ops.push(
        this.prisma.sale.upsert({
          where: { id: s.id },
          update: {},
          create: {
            id: s.id,
            userId: s.userId,
            storeId: s.storeId,
            totalAmount: s.totalAmount,
            status: s.status,
            createdAt: new Date(s.createdAt),
            items: { create: s.items.map((i: any) => ({ variationId: i.variationId, quantity: i.quantity, priceAtSale: i.priceAtSale })) },
            payments: { create: s.payments.map((p: any) => ({ method: p.method, amount: p.amount, createdAt: new Date(p.createdAt) })) },
          }
        })
      );
    }
    await this.prisma.$transaction(ops);
    return { syncedIds: sales.map(s => s.id) };
  }
}


