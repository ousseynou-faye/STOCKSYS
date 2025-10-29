import { describe, expect, it, vi } from 'vitest';
import { AuditNotifyService } from '../server/src/common/services/audit-notify.service.js';

describe('AuditNotifyService.notifyLowStock', () => {
  const service = new AuditNotifyService();

  it('cree une notification lorsque le stock passe sous le seuil', async () => {
    const prisma = {
      productVariation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'var-1',
          sku: 'SKU-1',
          attributes: { taille: 'L' },
          product: {
            name: 'Chemise',
            lowStockThreshold: 3,
          },
        }),
      },
      notification: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(undefined),
      },
    };

    await service.notifyLowStock(prisma, {
      storeId: 'store-1',
      storeName: 'Boutique 1',
      quantity: 2,
      variation: 'var-1',
    });

    expect(prisma.productVariation.findUnique).toHaveBeenCalledWith({
      where: { id: 'var-1' },
      include: { product: { select: { name: true, lowStockThreshold: true } } },
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'ALERT',
        storeId: 'store-1',
        variationId: 'var-1',
      }),
    });
  });

  it('met a jour une notification existante', async () => {
    const prisma = {
      productVariation: {
        findUnique: vi.fn(),
      },
      notification: {
        findFirst: vi.fn().mockResolvedValue({ id: 'notif-1' }),
        update: vi.fn().mockResolvedValue(undefined),
        create: vi.fn(),
      },
    };

    await service.notifyLowStock(prisma, {
      storeId: 'store-2',
      storeName: 'Depot',
      quantity: 1,
      variation: {
        id: 'var-9',
        attributes: ['Rouge', 'XL'],
        product: { name: 'Pull', lowStockThreshold: 2 },
      },
    });

    expect(prisma.productVariation.findUnique).not.toHaveBeenCalled();
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: expect.objectContaining({
        message: expect.stringContaining('Pull'),
      }),
    });
  });

  it("ignore les variations sans seuil d'alerte", async () => {
    const prisma = {
      productVariation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'var-2',
          sku: 'SKU-2',
          attributes: {},
          product: { name: 'Chaise', lowStockThreshold: null },
        }),
      },
      notification: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    await service.notifyLowStock(prisma, {
      storeId: 'store-9',
      storeName: 'Entrepot',
      quantity: 1,
      variation: 'var-2',
    });

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });
});
