import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditQueryDto } from './dto/audit-query.dto.js';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async list(query: AuditQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 15;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action as any;
    if (query.date) {
      // Accept YYYY-MM-DD and filter logs on that day (UTC)
      const start = new Date(query.date + 'T00:00:00.000Z');
      const end = new Date(query.date + 'T23:59:59.999Z');
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) where.createdAt = { gte: start, lte: end };
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    ]);

    return { data, meta: { total, page, limit } };
  }
}
