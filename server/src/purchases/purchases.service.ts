import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditNotifyService } from '../common/services/audit-notify.service.js';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService, private audit: AuditNotifyService) {}

    async list(q?: any) {
    const page = Math.max(parseInt(q?.page ?? '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '20', 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const sort = (q?.sort as string) || '-createdAt';
    const orderBy = Array.isArray(sort)
      ? (sort as any[]).map((s: any) => (s.startsWith('-') ? { [s.slice(1)]: 'desc' } : { [s]: 'asc' }))
      : (sort.startsWith('-') ? { [sort.slice(1)]: 'desc' } : { [sort]: 'asc' });
    const where: any = {};
    if (q?.storeId) where.storeId = q.storeId;
    if (q?.supplierId) where.supplierId = q.supplierId;
    if (q?.status) where.status = q.status;
    const total = await this.prisma.purchaseOrder.count({ where });
    const data = await this.prisma.purchaseOrder.findMany({ where, include: { items: true }, orderBy, skip, take: limit });
    return { data, meta: { page, limit, total } };
  }
  async create(po: any) {
    const { items, ...rest } = po || {};
    const data: any = { ...rest };
    if (Array.isArray(items)) {
      data.items = { create: items.map((i: any) => ({ variationId: i.variationId, quantity: i.quantity, price: i.price, receivedQuantity: i.receivedQuantity ?? 0 })) };
    }
    return this.prisma.purchaseOrder.create({ data });
  }
  async update(id: string, po: any) {
    const current = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!current) throw new BadRequestException('Commande introuvable');

    const allowed = new Set(['DRAFT','PENDING','ORDERED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED']);
    if (po.status && !allowed.has(po.status)) throw new BadRequestException('Statut invalide');

    // Verrou: items modifiables uniquement en DRAFT
    const isTryingToChangeItems = Array.isArray(po.items) && po.items.length > 0;
    if (current.status !== 'DRAFT' && isTryingToChangeItems) {
      throw new BadRequestException('Les articles ne peuvent être modifiés que lorsque la commande est en brouillon');
    }

    // Transitions autorisées
    const canTransition = (from: string, to: string) => {
      const map: Record<string, string[]> = {
        DRAFT: ['PENDING','ORDERED','CANCELLED'],
        PENDING: ['ORDERED','CANCELLED'],
        ORDERED: ['CANCELLED'],
        PARTIALLY_RECEIVED: ['RECEIVED','CANCELLED'],
        RECEIVED: [],
        CANCELLED: [],
      };
      return map[from]?.includes(to) ?? false;
    };
    if (po.status && po.status !== current.status && !canTransition(current.status, po.status)) {
      throw new BadRequestException(`Transition ${current.status} -> ${po.status} interdite`);
    }

    return this.prisma.purchaseOrder.update({ where: { id }, data: po });
  }
  async receive(id: string, items: { variationId: string; quantity: number }[], user?: any) {
    return this.prisma.$transaction(async (tx: any) => {
      const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
      if (!po) throw new Error('PO not found');
      if (po.status === 'CANCELLED' || po.status === 'RECEIVED') { throw new BadRequestException('La commande ne permet pas de r�ception.'); }
      for (const it of items) {
        if (!it || typeof it.quantity !== 'number' || it.quantity <= 0) { throw new BadRequestException('Quantit� invalide.'); }
        const existing = po.items.find((i: any) => i.variationId === it.variationId);
        if (!existing) continue;
        const newReceived = existing.receivedQuantity + it.quantity; if (newReceived > existing.quantity) { throw new BadRequestException('D�passement de la quantit� command�e.'); }
        await tx.purchaseOrderItem.update({ where: { id: existing.id }, data: { receivedQuantity: newReceived } });
        const stock = await tx.productStock.findUnique({ where: { storeId_variationId: { storeId: po.storeId, variationId: it.variationId } } });
        if (stock) await tx.productStock.update({ where: { id: stock.id }, data: { quantity: stock.quantity + it.quantity } });
        else await tx.productStock.create({ data: { storeId: po.storeId, variationId: it.variationId, quantity: it.quantity } });
        await this.audit.audit(tx, { action: 'PURCHASE_ORDER_RECEIVE_ITEM', details: 'PO #' + String(id).slice(-6) + ' - ' + it.variationId + ': +' + it.quantity + ' (re�u total: ' + newReceived + ')', user, entityType: 'PurchaseOrderItem', entityId: existing.id });
      }
      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
      const totalOrdered = updatedItems.reduce((s: number, r: any) => s + r.quantity, 0);
      const totalReceived = updatedItems.reduce((s: number, r: any) => s + r.receivedQuantity, 0);
      const status = totalReceived >= totalOrdered ? 'RECEIVED' : totalReceived > 0 ? 'PARTIALLY_RECEIVED' : po.status;
      await tx.purchaseOrder.update({ where: { id }, data: { status } as any });
      await this.audit.audit(tx, { action: 'PURCHASE_ORDER_UPDATE', details: `Réception pour commande #${String(id).slice(-6)}.`, user, entityType: 'PurchaseOrder', entityId: id });
      return { success: true };
    });
  }
}

