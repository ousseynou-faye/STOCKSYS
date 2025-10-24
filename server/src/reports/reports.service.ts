import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

function parseDateISO(d?: string) {
  if (!d) return undefined;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? undefined : dt;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async salesReport(q: any, user?: any) {
    const startDate = parseDateISO(q.startDate);
    const endDate = parseDateISO(q.endDate);
    const where: any = {};
    if ((user?.permissions || []).includes('MANAGE_ROLES')) {
      if (q.storeId) where.storeId = q.storeId;
    } else if (user?.storeId) {
      where.storeId = user.storeId;
    } else if (q.storeId) { where.storeId = q.storeId; }
    if (q.userId) where.userId = q.userId;
    // Optional product/category filters at item level
    const itemFilter: any = { AND: [] as any[] };
    if (q.productId) itemFilter.AND.push({ variation: { productId: q.productId } });
    if (q.categoryId) itemFilter.AND.push({ variation: { product: { categoryId: q.categoryId } } });
    if (itemFilter.AND.length > 0) where.items = { some: itemFilter };
    if (startDate) where.createdAt = { ...(where.createdAt || {}), gte: startDate };
    if (endDate) {
      // inclure la journée entière de endDate
      const end = new Date(endDate); end.setDate(end.getDate() + 1);
      where.createdAt = { ...(where.createdAt || {}), lt: end };
    }
    const sales = await this.prisma.sale.findMany({ where, orderBy: { createdAt: 'desc' }, include: { items: true } });

    // Map average sale price per variation for each sale
    const toAvgMap = (s: any) => {
      const agg: Record<string, { qty: number; amount: number }> = {};
      for (const it of s.items) {
        agg[it.variationId] = agg[it.variationId] || { qty: 0, amount: 0 };
        agg[it.variationId].qty += it.quantity;
        agg[it.variationId].amount += it.quantity * it.priceAtSale;
      }
      const avg = new Map<string, number>();
      Object.entries(agg).forEach(([vId, a]) => avg.set(vId, a.qty > 0 ? a.amount / a.qty : 0));
      return avg;
    };

    // Load returns for these sales
    const saleIds = sales.map(s => s.id);
    const returns = saleIds.length
      ? await this.prisma.saleReturn.findMany({ where: { saleId: { in: saleIds } }, include: { items: true } })
      : [];
    const returnedBySale = new Map<string, Record<string, number>>();
    for (const r of returns) {
      const m = returnedBySale.get(r.saleId) || {};
      for (const it of (r.items as any[])) {
        m[it.variationId] = (m[it.variationId] || 0) + it.quantity;
      }
      returnedBySale.set(r.saleId, m);
    }

    return sales.map((s, index) => {
      const avgMap = toAvgMap(s as any);
      const ret = returnedBySale.get(s.id) || {};
      const returnedAmount = Object.entries(ret).reduce((sum, [vId, qty]) => sum + (avgMap.get(vId) || 0) * (qty as number), 0);
      return {
        id: `${s.id}-${index}`,
        date: s.createdAt,
        storeId: s.storeId,
        userId: s.userId,
        itemCount: s.items.reduce((sum, it) => sum + it.quantity, 0),
        totalAmount: Math.max(0, s.totalAmount - returnedAmount),
      };
    });
  }

  async getPurchasePriceForVariation(variationId: string): Promise<number | null> {
    const sp = await this.prisma.supplierProduct.findMany({ where: { variationId }, orderBy: { purchasePrice: 'asc' }, take: 1 });
    return sp.length ? sp[0].purchasePrice : null;
  }

  async stockValuationReport(storeId?: string, user?: any) {
    const scopedStoreId = ((user?.permissions || []).includes('MANAGE_ROLES')) ? (storeId || '') : (user?.storeId || storeId || '');
    const stock = await this.prisma.productStock.findMany({ where: { ...(scopedStoreId ? { storeId: scopedStoreId } : {}) } });
    const variations = await this.prisma.productVariation.findMany({ where: { id: { in: Array.from(new Set(stock.map(s => s.variationId))) } }, include: { product: true } });
    const varMap = new Map(variations.map(v => [v.id, v]));
    const out: any[] = [];
    for (const s of stock) {
      const v: any = varMap.get(s.variationId);
      const purchasePrice = (await this.getPurchasePriceForVariation(s.variationId)) ?? 0;
      out.push({
        id: `${s.variationId}-${s.storeId}`,
        productName: v?.product?.name || 'N/A',
        storeId: s.storeId,
        quantity: s.quantity,
        costPerUnit: purchasePrice,
        totalValue: s.quantity * purchasePrice,
      });
    }
    return out;
  }

  async profitabilityReport(q: any, user?: any) {
    const startDate = parseDateISO(q.startDate);
    const endDate = parseDateISO(q.endDate);
    const where: any = {};
    if ((user?.permissions || []).includes('MANAGE_ROLES')) {
      if (q.storeId) where.storeId = q.storeId;
    } else if (user?.storeId) {
      where.storeId = user.storeId;
    } else if (q.storeId) { where.storeId = q.storeId; }
    if (startDate) where.createdAt = { ...(where.createdAt || {}), gte: startDate };
    if (endDate) { const end = new Date(endDate); end.setDate(end.getDate() + 1); where.createdAt = { ...(where.createdAt || {}), lt: end }; }
    const sales = await this.prisma.sale.findMany({ where, include: { items: true } });

    // Returns per sale
    const saleIds = sales.map(s => s.id);
    const returns = saleIds.length
      ? await this.prisma.saleReturn.findMany({ where: { saleId: { in: saleIds } }, include: { items: true } })
      : [];
    const returnedBySale = new Map<string, Record<string, number>>();
    for (const r of returns) {
      const m = returnedBySale.get(r.saleId) || {};
      for (const it of (r.items as any[])) m[it.variationId] = (m[it.variationId] || 0) + it.quantity;
      returnedBySale.set(r.saleId, m);
    }

    return Promise.all(sales.map(async (s) => {
      // Revenue net of returns
      const avgMap = new Map<string, number>();
      const agg: Record<string, { qty: number; amount: number }> = {};
      for (const it of s.items as any[]) {
        agg[it.variationId] = agg[it.variationId] || { qty: 0, amount: 0 };
        agg[it.variationId].qty += it.quantity;
        agg[it.variationId].amount += it.quantity * it.priceAtSale;
      }
      Object.entries(agg).forEach(([vId, a]) => avgMap.set(vId, a.qty > 0 ? a.amount / a.qty : 0));
      const ret = returnedBySale.get(s.id) || {};
      const returnedAmount = Object.entries(ret).reduce((sum, [vId, qty]) => sum + (avgMap.get(vId) || 0) * (qty as number), 0);
      const revenue = Math.max(0, s.totalAmount - returnedAmount);

      // Cost net of returns (remove cost of returned quantities at purchase price)
      let cost = 0;
      for (const it of s.items) {
        const pp = (await this.getPurchasePriceForVariation(it.variationId)) ?? it.priceAtSale;
        cost += pp * it.quantity;
      }
      for (const [vId, qty] of Object.entries(ret)) {
        const pp = (await this.getPurchasePriceForVariation(vId)) ?? (avgMap.get(vId) || 0);
        cost -= pp * (qty as number);
      }

      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { id: s.id, date: s.createdAt, storeId: s.storeId, revenue, cost, profit, margin };
    }));
  }

  async expensesReport(q: any, user?: any) {
    const startDate = parseDateISO(q.startDate);
    const endDate = parseDateISO(q.endDate);
    const where: any = {};
    if ((user?.permissions || []).includes('MANAGE_ROLES')) {
      if (q.storeId) where.storeId = q.storeId;
    } else if (user?.storeId) {
      where.storeId = user.storeId;
    } else if (q.storeId) { where.storeId = q.storeId; }
    if (q.expenseCategory) where.category = q.expenseCategory;
    if (startDate) where.createdAt = { ...(where.createdAt || {}), gte: startDate };
    if (endDate) { const end = new Date(endDate); end.setDate(end.getDate() + 1); where.createdAt = { ...(where.createdAt || {}), lt: end }; }
    const exps = await this.prisma.expense.findMany({ where });
    return exps.map(e => ({ id: e.id, date: e.createdAt, storeId: e.storeId, category: e.category, description: e.description, amount: e.amount }));
  }

  async topProductsReport(q: any, user?: any) {
    const startDate = parseDateISO(q.startDate);
    const endDate = parseDateISO(q.endDate);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '5', 10) || 5, 1), 50);
    const whereSale: any = {};
    if ((user?.permissions || []).includes('MANAGE_ROLES')) {
      if (q.storeId) whereSale.storeId = q.storeId;
    } else if (user?.storeId) {
      whereSale.storeId = user.storeId;
    } else if (q.storeId) { whereSale.storeId = q.storeId; }
    if (startDate) whereSale.createdAt = { ...(whereSale.createdAt || {}), gte: startDate };
    if (endDate) { const end = new Date(endDate); end.setDate(end.getDate() + 1); whereSale.createdAt = { ...(whereSale.createdAt || {}), lt: end }; }

    const items = await this.prisma.saleItem.findMany({
      where: { sale: whereSale },
      include: { variation: { include: { product: true } }, sale: { select: { storeId: true, createdAt: true } } },
    });
    const agg = new Map<string, { productId: string; productName: string; ventes: number }>();
    for (const it of items) {
      const productId = (it as any).variation?.product?.id || 'unknown';
      const productName = (it as any).variation?.product?.name || 'N/A';
      const prev = agg.get(productId) || { productId, productName, ventes: 0 };
      prev.ventes += it.quantity;
      agg.set(productId, prev);
    }
    return Array.from(agg.values()).sort((a, b) => b.ventes - a.ventes).slice(0, limit);
  }

  async topVariationsReport(q: any, user?: any) {
    const startDate = parseDateISO(q.startDate);
    const endDate = parseDateISO(q.endDate);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '5', 10) || 5, 1), 50);
    const whereSale: any = {};
    if ((user?.permissions || []).includes('MANAGE_ROLES')) {
      if (q.storeId) whereSale.storeId = q.storeId;
    } else if (user?.storeId) {
      whereSale.storeId = user.storeId;
    } else if (q.storeId) { whereSale.storeId = q.storeId; }
    if (startDate) whereSale.createdAt = { ...(whereSale.createdAt || {}), gte: startDate };
    if (endDate) { const end = new Date(endDate); end.setDate(end.getDate() + 1); whereSale.createdAt = { ...(whereSale.createdAt || {}), lt: end }; }

    const items = await this.prisma.saleItem.findMany({
      where: { sale: whereSale },
      include: { variation: { include: { product: true } }, sale: { select: { storeId: true, createdAt: true } } },
    });
    const agg = new Map<string, { variationId: string; sku: string | null; attributes: any; productName: string; ventes: number }>();
    for (const it of items) {
      const v: any = (it as any).variation;
      const pName = v?.product?.name || 'N/A';
      const prev = agg.get(it.variationId) || { variationId: it.variationId, sku: v?.sku ?? null, attributes: v?.attributes ?? {}, productName: pName, ventes: 0 };
      prev.ventes += it.quantity;
      agg.set(it.variationId, prev);
    }
    return Array.from(agg.values()).sort((a, b) => b.ventes - a.ventes).slice(0, limit);
  }
}
