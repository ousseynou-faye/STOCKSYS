import { Injectable, NotFoundException } from '@nestjs/common';
import { FR } from '../common/i18n/fr.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  async findAll(q?: any) {
    const page = Math.max(parseInt(q?.page ?? '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '20', 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const sort = (q?.sort as string) || 'name';
    const orderBy = Array.isArray(sort)
      ? (sort as any[]).map((s: any) => (s.startsWith('-') ? { [s.slice(1)]: 'desc' } : { [s]: 'asc' }))
      : (sort.startsWith('-') ? { [sort.slice(1)]: 'desc' } : { [sort]: 'asc' });
    const where: any = {};
    if (q?.name) where.name = { contains: q.name, mode: 'insensitive' };
    const total = await this.prisma.store.count({ where });
    const data = await this.prisma.store.findMany({ where, orderBy, skip, take: limit });
    return { data, meta: { page, limit, total } };
  }
  create(data: any) { return this.prisma.store.create({ data: { name: data.name } }); }
  async update(id: string, data: any) {
    const exists = await this.prisma.store.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(FR.ERR_STORE_NOT_FOUND);
    return this.prisma.store.update({ where: { id }, data });
  }
  async remove(id: string) {
    const exists = await this.prisma.store.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(FR.ERR_STORE_NOT_FOUND);
    await this.prisma.store.delete({ where: { id } });
    return { success: true };
  }
}
