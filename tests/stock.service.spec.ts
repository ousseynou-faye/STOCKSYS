import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@nestjs/common', async () => {
  const actual = await vi.importActual<typeof import('@nestjs/common')>('@nestjs/common');
  return {
    ...actual,
    Injectable: () => () => {},
  };
});

import { BadRequestException } from '@nestjs/common';
import { StockService } from '../server/src/stock/stock.service.js';

const createService = () => {
  const prismaStub = {
    productStock: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    store: {
      findUnique: vi.fn().mockResolvedValue({ id: 'store-1', name: 'Boutique A' }),
    },
  };

  const auditStub = {
    notifyLowStock: vi.fn().mockResolvedValue(undefined),
    audit: vi.fn().mockResolvedValue(undefined),
  };

  return { prismaStub, auditStub, service: new StockService(prismaStub as any, auditStub as any) };
};

describe('StockService.adjust', () => {
  it('refuse un ajustement hors boutique pour un non-admin', async () => {
    const { service } = createService();

    await expect(
      service.adjust(
        { variationId: 'var-1', storeId: 'store-2', newQuantity: 10 },
        { storeId: 'store-1', permissions: [] },
      ),
    ).rejects.toThrowError(new BadRequestException('Ajustement limite a votre boutique.'));
  });

  it('met a jour le stock et emet une notification pour un ajustement valide', async () => {
    const { service, prismaStub, auditStub } = createService();

    prismaStub.productStock.findUnique.mockResolvedValue({ id: 'stock-1', quantity: 5 });

    await service.adjust(
      { variationId: 'var-1', storeId: 'store-1', newQuantity: 7 },
      { storeId: 'store-1', permissions: [] },
    );

    expect(prismaStub.productStock.update).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: { quantity: 7 },
    });
    expect(auditStub.notifyLowStock).toHaveBeenCalled();
    expect(auditStub.audit).toHaveBeenCalled();
  });
});

