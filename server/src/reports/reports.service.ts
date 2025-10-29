import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { hasGlobalAccess, getUserStoreId } from '../common/utils/auth.utils.js';

function parseDateISO(d?: string) {
  if (!d) return undefined;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
}

function resolveStoreId(requested: string | undefined, user?: any) {
  const requestedId = typeof requested === 'string' && requested.length > 0 ? requested : undefined;
  const isAdmin = hasGlobalAccess(user);
  const userStoreId = getUserStoreId(user);
  if (isAdmin) return requestedId;
  if (userStoreId) return userStoreId;
  return requestedId;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async salesReport(q: any, user?: any) {
    const startDate = parseDateISO(q?.startDate);
    const endDate = parseDateISO(q?.endDate);

    const where: any = {};
    const scopedStoreId = resolveStoreId(q?.storeId, user);
    if (scopedStoreId) where.storeId = scopedStoreId;
    if (q?.userId) where.userId = q.userId;

    const itemClauses: any[] = [];
    if (q?.productId) itemClauses.push({ variation: { productId: q.productId } });
    if (q?.categoryId) itemClauses.push({ variation: { product: { categoryId: q.categoryId } } });
    if (itemClauses.length > 0) where.items = { some: { AND: itemClauses } };

    if (startDate) where.createdAt = { ...(where.createdAt || {}), gte: startDate };
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.createdAt = { ...(where.createdAt || {}), lt: end };
    }

    const sales = await this.prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

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

    const saleIds = sales.map((s) => s.id);
    const returns = saleIds.length
      ? await this.prisma.saleReturn.findMany({
          where: { saleId: { in: saleIds } },
          include: { items: true },
        })
      : [];
    const returnedBySale = new Map<string, Record<string, number>>();
    for (const ret of returns) {
      const buffer = returnedBySale.get(ret.saleId) || {};
      for (const it of ret.items as any[]) {
        buffer[it.variationId] = (buffer[it.variationId] || 0) + it.quantity;
      }
      returnedBySale.set(ret.saleId, buffer);
    }

    return sales.map((s, index) => {
      const avgMap = toAvgMap(s as any);
      const ret = returnedBySale.get(s.id) || {};
      const returnedAmount = Object.entries(ret).reduce(
        (sum, [vId, qty]) => sum + (avgMap.get(vId) || 0) * (qty as number),
        0,
      );
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
    const sp = await this.prisma.supplierProduct.findMany({
      where: { variationId },
      orderBy: { purchasePrice: 'asc' },
      take: 1,
    });
    return sp.length ? sp[0].purchasePrice : null;
  }

  async stockValuationReport(storeId?: string, user?: any) {
    const scopedStoreId = resolveStoreId(storeId, user);
    const stock = await this.prisma.productStock.findMany({
      where: scopedStoreId ? { storeId: scopedStoreId } : {},
    });
    const variationIds = Array.from(new Set(stock.map((s) => s.variationId)));
    const variations = await this.prisma.productVariation.findMany({
      where: { id: { in: variationIds } },
      include: { product: true },
    });
    const varMap = new Map(variations.map((v) => [v.id, v]));

    const output: any[] = [];
    for (const s of stock) {
      const variation: any = varMap.get(s.variationId);
      const purchasePrice = (await this.getPurchasePriceForVariation(s.variationId)) ?? 0;
      output.push({
        id: `${s.variationId}-${s.storeId}`,
        productName: variation?.product?.name || 'N/A',
        storeId: s.storeId,
        quantity: s.quantity,
        costPerUnit: purchasePrice,
        totalValue: s.quantity * purchasePrice,
      });
    }
    return output;
  }

  async profitabilityReport(q: any, user?: any) {
    const startDate = parseDateISO(q?.startDate);
    const endDate = parseDateISO(q?.endDate);

    const where: any = {};
    const scopedStoreId = resolveStoreId(q?.storeId, user);
    if (scopedStoreId) where.storeId = scopedStoreId;
    if (startDate) where.createdAt = { ...(where.createdAt || {}), gte: startDate };
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.createdAt = { ...(where.createdAt || {}), lt: end };
    }

    const sales = await this.prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    return Promise.all(
      sales.map(async (s: any) => {
        const avgMap = new Map<string, number>();
        const agg: Record<string, { qty: number; amount: number }> = {};
        for (const it of s.items) {
          agg[it.variationId] = agg[it.variationId] || { qty: 0, amount: 0 };
          agg[it.variationId].qty += it.quantity;
          agg[it.variationId].amount += it.quantity * it.priceAtSale;
        }
        Object.entries(agg).forEach(([vId, a]) => avgMap.set(vId, a.qty > 0 ? a.amount / a.qty : 0));

        const returns = await this.prisma.saleReturn.findMany({
          where: { saleId: s.id },
          include: { items: true },
        });
        const returnedByVar: Record<string, number> = {};
        for (const ret of returns) {
          for (const it of ret.items as any[]) {
            returnedByVar[it.variationId] = (returnedByVar[it.variationId] || 0) + it.quantity;
          }
        }

        const returnedAmount = Object.entries(returnedByVar).reduce(
          (sum, [vId, qty]) => sum + (avgMap.get(vId) || 0) * qty,
          0,
        );
        const revenue = Math.max(0, s.totalAmount - returnedAmount);

        let cost = 0;
        for (const it of s.items) {
          const price = (await this.getPurchasePriceForVariation(it.variationId)) ?? it.priceAtSale;
          cost += price * it.quantity;
        }
        for (const [vId, qty] of Object.entries(returnedByVar)) {
          const retPrice = (await this.getPurchasePriceForVariation(vId)) ?? (avgMap.get(vId) || 0);
          cost -= retPrice * qty;
        }

        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        return { id: s.id, date: s.createdAt, storeId: s.storeId, revenue, cost, profit, margin };
      }),
    );
  }

  async expensesReport(q: any, user?: any) {
    const startDate = parseDateISO(q?.startDate);
    const endDate = parseDateISO(q?.endDate);
    const where: any = {};
    const scopedStoreId = resolveStoreId(q?.storeId, user);
    if (scopedStoreId) where.storeId = scopedStoreId;
    if (q?.expenseCategory) where.category = q.expenseCategory;
    if (startDate) where.createdAt = { ...(where.createdAt || {}), gte: startDate };
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.createdAt = { ...(where.createdAt || {}), lt: end };
    }

    const expenses = await this.prisma.expense.findMany({ where });
    return expenses.map((e) => ({
      id: e.id,
      date: e.createdAt,
      storeId: e.storeId,
      category: e.category,
      description: e.description,
      amount: e.amount,
    }));
  }

  async topProductsReport(q: any, user?: any) {
    const startDate = parseDateISO(q?.startDate);
    const endDate = parseDateISO(q?.endDate);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '5', 10) || 5, 1), 50);

    const whereSale: any = {};
    const scopedStoreId = resolveStoreId(q?.storeId, user);
    if (scopedStoreId) whereSale.storeId = scopedStoreId;
    if (startDate) whereSale.createdAt = { ...(whereSale.createdAt || {}), gte: startDate };
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      whereSale.createdAt = { ...(whereSale.createdAt || {}), lt: end };
    }

    const items = await this.prisma.saleItem.findMany({
      where: { sale: whereSale },
      include: { variation: { include: { product: true } }, sale: { select: { storeId: true, createdAt: true } } },
    });

    const agg = new Map<string, { productId: string; productName: string; ventes: number }>();
    for (const it of items) {
      const productId = (it as any).variation?.product?.id || 'unknown';
      const productName = (it as any).variation?.product?.name || 'N/A';
      const current = agg.get(productId) || { productId, productName, ventes: 0 };
      current.ventes += it.quantity;
      agg.set(productId, current);
    }

    return Array.from(agg.values())
      .sort((a, b) => b.ventes - a.ventes)
      .slice(0, limit);
  }

  async topVariationsReport(q: any, user?: any) {
    const startDate = parseDateISO(q?.startDate);
    const endDate = parseDateISO(q?.endDate);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '5', 10) || 5, 1), 50);

    const whereSale: any = {};
    const scopedStoreId = resolveStoreId(q?.storeId, user);
    if (scopedStoreId) whereSale.storeId = scopedStoreId;
    if (startDate) whereSale.createdAt = { ...(whereSale.createdAt || {}), gte: startDate };
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      whereSale.createdAt = { ...(whereSale.createdAt || {}), lt: end };
    }

    const items = await this.prisma.saleItem.findMany({
      where: { sale: whereSale },
      include: { variation: { include: { product: true } }, sale: { select: { storeId: true, createdAt: true } } },
    });

    const agg = new Map<
      string,
      { variationId: string; sku: string | null; attributes: any; productName: string; ventes: number }
    >();
    for (const it of items) {
      const variation: any = (it as any).variation;
      const attr =
        variation?.attributes && !Array.isArray(variation.attributes) && typeof variation.attributes === 'object'
          ? variation.attributes
          : {};
      const record =
        agg.get(it.variationId) ||
        {
          variationId: it.variationId,
          sku: variation?.sku ?? null,
          attributes: attr,
          productName: variation?.product?.name || 'N/A',
          ventes: 0,
        };
      record.ventes += it.quantity;
      agg.set(it.variationId, record);
    }

    return Array.from(agg.values())
      .sort((a, b) => b.ventes - a.ventes)
      .slice(0, limit);
  }
}
