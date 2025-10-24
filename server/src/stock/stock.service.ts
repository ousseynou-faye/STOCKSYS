import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditNotifyService } from '../common/services/audit-notify.service.js';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService, private audit: AuditNotifyService) {}

  async list(q?: any, user?: any) {
    const page = Math.max(parseInt(q?.page ?? '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '20', 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const sort = (q?.sort as string) || 'storeId';
    const orderBy = Array.isArray(sort)
      ? (sort as any[]).map((s: any) => (s.startsWith('-') ? { [s.slice(1)]: 'desc' } : { [s]: 'asc' }))
      : (sort.startsWith('-') ? { [sort.slice(1)]: 'desc' } : { [sort]: 'asc' });
    const where: any = {};
    if ((user?.permissions || []).includes('MANAGE_ROLES')) {
      if (q?.storeId) where.storeId = q.storeId;
    } else if (user?.storeId) {
      where.storeId = user.storeId;
    } else if (q?.storeId) {
      where.storeId = q.storeId;
    }
    if (q?.variationId) where.variationId = q.variationId;
    const total = await this.prisma.productStock.count({ where });
    const data = await this.prisma.productStock.findMany({ where, orderBy, skip, take: limit });
    return { data, meta: { page, limit, total } };
  }

  async adjust(body: { variationId: string; storeId: string; newQuantity: number }, user?: any) {
    if (!((user?.permissions || []).includes('MANAGE_ROLES')) && user?.storeId && body.storeId !== user.storeId) {
      throw new BadRequestException('Ajustement limité à votre boutique.');
    }
    const existing = await this.prisma.productStock.findUnique({ where: { storeId_variationId: { storeId: body.storeId, variationId: body.variationId } } });
    if (existing) {
      await this.prisma.productStock.update({ where: { id: existing.id }, data: { quantity: body.newQuantity } });
    } else {
      await this.prisma.productStock.create({ data: { storeId: body.storeId, variationId: body.variationId, quantity: body.newQuantity } });
    }
    await this.audit.audit(this.prisma, { action: 'STOCK_ADJUSTMENT', details: `Stock ajusté: ${body.variationId} -> ${body.newQuantity}`, user, entityType: 'ProductStock', entityId: existing?.id });
    return { success: true };
  }

  async transfer(body: { fromStoreId: string; toStoreId: string; items: { variationId: string; quantity: number }[] }, user?: any) {
    if (!((user?.permissions || []).includes('MANAGE_ROLES')) && user?.storeId && body.fromStoreId !== user.storeId) {
      throw new BadRequestException('Transfert limité depuis votre boutique.');
    }
    await this.prisma.$transaction(async (tx: any) => {
      for (const item of body.items) {
        const from = await tx.productStock.findUnique({ where: { storeId_variationId: { storeId: body.fromStoreId, variationId: item.variationId } } });
        if (!from || from.quantity < item.quantity) throw new BadRequestException('Stock insuffisant pour transfert');
        await tx.productStock.update({ where: { id: from.id }, data: { quantity: from.quantity - item.quantity } });
        const to = await tx.productStock.findUnique({ where: { storeId_variationId: { storeId: body.toStoreId, variationId: item.variationId } } });
        if (to) await tx.productStock.update({ where: { id: to.id }, data: { quantity: to.quantity + item.quantity } });
        else await tx.productStock.create({ data: { storeId: body.toStoreId, variationId: item.variationId, quantity: item.quantity } });
      }
      await this.audit.audit(tx, { action: 'STOCK_TRANSFER', details: `Transfert de ${body.items.length} article(s).`, user });
    });
    return { success: true };
  }
}
