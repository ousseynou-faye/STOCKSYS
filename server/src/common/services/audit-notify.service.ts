import { Injectable } from '@nestjs/common';

type PrismaLike = any;

@Injectable()
export class AuditNotifyService {
  async audit(prisma: PrismaLike, params: { action: string; details: string; user?: { sub?: string; username?: string }; entityType?: string; entityId?: string; }) {
    const { action, details, user, entityType, entityId } = params;
    await prisma.auditLog.create({
      data: {
        action,
        details,
        userId: user?.sub,
        username: user?.username,
        entityType,
        entityId,
      },
    });
  }

  async notify(prisma: PrismaLike, params: { type: string; message: string; storeId?: string; variationId?: string; }) {
    const { type, message, storeId, variationId } = params;
    await prisma.notification.create({
      data: { type, message, storeId, variationId },
    });
  }
}
