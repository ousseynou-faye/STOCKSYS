import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FR } from '../common/i18n/fr.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async list(q?: any, user?: any) {
    const page = Math.max(parseInt(q?.page ?? '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '20', 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const sort = (q?.sort as string) || '-createdAt';
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
    if (q?.category) where.category = q.category;
    if (q?.date) where.createdAt = { gte: new Date(q.date), lt: new Date(q.date + 'T23:59:59.999Z') } as any;
    const total = await this.prisma.expense.count({ where });
    const data = await this.prisma.expense.findMany({ where, orderBy, skip, take: limit });
    return { data, meta: { page, limit, total } };
  }

  async create(data: any, user?: any) {
    const isAdmin = (user?.permissions || []).includes('MANAGE_ROLES');
    const effectiveStoreId = isAdmin ? data.storeId : user?.storeId;
    if (!effectiveStoreId) {
      throw new BadRequestException('Boutique introuvable pour la dépense.');
    }
    if (!isAdmin && data.storeId && data.storeId !== effectiveStoreId) {
      throw new BadRequestException('Création limité à votre boutique.');
    }
    const payload = {
      ...data,
      storeId: effectiveStoreId,
      userId: data.userId || user?.sub,
    };
    try {
      return await this.prisma.expense.create({ data: payload });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new BadRequestException('Clé étrangère invalide (storeId / userId).');
      }
      throw e;
    }
  }

  async update(id: string, data: any, user?: any) {
    const exists = await this.prisma.expense.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(FR.ERR_EXPENSE_NOT_FOUND);
    const isAdmin = (user?.permissions || []).includes('MANAGE_ROLES');
    if (!isAdmin) {
      if (!user?.storeId || exists.storeId !== user.storeId) {
        throw new BadRequestException('Modification limitée à votre boutique.');
      }
      if (data.storeId && data.storeId !== user.storeId) {
        throw new BadRequestException('Changement de boutique interdit.');
      }
    }
    const payload = { ...data };
    if (!isAdmin) payload.storeId = user.storeId;
    return this.prisma.expense.update({ where: { id }, data: payload });
  }

  async remove(id: string, user?: any): Promise<void> {
    const exists = await this.prisma.expense.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(FR.ERR_EXPENSE_NOT_FOUND);
    const isAdmin = (user?.permissions || []).includes('MANAGE_ROLES');
    if (!isAdmin && (!user?.storeId || exists.storeId !== user.storeId)) {
      throw new BadRequestException('Suppression limitée à votre boutique.');
    }
    await this.prisma.expense.delete({ where: { id } });
    return;
  }
}
