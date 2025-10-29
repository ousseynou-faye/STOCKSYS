import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  private buildScope(user?: any): Prisma.NotificationWhereInput | undefined {
    if (!user) return {};
    const permissions: string[] = Array.isArray(user?.permissions) ? user.permissions : [];
    const isAdmin = permissions.includes('MANAGE_ROLES');
    if (isAdmin) return {};
    const storeId = user?.storeId;
    if (storeId) return { OR: [{ storeId: null }, { storeId }] } as Prisma.NotificationWhereInput;
    return {};
  }

  list(user?: any) {
    const where = this.buildScope(user);
    return this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async markAllRead(user?: any) {
    const where = this.buildScope(user);
    await this.prisma.notification.updateMany({ where, data: { read: true } });
    return { success: true };
  }
}
