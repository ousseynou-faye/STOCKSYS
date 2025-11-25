import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditNotifyService } from '../common/services/audit-notify.service.js';
import { hasGlobalAccess } from '../common/utils/auth.utils.js';
<<<<<<< HEAD

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService, private audit: AuditNotifyService) {}
=======
import { ScopeLoggerService } from '../common/services/scope-logger.service.js';

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditNotifyService,
    private scopeLogger: ScopeLoggerService,
  ) {}
>>>>>>> 7884868 (STOCKSYS)

  async list(q?: any, user?: any) {
    const page = Math.max(parseInt(q?.page ?? '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '20', 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const sort = (q?.sort as string) || '-createdAt';
    const orderBy = Array.isArray(sort)
      ? (sort as any[]).map((s: any) => (s.startsWith('-') ? { [s.slice(1)]: 'desc' } : { [s]: 'asc' }))
      : (sort.startsWith('-') ? { [sort.slice(1)]: 'desc' } : { [sort]: 'asc' });
    const where: any = {};
    const isAdmin = hasGlobalAccess(user);
    if (isAdmin) {
      if (q?.storeId) where.storeId = q.storeId;
    } else if (user?.storeId) {
<<<<<<< HEAD
=======
      if (q?.storeId && q.storeId !== user.storeId) {
        this.scopeLogger.logViolation({
          domain: 'purchases',
          userId: user?.sub,
          username: user?.username,
          requestedStoreId: q.storeId,
          enforcedStoreId: user.storeId,
          reason: 'list_store_override',
          traceId: (user as any)?.traceId,
        });
      }
>>>>>>> 7884868 (STOCKSYS)
      where.storeId = user.storeId;
    } else if (q?.storeId) {
      where.storeId = q.storeId;
    }
    if (q?.supplierId) where.supplierId = q.supplierId;
    if (q?.status) where.status = q.status;
    const total = await this.prisma.purchaseOrder.count({ where });
    const data = await this.prisma.purchaseOrder.findMany({ where, include: { items: true }, orderBy, skip, take: limit });
    return { data, meta: { page, limit, total } };
  }

  async create(po: any, user?: any) {
    if (!po || !po.supplierId) {
      throw new BadRequestException('Fournisseur et boutique sont requis');
    }
    const isAdmin = hasGlobalAccess(user);
    const storeId = isAdmin ? po.storeId : user?.storeId;
    if (!storeId) {
      throw new BadRequestException('Boutique introuvable pour la commande.');
    }
    if (!isAdmin && po.storeId && po.storeId !== storeId) {
<<<<<<< HEAD
=======
      this.scopeLogger.logViolation({
        domain: 'purchases',
        userId: user?.sub,
        username: user?.username,
        requestedStoreId: po.storeId,
        enforcedStoreId: storeId,
        reason: 'create_store_mismatch',
        traceId: (user as any)?.traceId,
      });
>>>>>>> 7884868 (STOCKSYS)
      throw new BadRequestException('Vous ne pouvez creer des commandes que pour votre boutique.');
    }

    const supplier = await this.prisma.supplier.findUnique({ where: { id: po.supplierId } });
    if (!supplier) throw new BadRequestException('Fournisseur introuvable');
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new BadRequestException('Boutique introuvable');

    const items = Array.isArray(po.items) ? po.items : [];
    if (items.length === 0) throw new BadRequestException('Au moins un article est requis');

    const variationIds: string[] = Array.from(
      new Set((items as Array<{ variationId: any }>).map(i => i.variationId).filter((v): v is string => typeof v === 'string' && v.length > 0))
    );
    const variations = await this.prisma.productVariation.findMany({ where: { id: { in: variationIds } } });
    const varSet = new Set(variations.map((v: any) => v.id));
    for (const it of items) {
      if (!it?.variationId || !varSet.has(it.variationId)) throw new BadRequestException(`Variation invalide: ${it?.variationId ?? ''}`);
      const qty = Number(it.quantity);
      const price = Number(it.price);
      if (!Number.isFinite(qty) || qty <= 0) throw new BadRequestException('Quantite invalide');
      if (!Number.isFinite(price) || price < 0) throw new BadRequestException('Prix invalide');
    }

    const totalAmount = items.reduce((s: number, it: any) => s + Number(it.quantity) * Number(it.price), 0);

    const data: any = {
      supplierId: po.supplierId,
      storeId,
      status: po.status || 'DRAFT',
      createdById: po.createdById || user?.sub,
      totalAmount,
      items: {
        create: items.map((i: any) => ({
          variationId: i.variationId,
          quantity: Number(i.quantity),
          price: Number(i.price),
          receivedQuantity: Number.isFinite(Number(i.receivedQuantity)) ? Number(i.receivedQuantity) : 0,
        })),
      },
    };

    return this.prisma.purchaseOrder.create({ data });
  }

  async update(id: string, po: any, user?: any) {
    const current = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!current) throw new BadRequestException('Commande introuvable');
    const isAdmin = hasGlobalAccess(user);
    if (!isAdmin && user?.storeId && current.storeId !== user.storeId) {
<<<<<<< HEAD
=======
      this.scopeLogger.logViolation({
        domain: 'purchases',
        userId: user?.sub,
        username: user?.username,
        requestedStoreId: current.storeId,
        enforcedStoreId: user.storeId,
        reason: 'update_store_mismatch',
        traceId: (user as any)?.traceId,
      });
>>>>>>> 7884868 (STOCKSYS)
      throw new BadRequestException('Vous ne pouvez modifier que les commandes de votre boutique.');
    }

    const allowed = new Set(['DRAFT', 'PENDING', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED']);
    if (po.status && !allowed.has(po.status)) throw new BadRequestException('Statut invalide');

    const isTryingToChangeItems = Array.isArray(po.items) && po.items.length > 0;
    if (current.status !== 'DRAFT' && isTryingToChangeItems) {
      throw new BadRequestException('Les articles ne peuvent etre modifies que lorsque la commande est en brouillon');
    }

    const canTransition = (from: string, to: string) => {
      const map: Record<string, string[]> = {
        DRAFT: ['PENDING', 'ORDERED', 'CANCELLED'],
        PENDING: ['ORDERED', 'CANCELLED'],
        ORDERED: ['CANCELLED'],
        PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED'],
        RECEIVED: [],
        CANCELLED: [],
      };
      return map[from]?.includes(to) ?? false;
    };
    if (po.status && po.status !== current.status && !canTransition(current.status, po.status)) {
      throw new BadRequestException(`Transition ${current.status} -> ${po.status} interdite`);
    }

<<<<<<< HEAD
    const { items, totalAmount, createdAt, receivedAt, createdById, ...rest } = po || {};
=======
    const rest = { ...(po || {}) };
    delete (rest as any).items;
    delete (rest as any).totalAmount;
    delete (rest as any).createdAt;
    delete (rest as any).receivedAt;
    delete (rest as any).createdById;
>>>>>>> 7884868 (STOCKSYS)
    const data: any = {};
    if (rest.supplierId !== undefined) data.supplierId = rest.supplierId;
    if (rest.storeId !== undefined) {
      if (!isAdmin && user?.storeId && rest.storeId !== user.storeId) {
<<<<<<< HEAD
=======
        this.scopeLogger.logViolation({
          domain: 'purchases',
          userId: user?.sub,
          username: user?.username,
          requestedStoreId: rest.storeId,
          enforcedStoreId: user.storeId,
          reason: 'update_store_mismatch',
          traceId: (user as any)?.traceId,
        });
>>>>>>> 7884868 (STOCKSYS)
        throw new BadRequestException('Changement de boutique non autorise.');
      }
      data.storeId = rest.storeId;
    }
    if (rest.status !== undefined) data.status = rest.status;
    if (!isAdmin && user?.storeId) {
      data.storeId = user.storeId;
    }

    try {
      return await this.prisma.purchaseOrder.update({ where: { id }, data });
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Mise a jour invalide');
    }
  }

  async receive(id: string, items: { variationId: string; quantity: number }[], user?: any) {
    try {
      return await this.prisma.$transaction(async (tx: any) => {
        const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
        if (!po) throw new BadRequestException('Commande introuvable');
        const isAdmin = hasGlobalAccess(user);
        if (!isAdmin && user?.storeId && po.storeId !== user.storeId) {
<<<<<<< HEAD
=======
          this.scopeLogger.logViolation({
            domain: 'purchases',
            userId: user?.sub,
            username: user?.username,
            requestedStoreId: po.storeId,
            enforcedStoreId: user.storeId,
            reason: 'receive_store_mismatch',
            traceId: (user as any)?.traceId,
          });
>>>>>>> 7884868 (STOCKSYS)
          throw new BadRequestException('Reception limitee a votre boutique.');
        }
        if (po.status === 'CANCELLED' || po.status === 'RECEIVED') {
          throw new BadRequestException('La commande ne permet pas de reception.');
        }
        for (const it of items) {
          if (!it || typeof it.quantity !== 'number' || it.quantity <= 0) {
            throw new BadRequestException('Quantite invalide.');
          }
          const existing = po.items.find((i: any) => i.variationId === it.variationId);
          if (!existing) {
            throw new BadRequestException('Article introuvable dans cette commande.');
          }
          const newReceived = existing.receivedQuantity + it.quantity;
          if (newReceived > existing.quantity) {
            throw new BadRequestException('Depassement de la quantite commandee.');
          }
          await tx.purchaseOrderItem.update({ where: { id: existing.id }, data: { receivedQuantity: newReceived } });
          const stock = await tx.productStock.findUnique({ where: { storeId_variationId: { storeId: po.storeId, variationId: it.variationId } } });
          if (stock) {
            await tx.productStock.update({ where: { id: stock.id }, data: { quantity: stock.quantity + it.quantity } });
          } else {
            await tx.productStock.create({ data: { storeId: po.storeId, variationId: it.variationId, quantity: it.quantity } });
          }
          await this.audit.audit(tx, {
            action: 'PURCHASE_ORDER_RECEIVE_ITEM',
            details: 'PO #' + String(id).slice(-6) + ' - ' + it.variationId + ': +' + it.quantity + ' (recu total: ' + newReceived + ')',
            user,
            entityType: 'PurchaseOrderItem',
            entityId: existing.id,
          });
        }
        const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
        const totalOrdered = updatedItems.reduce((s: number, r: any) => s + r.quantity, 0);
        const totalReceived = updatedItems.reduce((s: number, r: any) => s + r.receivedQuantity, 0);
        const status = totalReceived >= totalOrdered ? 'RECEIVED' : totalReceived > 0 ? 'PARTIALLY_RECEIVED' : po.status;
        await tx.purchaseOrder.update({ where: { id }, data: { status } as any });
        await this.audit.audit(tx, {
          action: 'PURCHASE_ORDER_UPDATE',
          details: 'Reception pour commande #' + String(id).slice(-6) + '.',
          user,
          entityType: 'PurchaseOrder',
          entityId: id,
        });
        return { success: true };
      });
    } catch (e: any) {
      console.error('[PurchasesService] receive failed', e);
      if (e instanceof BadRequestException) throw e;
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new BadRequestException('Article de commande introuvable.');
      }
      throw new BadRequestException(e?.message || 'Erreur lors de la reception.');
    }
  }
}
