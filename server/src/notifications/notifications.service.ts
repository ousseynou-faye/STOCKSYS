import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  list() { return this.prisma.notification.findMany({ orderBy: { createdAt: 'desc' } }); }
  async markAllRead() { await this.prisma.notification.updateMany({ data: { read: true } }); return { success: true }; }
}

