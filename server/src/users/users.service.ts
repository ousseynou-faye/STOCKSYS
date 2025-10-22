import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FR } from '../common/i18n/fr.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(q?: any) {
    const page = Math.max(parseInt(q?.page ?? '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '20', 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const sort = (q?.sort as string) || 'username';
    const orderBy = Array.isArray(sort)
      ? (sort as any[]).map((s: any) => (s.startsWith('-') ? { [s.slice(1)]: 'desc' } : { [s]: 'asc' }))
      : (sort.startsWith('-') ? { [sort.slice(1)]: 'desc' } : { [sort]: 'asc' });
    const where: any = {};
    if (q?.storeId) where.storeId = q.storeId;
    if (q?.username) where.username = { contains: q.username, mode: 'insensitive' };
    const total = await this.prisma.user.count({ where });
    const data = await this.prisma.user.findMany({ where, include: { roles: { select: { id: true } } }, orderBy, skip, take: limit });
    return { data, meta: { page, limit, total } };
  }

  async create(data: any) {
    const password = data.password || 'changeme';
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash(password, 10);
    let created;
    try {
      created = await this.prisma.user.create({ data: { username: data.username, passwordHash: hash, storeId: data.storeId } });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException("Nom d'utilisateur déjà utilisé.");
      }
      throw e;
    }
    if (Array.isArray(data.roleIds) && data.roleIds.length) {
      await this.prisma.user.update({ where: { id: created.id }, data: { roles: { set: [], connect: data.roleIds.map((id: string) => ({ id })) } } });
    }
    return this.prisma.user.findUnique({ where: { id: created.id }, include: { roles: { select: { id: true } } } });
  }

  async update(id: string, data: any) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(FR.ERR_USER_NOT_FOUND);
    const { roleIds, ...rest } = data;
    const updated = await this.prisma.user.update({ where: { id }, data: rest });
    if (Array.isArray(roleIds)) {
      await this.prisma.user.update({ where: { id }, data: { roles: { set: [], connect: roleIds.map((rid: string) => ({ id: rid })) } } });
    }
    return this.prisma.user.findUnique({ where: { id }, include: { roles: { select: { id: true } } } });
  }

  async remove(id: string) {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(FR.ERR_USER_NOT_FOUND);
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