describe('StockService.transfer', () => {
  const auditStub = {
    notifyLowStock: vi.fn().mockResolvedValue(undefined),
    audit: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    auditStub.notifyLowStock.mockClear();
    auditStub.audit.mockClear();
  });

  it('rejette le transfert en cas de stock insuffisant', async () => {
    const prisma = {
      $transaction: vi.fn(async (fn: any) =>
        fn({
          store: {
            findUnique: vi.fn().mockResolvedValue({ id: 'store-1', name: 'Origine' }),
          },
          productStock: {
            findUnique: vi.fn().mockResolvedValue({ id: 'from-stock', quantity: 1 }),
            update: vi.fn(),
            create: vi.fn(),
          },
        }),
      ),
    };

    const service = new StockService(prisma as any, auditStub as any);

    await expect(
      service.transfer(
        {
          fromStoreId: 'store-1',
          toStoreId: 'store-2',
          items: [{ variationId: 'var-1', quantity: 2 }],
        },
        { storeId: 'store-1', permissions: [] },
      ),
    ).rejects.toThrowError(new BadRequestException('Stock insuffisant pour transfert.'));
  });

  it('decremente et incremente les stocks lors d’un transfert valide', async () => {
    const productStockFindUnique = vi
      .fn()
      .mockResolvedValueOnce({ id: 'from-stock', quantity: 5 })
      .mockResolvedValueOnce({ id: 'to-stock', quantity: 3 });

    const productStockUpdate = vi.fn();
    const productStockCreate = vi.fn();

    const prisma = {
      $transaction: vi.fn(async (fn: any) =>
        fn({
          store: {
            findUnique: vi
              .fn()
              .mockResolvedValueOnce({ id: 'store-1', name: 'Origine' })
              .mockResolvedValueOnce({ id: 'store-2', name: 'Destination' }),
          },
          productStock: {
            findUnique: productStockFindUnique,
            update: productStockUpdate,
            create: productStockCreate,
          },
        }),
      ),
    };

    const service = new StockService(prisma as any, auditStub as any);

    await service.transfer(
      {
        fromStoreId: 'store-1',
        toStoreId: 'store-2',
        items: [{ variationId: 'var-1', quantity: 2 }],
      },
      { storeId: 'store-1', permissions: [] },
    );

    expect(productStockUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'from-stock' },
      data: { quantity: 3 },
    });
    expect(productStockUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'to-stock' },
      data: { quantity: 5 },
    });
    expect(productStockCreate).not.toHaveBeenCalled();
    expect(auditStub.notifyLowStock).toHaveBeenCalledTimes(2);
    expect(auditStub.audit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'STOCK_TRANSFER',
      }),
    );
  });

  it('cree les stocks manquants lors d’un transfert multi-variations', async () => {
    const productStockFindUnique = vi
      .fn()
      // item 1 - from
      .mockResolvedValueOnce({ id: 'from-var-1', quantity: 5 })
      // item 1 - to
      .mockResolvedValueOnce({ id: 'to-var-1', quantity: 1 })
      // item 2 - from
      .mockResolvedValueOnce({ id: 'from-var-2', quantity: 4 })
      // item 2 - to (absent)
      .mockResolvedValueOnce(null);

    const productStockUpdate = vi.fn();
    const productStockCreate = vi.fn();

    const prisma = {
      $transaction: vi.fn(async (fn: any) =>
        fn({
          store: {
            findUnique: vi
              .fn()
              .mockResolvedValueOnce({ id: 'store-1', name: 'Origine' })
              .mockResolvedValueOnce({ id: 'store-2', name: 'Destination' }),
          },
          productStock: {
            findUnique: productStockFindUnique,
            update: productStockUpdate,
            create: productStockCreate,
          },
        }),
      ),
    };

    const service = new StockService(prisma as any, auditStub as any);

    await service.transfer(
      {
        fromStoreId: 'store-1',
        toStoreId: 'store-2',
        items: [
          { variationId: 'var-1', quantity: 2 },
          { variationId: 'var-2', quantity: 1 },
        ],
      },
      { storeId: 'store-1', permissions: [] },
    );

    expect(productStockUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'from-var-1' },
      data: { quantity: 3 },
    });
    expect(productStockUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'to-var-1' },
      data: { quantity: 3 },
    });
    expect(productStockUpdate).toHaveBeenNthCalledWith(3, {
      where: { id: 'from-var-2' },
      data: { quantity: 3 },
    });
    expect(productStockCreate).toHaveBeenCalledWith({
      data: { storeId: 'store-2', variationId: 'var-2', quantity: 1 },
    });
    expect(auditStub.notifyLowStock).toHaveBeenCalledTimes(4);
  });

  it('arrete le transfert lorsqu’une variation est en rupture', async () => {
    const productStockFindUnique = vi
      .fn()
      // var-1 from
      .mockResolvedValueOnce({ id: 'from-var-1', quantity: 5 })
      // var-1 to
      .mockResolvedValueOnce({ id: 'to-var-1', quantity: 1 })
      // var-2 from -> insuffisant
      .mockResolvedValueOnce({ id: 'from-var-2', quantity: 0 });

    const productStockUpdate = vi.fn();
    const productStockCreate = vi.fn();

    const prisma = {
      $transaction: vi.fn(async (fn: any) =>
        fn({
          store: {
            findUnique: vi
              .fn()
              .mockResolvedValueOnce({ id: 'store-1', name: 'Origine' })
              .mockResolvedValueOnce({ id: 'store-2', name: 'Destination' }),
          },
          productStock: {
            findUnique: productStockFindUnique,
            update: productStockUpdate,
            create: productStockCreate,
          },
        }),
      ),
    };

    const service = new StockService(prisma as any, auditStub as any);

    await expect(
      service.transfer(
        {
          fromStoreId: 'store-1',
          toStoreId: 'store-2',
          items: [
            { variationId: 'var-1', quantity: 2 },
            { variationId: 'var-2', quantity: 1 },
          ],
        },
        { storeId: 'store-1', permissions: [] },
      ),
    ).rejects.toThrowError(new BadRequestException('Stock insuffisant pour transfert.'));

    expect(productStockUpdate).toHaveBeenCalledTimes(2); // var-1 (from/to) uniquement
    expect(productStockCreate).not.toHaveBeenCalled();
  });
});


