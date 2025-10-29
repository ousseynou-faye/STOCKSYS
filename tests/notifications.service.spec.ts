import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from '../server/src/notifications/notifications.service.js';

describe('NotificationsService.list', () => {
  it('limite les notifications aux globales et a la boutique de l’utilisateur non-admin', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new NotificationsService({
      notification: {
        findMany,
      },
    } as any);

    await service.list({ storeId: 'store-42', permissions: ['VIEW_NOTIFICATIONS'] });

    expect(findMany).toHaveBeenCalledWith({
      where: { OR: [{ storeId: null }, { storeId: 'store-42' }] },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('retourne toutes les notifications pour un admin', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new NotificationsService({
      notification: {
        findMany,
      },
    } as any);

    await service.list({ permissions: ['MANAGE_ROLES'] });

    expect(findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: 'desc' },
    });
  });
});
