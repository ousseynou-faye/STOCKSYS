import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FR } from '../common/i18n/fr.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

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
    if (q?.category) where.category = q.category;
    if (q?.date) where.createdAt = { gte: new Date(q.date), lt: new Date(q.date + 'T23:59:59.999Z') } as any;
    const total = await this.prisma.expense.count({ where });
    const data = await this.prisma.expense.findMany({ where, orderBy, skip, take: limit });
    return { data, meta: { page, limit, total } };
  }
  async create(data: any) {
    try {
      return await this.prisma.expense.create({ data });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new BadRequestException('Contrainte de clé étrangère: storeId/userId invalide.');
      }
      throw e;
    }
  }
  async update(id: string, data: any) {
    const exists = await this.prisma.expense.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(FR.ERR_EXPENSE_NOT_FOUND);
    return this.prisma.expense.update({ where: { id }, data });
  }
  async remove(id: string) {
    const exists = await this.prisma.expense.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(FR.ERR_EXPENSE_NOT_FOUND);
    await this.prisma.expense.delete({ where: { id } });
    return { success: true };
  }
}
