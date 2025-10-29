import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { hasGlobalAccess, getUserStoreId } from '../common/utils/auth.utils.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditNotifyService } from '../common/services/audit-notify.service.js';
import { FR } from '../common/i18n/fr.js';

type InventoryListQuery = {
  page?: string;
  limit?: string;
  sort?: string | string[];
  status?: string;
  storeId?: string;
};

type InventoryCountUpdate = { variationId: string; countedQuantity: number };

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService, private audit: AuditNotifyService) {}

  async list(q?: InventoryListQuery, user?: any) {
    const page = Math.max(parseInt(q?.page ?? '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '20', 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const requestedSort = q?.sort;
    const normalizeSort = (value: string) =>
      value.startsWith('-') ? { [value.slice(1)]: 'desc' } : { [value]: 'asc' };
    const orderBy = Array.isArray(requestedSort)
      ? requestedSort
          .filter((s): s is string => typeof s === 'string' && s.length > 0)
          .map(normalizeSort)
      : normalizeSort(typeof requestedSort === 'string' && requestedSort.length > 0 ? requestedSort : '-createdAt');

    const where: any = {};
    const isAdmin = hasGlobalAccess(user);
    const userStoreId = getUserStoreId(user);
    const requestedStoreId =
      typeof q?.storeId === 'string' && q.storeId.trim().length > 0 ? q.storeId.trim() : undefined;

    if (isAdmin) {
      if (requestedStoreId) where.storeId = requestedStoreId;
    } else if (userStoreId) {
      where.storeId = userStoreId;
    } else if (requestedStoreId) {
      where.storeId = requestedStoreId;
    }

    if (q?.status) where.status = q.status;

    const total = await this.prisma.inventorySession.count({ where });
    const data = await this.prisma.inventorySession.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { items: true },
    });
    return { data, meta: { page, limit, total } };
  }

  async start(storeId: string, user?: any) {
    const isAdmin = hasGlobalAccess(user);
    const userStoreId = getUserStoreId(user);
    const targetStoreId = isAdmin ? storeId : userStoreId;

    if (!targetStoreId) throw new BadRequestException('Boutique introuvable pour inventaire.');
    if (!isAdmin && storeId && storeId !== targetStoreId) {
      throw new BadRequestException('Inventaire limite a votre boutique.');
    }

    const stock = await this.prisma.productStock.findMany({ where: { storeId: targetStoreId } });
    const session = await this.prisma.inventorySession.create({
      data: {
        storeId: targetStoreId,
        userId: user?.sub,
        items: {
          create: stock.map((s: any) => ({
            variationId: s.variationId,
            theoreticalQuantity: s.quantity,
            countedQuantity: -1,
          })),
        },
      },
      include: { items: true },
    });

    await this.audit.audit(this.prisma, {
      action: 'STOCK_ADJUSTMENT',
      details: `Inventaire #${session.id.slice(-6)} demarre.`,
      user,
      entityType: 'InventorySession',
      entityId: session.id,
    });
    return session;
  }

  async updateCounts(id: string, items: InventoryCountUpdate[], finalize: boolean, user?: any) {
    const session = await this.prisma.inventorySession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');

    const isAdmin = hasGlobalAccess(user);
    const userStoreId = getUserStoreId(user);
    if (!isAdmin && session.storeId && session.storeId !== userStoreId) {
      throw new BadRequestException('Inventaire limite a votre boutique.');
    }

    await this.prisma.$transaction(
      items.map((i) =>
        this.prisma.inventoryCountItem.update({
          where: { sessionId_variationId: { sessionId: id, variationId: i.variationId } },
          data: { countedQuantity: i.countedQuantity },
        }),
      ),
    );

    if (finalize) {
      await this.prisma.inventorySession.update({ where: { id }, data: { status: 'REVIEW' as any } });
    }

    await this.audit.audit(this.prisma, {
      action: 'STOCK_ADJUSTMENT',
      details: `Comptage inventaire #${id.slice(-6)} mis a jour.`,
      user,
      entityType: 'InventorySession',
      entityId: id,
    });

    return this.prisma.inventorySession.findUnique({ where: { id }, include: { items: true } });
  }

  async confirm(id: string, user?: any) {
    const session = await this.prisma.inventorySession.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!session) throw new NotFoundException('Session not found');

    const isAdmin = hasGlobalAccess(user);
    const userStoreId = getUserStoreId(user);
    if (!isAdmin && session.storeId && session.storeId !== userStoreId) {
      throw new BadRequestException('Inventaire limite a votre boutique.');
    }

    if (session.status !== 'REVIEW') throw new BadRequestException(FR.ERR_INVENTORY_NOT_IN_REVIEW);
    if (session.items.some((i: any) => i.countedQuantity === -1)) {
      throw new BadRequestException(FR.ERR_INVENTORY_UNCOUNTED_ITEMS);
    }

    await this.prisma.$transaction(async (tx: any) => {
      const varIds = session.items.map((i: any) => i.variationId);
      const stocks = await tx.productStock.findMany({
        where: { storeId: session.storeId, variationId: { in: varIds } },
      });
      const beforeMap = new Map(stocks.map((s: any) => [s.variationId, s.quantity]));

      for (const item of session.items) {
        const before = beforeMap.get(item.variationId) ?? 0;
        await tx.productStock.update({
          where: { storeId_variationId: { storeId: session.storeId, variationId: item.variationId } },
          data: { quantity: item.countedQuantity },
        });
        await this.audit.audit(tx, {
          action: 'STOCK_ADJUSTMENT',
          details: `Inventaire #${id.slice(-6)} - ${item.variationId}: ${before} -> ${item.countedQuantity}`,
          user,
          entityType: 'InventorySession',
          entityId: id,
        });
      }

      await tx.inventorySession.update({
        where: { id },
        data: { status: 'COMPLETED' as any, completedAt: new Date() },
      });
    });

    return { success: true };
  }
}
