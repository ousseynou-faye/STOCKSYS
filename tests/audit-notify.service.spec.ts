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
<<<<<<< HEAD
=======

describe('AuditNotifyService.notifyMultiChannel', () => {
  const service = new AuditNotifyService();

  it('envoie sur plusieurs canaux (db + email + sms) et retourne les canaux réussis', async () => {
    const prisma = {
      notification: {
        create: vi.fn().mockResolvedValue(undefined),
      },
    };
    const emailAdapter = vi.fn().mockResolvedValue(undefined);
    const smsAdapter = vi.fn().mockResolvedValue(undefined);

    const result = await service.notifyMultiChannel(prisma, {
      type: 'ALERT',
      message: 'Test multi-canal',
      storeId: 'store-1',
      channels: ['db', 'email', 'sms'],
      adapters: { email: emailAdapter, sms: smsAdapter },
    });

    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(emailAdapter).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ALERT', message: 'Test multi-canal', storeId: 'store-1' }),
    );
    expect(smsAdapter).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ALERT', message: 'Test multi-canal', storeId: 'store-1' }),
    );
    expect(result).toEqual({
      db: true,
      email: true,
      sms: true,
      webhook: false,
    });
  });

  it("n'echoue pas si un canal est demande sans adapter disponible", async () => {
    const prisma = {
      notification: {
        create: vi.fn().mockResolvedValue(undefined),
      },
    };

    const result = await service.notifyMultiChannel(prisma, {
      type: 'INFO',
      message: 'Sans adapter',
      channels: ['db', 'email'], // email sans adapter
    });

    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      db: true,
      email: false,
      sms: false,
      webhook: false,
    });
  });
});
>>>>>>> 7884868 (STOCKSYS)
