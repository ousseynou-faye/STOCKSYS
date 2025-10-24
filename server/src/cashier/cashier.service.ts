import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CashierService {
  constructor(private prisma: PrismaService) {}

  async list(q?: any, user?: any) {
    const page = Math.max(parseInt(q?.page ?? '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '20', 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const sort = (q?.sort as string) || '-startedAt';
    const orderBy = Array.isArray(sort)
      ? (sort as any[]).map((s: any) => (s.startsWith('-') ? { [s.slice(1)]: 'desc' } : { [s]: 'asc' }))
      : (sort.startsWith('-') ? { [sort.slice(1)]: 'desc' } : { [sort]: 'asc' });
    const where: any = {};
    if ((user?.permissions || []).includes('MANAGE_ROLES')) {
      if (q?.storeId) where.storeId = q.storeId;
      if (q?.userId) where.userId = q.userId;
    } else {
      if (user?.storeId) where.storeId = user.storeId;
      if (q?.userId) where.userId = q.userId;
    }
    const total = await this.prisma.cashierSession.count({ where });
    const data = await this.prisma.cashierSession.findMany({ where, orderBy, skip, take: limit });
    return { data, meta: { page, limit, total } };
  }
  active(userId: string, storeId: string) {
    return this.prisma.cashierSession.findFirst({ where: { userId, storeId, endedAt: null } });
  }
  start(body: { userId: string; storeId: string; openingBalance: number }) {
    return this.prisma.cashierSession.create({ data: { userId: body.userId, storeId: body.storeId, openingBalance: body.openingBalance } });
  }
  async close(sessionId: string, closingBalance: number) {
    const session = await this.prisma.cashierSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new BadRequestException('Session introuvable');
    if (session.endedAt) throw new BadRequestException('La session est déjà clôturée');

    // Calcule les ventes théoriques par méthode depuis le début de la session
    const payments = await this.prisma.payment.findMany({
      where: {
        sale: {
          storeId: session.storeId,
          createdAt: { gte: session.startedAt },
        },
      },
      include: { sale: { select: { id: true } } },
    });

    const methods = ['CASH', 'CARD', 'MOBILE_MONEY'] as const;
    const totals: Record<typeof methods[number], number> = { CASH: 0, CARD: 0, MOBILE_MONEY: 0 } as any;
    for (const p of payments) {
      const key = p.method as keyof typeof totals;
      if (totals[key] !== undefined) totals[key] += p.amount;
    }

    const expectedCash = session.openingBalance + totals.CASH;
    const difference = closingBalance - expectedCash;

    return this.prisma.cashierSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        closingBalance,
        theoreticalSales: totals as any,
        difference,
      },
    });
  }

  async liveSummary(sessionId: string) {
    const session = await this.prisma.cashierSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new BadRequestException('Session introuvable');

    const payments = await this.prisma.payment.findMany({
      where: { sale: { storeId: session.storeId, createdAt: { gte: session.startedAt } } },
      include: { sale: { select: { id: true, totalAmount: true, createdAt: true } } },
    });

    const methods = ['CASH', 'CARD', 'MOBILE_MONEY'] as const;
    const totals: Record<typeof methods[number], number> = { CASH: 0, CARD: 0, MOBILE_MONEY: 0 } as any;
    const saleSeen = new Set<string>();
    let saleCount = 0;
    let totalSalesAmount = 0;

    for (const p of payments) {
      const key = p.method as keyof typeof totals;
      if (totals[key] !== undefined) totals[key] += p.amount;
      if (p.sale && !saleSeen.has(p.sale.id)) {
        saleSeen.add(p.sale.id);
        saleCount += 1;
        totalSalesAmount += (p as any).sale.totalAmount || 0;
      }
    }

    const expectedCash = session.openingBalance + totals.CASH;
    return { ...totals, expectedCash, saleCount, totalSalesAmount };
  }
}
