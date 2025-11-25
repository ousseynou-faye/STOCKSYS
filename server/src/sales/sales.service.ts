import { BadRequestException, Injectable } from '@nestjs/common';
import { FR } from '../common/i18n/fr.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditNotifyService } from '../common/services/audit-notify.service.js';
import { hasGlobalAccess, getUserStoreId } from '../common/utils/auth.utils.js';
<<<<<<< HEAD
=======
import { ScopeLoggerService } from '../common/services/scope-logger.service.js';
>>>>>>> 7884868 (STOCKSYS)

type SalesListQuery = {
  page?: string;
  limit?: string;
  sort?: string | string[];
  status?: string;
  from?: string;
  to?: string;
  storeId?: string;
};

@Injectable()
export class SalesService {
<<<<<<< HEAD
  constructor(private prisma: PrismaService, private audit: AuditNotifyService) {}
=======
  constructor(
    private prisma: PrismaService,
    private audit: AuditNotifyService,
    private scopeLogger: ScopeLoggerService,
  ) {}
>>>>>>> 7884868 (STOCKSYS)

  private sanitizeAttributes(raw: any): Record<string, any> | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return raw as Record<string, any>;
  }

  private formatVariationForNotify(variation: any) {
    if (!variation) return undefined;
    const product = variation.product
      ? { name: variation.product.name, lowStockThreshold: variation.product.lowStockThreshold ?? null }
      : null;
    return {
      id: variation.id,
      sku: variation.sku ?? null,
      attributes: this.sanitizeAttributes(variation.attributes),
      product,
    };
  }

  async list(q: SalesListQuery, user?: any) {
    const where: any = {};
    const isAdmin = hasGlobalAccess(user);
    const userStoreId = getUserStoreId(user);
    const requestedStoreId = typeof q?.storeId === 'string' && q.storeId.length > 0 ? q.storeId : undefined;

    if (isAdmin) {
      if (requestedStoreId) where.storeId = requestedStoreId;
    } else if (userStoreId) {
<<<<<<< HEAD
=======
      if (requestedStoreId && requestedStoreId !== userStoreId) {
        this.scopeLogger.logViolation({
          domain: 'sales',
          userId: user?.sub,
          username: user?.username,
          requestedStoreId,
          enforcedStoreId: userStoreId,
          reason: 'list_store_override',
          traceId: (user as any)?.traceId,
        });
      }
>>>>>>> 7884868 (STOCKSYS)
      where.storeId = userStoreId;
    } else if (requestedStoreId) {
      where.storeId = requestedStoreId;
    }

    if (q?.status) where.status = q.status;
    if (q?.from) where.createdAt = { ...(where.createdAt || {}), gte: new Date(q.from) };
    if (q?.to) where.createdAt = { ...(where.createdAt || {}), lte: new Date(q.to) } as any;

    const page = Math.max(parseInt(q?.page ?? '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '20', 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const sort = q?.sort;

    const normalizeSort = (value: string) =>
      value.startsWith('-') ? { [value.slice(1)]: 'desc' } : { [value]: 'asc' };
    const orderBy = Array.isArray(sort)
      ? sort.filter((s): s is string => typeof s === 'string' && s.length > 0).map(normalizeSort)
      : normalizeSort(typeof sort === 'string' && sort.length > 0 ? sort : '-createdAt');

    const total = await this.prisma.sale.count({ where });
    const data = await this.prisma.sale.findMany({ where, orderBy, skip, take: limit });
    return { data, meta: { page, limit, total } };
  }

  async create(sale: any, user?: any) {
    if (!sale) throw new BadRequestException('Vente invalide.');

    const isAdmin = hasGlobalAccess(user);
    const userStoreId = getUserStoreId(user);
    const requestedStoreId = typeof sale.storeId === 'string' && sale.storeId.length > 0 ? sale.storeId : undefined;
    const targetStoreId = isAdmin ? requestedStoreId ?? userStoreId : userStoreId;

    if (!targetStoreId) {
      throw new BadRequestException('Boutique requise pour enregistrer la vente.');
    }
    if (!isAdmin && requestedStoreId && requestedStoreId !== targetStoreId) {
<<<<<<< HEAD
=======
      this.scopeLogger.logViolation({
        domain: 'sales',
        userId: user?.sub,
        username: user?.username,
        requestedStoreId,
        enforcedStoreId: targetStoreId,
        reason: 'create_store_mismatch',
        traceId: (user as any)?.traceId,
      });
>>>>>>> 7884868 (STOCKSYS)
      throw new BadRequestException('Vous ne pouvez creer des ventes que dans votre boutique.');
    }

    sale.storeId = targetStoreId;

    const exists = await this.prisma.sale.findUnique({ where: { id: sale.id } });
    if (exists) return exists;

    return this.prisma.$transaction(async (tx: any) => {
      const created = await tx.sale.create({
        data: {
          id: sale.id,
          userId: sale.userId,
          storeId: sale.storeId,
          totalAmount: sale.totalAmount,
          status: sale.status,
          createdAt: new Date(sale.createdAt),
          items: {
            create: sale.items.map((i: any) => ({
              variationId: i.variationId,
              quantity: i.quantity,
              priceAtSale: i.priceAtSale,
            })),
          },
          payments: {
            create: sale.payments.map((p: any) => ({
              method: p.method,
              amount: p.amount,
              createdAt: new Date(p.createdAt),
            })),
          },
        },
      });

      const variationIds = Array.from(new Set(sale.items.map((i: any) => i.variationId)));
      const variations = await tx.productVariation.findMany({
        where: { id: { in: variationIds } },
        include: { product: { include: { bundleComponents: true } } },
      });
      const varMap = new Map(variations.map((v: any) => [v.id, v]));

      const required: Record<string, number> = {};
      for (const item of sale.items) {
        const v: any = varMap.get(item.variationId);
        if (!v) throw new BadRequestException(`Variation not found: ${item.variationId}`);
        if (v.product?.type === 'BUNDLE') {
          for (const comp of v.product.bundleComponents) {
            required[comp.componentVariationId] =
              (required[comp.componentVariationId] || 0) + comp.quantity * item.quantity;
          }
        } else {
          required[item.variationId] = (required[item.variationId] || 0) + item.quantity;
        }
      }

      for (const [variationId, qty] of Object.entries(required)) {
        const ps = await tx.productStock.findUnique({
          where: { storeId_variationId: { storeId: sale.storeId, variationId } },
        });
        if (!ps || ps.quantity < qty) throw new BadRequestException(FR.ERR_STOCK_INSUFFICIENT);
      }

      const store = await tx.store.findUnique({ where: { id: sale.storeId } });
      for (const [variationId, qty] of Object.entries(required)) {
        const ps = await tx.productStock.findUnique({
          where: { storeId_variationId: { storeId: sale.storeId, variationId } },
        });
        const newQty = ps!.quantity - qty;
        await tx.productStock.update({ where: { id: ps!.id }, data: { quantity: newQty } });

        const variation = varMap.get(variationId);
        await this.audit.notifyLowStock(tx, {
          storeId: sale.storeId,
          storeName: store?.name,
          variation: variation ? this.formatVariationForNotify(variation) ?? variationId : variationId,
          quantity: newQty,
        });
      }

      const consumption = Object.entries(required)
        .map(([vId, quantity]) => {
          const v: any = varMap.get(vId);
          const name = v?.product?.name || vId;
          const attrs = v?.attributes && !Array.isArray(v.attributes) && typeof v.attributes === 'object'
            ? Object.values(v.attributes).filter((val: any) => val != null && `${val}`.length > 0)
            : [];
          const varLabel = attrs.length ? ` (${attrs.join(' / ')})` : '';
          const sku = v?.sku ? ` [${v.sku}]` : '';
          return `${name}${varLabel}${sku}: -${quantity}`;
        })
        .join(', ');

      await this.audit.audit(tx, {
        action: 'PRODUCT_UPDATE',
        details: `Vente #${String(created.id).slice(-6)} cree. Consommation: ${consumption}`,
        user,
        entityType: 'Sale',
        entityId: created.id,
      });

      return created;
    });
  }

  async bulk(sales: any[], user?: any) {
    if (!Array.isArray(sales) || sales.length === 0) {
      return { syncedIds: [] };
    }

    const isAdmin = hasGlobalAccess(user);
    const userStoreId = getUserStoreId(user);

    if (!isAdmin && !userStoreId) {
      throw new BadRequestException('Boutique requise pour synchroniser les ventes.');
    }

    for (const sale of sales) {
      const requestedStoreId =
        typeof sale.storeId === 'string' && sale.storeId.length > 0 ? sale.storeId : undefined;
      if (!isAdmin) {
        if (requestedStoreId && requestedStoreId !== userStoreId) {
          throw new BadRequestException('Vous ne pouvez synchroniser que des ventes de votre boutique.');
        }
        sale.storeId = userStoreId;
      } else if (!requestedStoreId) {
        throw new BadRequestException('Chaque vente doit indiquer une boutique.');
      }
    }

    const ops = sales.map((s) =>
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
          items: {
            create: s.items.map((i: any) => ({
              variationId: i.variationId,
              quantity: i.quantity,
              priceAtSale: i.priceAtSale,
            })),
          },
          payments: {
            create: s.payments.map((p: any) => ({
              method: p.method,
              amount: p.amount,
              createdAt: new Date(p.createdAt),
            })),
          },
        },
      }),
    );

    await this.prisma.$transaction(ops);
    return { syncedIds: sales.map((s) => s.id) };
  }

  async returnItems(
    saleId: string,
    items: { variationId: string; quantity: number }[],
    user?: any,
  ) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Aucun article a retourner.');
    }

    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true },
    });
    if (!sale) throw new BadRequestException('Vente introuvable.');

    const isAdmin = hasGlobalAccess(user);
    const userStoreId = getUserStoreId(user);
    if (!isAdmin && sale.storeId && userStoreId && sale.storeId !== userStoreId) {
<<<<<<< HEAD
=======
      this.scopeLogger.logViolation({
        domain: 'sales',
        userId: user?.sub,
        username: user?.username,
        requestedStoreId: sale.storeId,
        enforcedStoreId: userStoreId,
        reason: 'return_store_mismatch',
        traceId: (user as any)?.traceId,
      });
>>>>>>> 7884868 (STOCKSYS)
      throw new BadRequestException('Retour limite a votre boutique.');
    }

    const soldByVar = new Map<string, { qty: number; amount: number }>();
    for (const it of sale.items as any[]) {
      const agg = soldByVar.get(it.variationId) || { qty: 0, amount: 0 };
      agg.qty += it.quantity;
      agg.amount += it.quantity * it.priceAtSale;
      soldByVar.set(it.variationId, agg);
    }

    const existingReturns = await this.prisma.saleReturn.findMany({
      where: { saleId },
      include: { items: true },
    });
    const returnedByVar = new Map<string, number>();
    for (const r of existingReturns) {
      for (const it of r.items as any[]) {
        returnedByVar.set(it.variationId, (returnedByVar.get(it.variationId) || 0) + it.quantity);
      }
    }

    for (const it of items) {
      if (!it || !it.variationId || typeof it.quantity !== 'number' || it.quantity <= 0) {
        throw new BadRequestException('Article de retour invalide.');
      }
      const soldAgg = soldByVar.get(it.variationId);
      const soldQty = soldAgg?.qty || 0;
      if (soldQty <= 0) {
        throw new BadRequestException(`Variation non vendue dans cette vente: ${it.variationId}`);
      }
      const already = returnedByVar.get(it.variationId) || 0;
      if (already + it.quantity > soldQty) {
        throw new BadRequestException(`Quantite de retour depasse le vendu pour ${it.variationId}`);
      }
    }

    const variationIds = Array.from(new Set(items.map((i) => i.variationId)));
    const variations = await this.prisma.productVariation.findMany({
      where: { id: { in: variationIds } },
      include: { product: { include: { bundleComponents: true } } },
    });
    const varMap = new Map(variations.map((v: any) => [v.id, v]));

    const increments: Record<string, number> = {};
    for (const it of items) {
      const variation = varMap.get(it.variationId);
      if (!variation) throw new BadRequestException(`Variation introuvable: ${it.variationId}`);
      if (variation.product?.type === 'BUNDLE') {
        for (const comp of variation.product.bundleComponents) {
          increments[comp.componentVariationId] =
            (increments[comp.componentVariationId] || 0) + comp.quantity * it.quantity;
        }
      } else {
        increments[it.variationId] = (increments[it.variationId] || 0) + it.quantity;
      }
    }

    const result = await this.prisma.$transaction(async (tx: any) => {
      const createdReturn = await tx.saleReturn.create({
        data: { saleId, storeId: sale.storeId, userId: user?.sub || sale.userId },
      });

      await tx.saleReturnItem.createMany({
        data: items.map((it) => ({
          returnId: createdReturn.id,
          variationId: it.variationId,
          quantity: it.quantity,
        })),
      });

      for (const [variationId, qty] of Object.entries(increments)) {
        const ps = await tx.productStock.findUnique({
          where: { storeId_variationId: { storeId: sale.storeId, variationId } },
        });
        if (ps) {
          await tx.productStock.update({
            where: { id: ps.id },
            data: { quantity: ps.quantity + qty },
          });
        } else {
          await tx.productStock.create({
            data: { storeId: sale.storeId, variationId, quantity: qty },
          });
        }
      }

      const allReturns = await tx.saleReturn.findMany({ where: { saleId }, include: { items: true } });
      const returnedTotals: Record<string, number> = {};
      for (const ret of allReturns) {
        for (const it of ret.items as any[]) {
          returnedTotals[it.variationId] = (returnedTotals[it.variationId] || 0) + it.quantity;
        }
      }

      let fullyReturned = true;
      for (const [variationId, agg] of soldByVar.entries()) {
        if ((returnedTotals[variationId] || 0) < agg.qty) {
          fullyReturned = false;
          break;
        }
      }
      if (fullyReturned && sale.status !== 'RETURNED') {
        await tx.sale.update({ where: { id: saleId }, data: { status: 'RETURNED' as any } });
      }

      const descItems = items.map((i) => `${i.variationId}: +${i.quantity}`).join(', ');
      await this.audit.audit(tx, {
        action: 'STOCK_ADJUSTMENT',
        details: `Retour vente #${String(saleId).slice(-6)}. Reintegration: ${descItems}`,
        user,
        entityType: 'Sale',
        entityId: saleId,
      });

      return createdReturn;
    });

    return result;
  }
}
