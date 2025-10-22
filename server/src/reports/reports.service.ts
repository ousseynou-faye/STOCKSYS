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

  async salesReport(q: any) {
    const startDate = parseDateISO(q.startDate);
    const endDate = parseDateISO(q.endDate);
    const where: any = {};
    if (q.storeId) where.storeId = q.storeId;
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
    return sales.map((s, index) => ({
      id: `${s.id}-${index}`,
      date: s.createdAt,
      storeId: s.storeId,
      userId: s.userId,
      itemCount: s.items.reduce((sum, it) => sum + it.quantity, 0),
      totalAmount: s.totalAmount,
    }));
  }

  async getPurchasePriceForVariation(variationId: string): Promise<number | null> {
    const sp = await this.prisma.supplierProduct.findMany({ where: { variationId }, orderBy: { purchasePrice: 'asc' }, take: 1 });
    return sp.length ? sp[0].purchasePrice : null;
  }

  async stockValuationReport(storeId?: string) {
    const stock = await this.prisma.productStock.findMany({ where: { ...(storeId ? { storeId } : {}) } });
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

  async profitabilityReport(q: any) {
    const startDate = parseDateISO(q.startDate);
    const endDate = parseDateISO(q.endDate);
    const where: any = {};
    if (q.storeId) where.storeId = q.storeId;
    if (startDate) where.createdAt = { ...(where.createdAt || {}), gte: startDate };
    if (endDate) { const end = new Date(endDate); end.setDate(end.getDate() + 1); where.createdAt = { ...(where.createdAt || {}), lt: end }; }
    const sales = await this.prisma.sale.findMany({ where, include: { items: true } });
    return Promise.all(sales.map(async (s) => {
      const revenue = s.totalAmount;
      let cost = 0;
      for (const it of s.items) {
        const pp = (await this.getPurchasePriceForVariation(it.variationId)) ?? it.priceAtSale;
        cost += pp * it.quantity;
      }
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { id: s.id, date: s.createdAt, storeId: s.storeId, revenue, cost, profit, margin };
    }));
  }

  async expensesReport(q: any) {
    const startDate = parseDateISO(q.startDate);
    const endDate = parseDateISO(q.endDate);
    const where: any = {};
    if (q.storeId) where.storeId = q.storeId;
    if (q.expenseCategory) where.category = q.expenseCategory;
    if (startDate) where.createdAt = { ...(where.createdAt || {}), gte: startDate };
    if (endDate) { const end = new Date(endDate); end.setDate(end.getDate() + 1); where.createdAt = { ...(where.createdAt || {}), lt: end }; }
    const exps = await this.prisma.expense.findMany({ where });
    return exps.map(e => ({ id: e.id, date: e.createdAt, storeId: e.storeId, category: e.category, description: e.description, amount: e.amount }));
  }

  async topProductsReport(q: any) {
    const startDate = parseDateISO(q.startDate);
    const endDate = parseDateISO(q.endDate);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '5', 10) || 5, 1), 50);
    const whereSale: any = {};
    if (q.storeId) whereSale.storeId = q.storeId;
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

  async topVariationsReport(q: any) {
    const startDate = parseDateISO(q.startDate);
    const endDate = parseDateISO(q.endDate);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '5', 10) || 5, 1), 50);
    const whereSale: any = {};
    if (q.storeId) whereSale.storeId = q.storeId;
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
