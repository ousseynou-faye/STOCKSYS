import { BadRequestException, Injectable } from '@nestjs/common';
import { hasGlobalAccess, getUserStoreId } from '../common/utils/auth.utils.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditNotifyService } from '../common/services/audit-notify.service.js';

type ListQuery = {
  page?: string;
  limit?: string;
  sort?: string | string[];
  storeId?: string;
  variationId?: string;
};

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService, private audit: AuditNotifyService) {}

  async list(q?: ListQuery, user?: any) {
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
      : normalizeSort(typeof requestedSort === 'string' && requestedSort.length > 0 ? requestedSort : 'storeId');

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

    if (q?.variationId) where.variationId = q.variationId;

    const total = await this.prisma.productStock.count({ where });
    const data = await this.prisma.productStock.findMany({ where, orderBy, skip, take: limit });
    return { data, meta: { page, limit, total } };
  }

  async adjust(
    body: { variationId: string; storeId: string; newQuantity: number },
    user?: any,
  ) {
    const isAdmin = hasGlobalAccess(user);
    const userStoreId = getUserStoreId(user);
    const targetStoreId = isAdmin ? body.storeId : userStoreId;

    if (!targetStoreId) throw new BadRequestException('Boutique introuvable pour cet ajustement.');
    if (!isAdmin && body.storeId && body.storeId !== targetStoreId) {
      throw new BadRequestException('Ajustement limite a votre boutique.');
    }

    const existing = await this.prisma.productStock.findUnique({
      where: { storeId_variationId: { storeId: targetStoreId, variationId: body.variationId } },
    });

    if (existing) {
      await this.prisma.productStock.update({
        where: { id: existing.id },
        data: { quantity: body.newQuantity },
      });
    } else {
      await this.prisma.productStock.create({
        data: { storeId: targetStoreId, variationId: body.variationId, quantity: body.newQuantity },
      });
    }

    const store = await this.prisma.store.findUnique({ where: { id: targetStoreId } });
    await this.audit.notifyLowStock(this.prisma, {
      storeId: targetStoreId,
      storeName: store?.name,
      variation: body.variationId,
      quantity: body.newQuantity,
    });

    await this.audit.audit(this.prisma, {
      action: 'STOCK_ADJUSTMENT',
      details: `Stock ajuste: ${body.variationId} -> ${body.newQuantity}`,
      user,
      entityType: 'ProductStock',
      entityId: existing?.id,
    });
    return { success: true };
  }

  async transfer(
    body: { fromStoreId: string; toStoreId: string; items: { variationId: string; quantity: number }[] },
    user?: any,
  ) {
    const isAdmin = hasGlobalAccess(user);
    const userStoreId = getUserStoreId(user);
    const fromStoreId = isAdmin ? body.fromStoreId : userStoreId;

    if (!fromStoreId) throw new BadRequestException('Boutique source introuvable pour le transfert.');
    if (!isAdmin && body.fromStoreId && body.fromStoreId !== fromStoreId) {
      throw new BadRequestException('Transfert limite depuis votre boutique.');
    }

    await this.prisma.$transaction(async (tx: any) => {
      const fromStore = await tx.store.findUnique({ where: { id: fromStoreId } });
      const toStore = await tx.store.findUnique({ where: { id: body.toStoreId } });

      for (const item of body.items) {
        const from = await tx.productStock.findUnique({
          where: { storeId_variationId: { storeId: fromStoreId, variationId: item.variationId } },
        });
        if (!from || from.quantity < item.quantity) {
          throw new BadRequestException('Stock insuffisant pour transfert.');
        }

        const newFromQty = from.quantity - item.quantity;
        await tx.productStock.update({ where: { id: from.id }, data: { quantity: newFromQty } });
        await this.audit.notifyLowStock(tx, {
          storeId: fromStoreId,
          storeName: fromStore?.name,
          variation: item.variationId,
          quantity: newFromQty,
        });

        const to = await tx.productStock.findUnique({
          where: { storeId_variationId: { storeId: body.toStoreId, variationId: item.variationId } },
        });

        const newToQty = to ? to.quantity + item.quantity : item.quantity;
        if (to) {
          await tx.productStock.update({ where: { id: to.id }, data: { quantity: newToQty } });
        } else {
          await tx.productStock.create({
            data: { storeId: body.toStoreId, variationId: item.variationId, quantity: newToQty },
          });
        }

        await this.audit.notifyLowStock(tx, {
          storeId: body.toStoreId,
          storeName: toStore?.name,
          variation: item.variationId,
          quantity: newToQty,
        });
      }

      await this.audit.audit(tx, {
        action: 'STOCK_TRANSFER',
        details: `Transfert de ${body.items.length} article(s).`,
        user,
      });
    });

    return { success: true };
  }
}
