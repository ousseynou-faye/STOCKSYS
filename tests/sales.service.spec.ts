import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SalesService } from '../server/src/sales/sales.service.js';

const createService = () => {
  const saleRecord = {
    id: 'sale-1',
    storeId: 'store-1',
    items: [
      {
        variationId: 'var-1',
        quantity: 1,
        priceAtSale: 10,
      },
    ],
  };

  const saleFindUnique = vi.fn().mockResolvedValue(saleRecord);
  const saleReturnFindMany = vi.fn().mockResolvedValue([]);
  const saleReturnCreate = vi.fn().mockResolvedValue({ id: 'return-1' });
  const saleReturnItemCreateMany = vi.fn().mockResolvedValue(undefined);
  const stockFindUnique = vi.fn().mockResolvedValue({ id: 'stock-1', quantity: 5 });
  const stockUpdate = vi.fn().mockResolvedValue(undefined);
  const stockCreate = vi.fn().mockResolvedValue(undefined);
  const saleUpdate = vi.fn().mockResolvedValue(undefined);

  const variationRecord = {
    id: 'var-1',
    sku: 'SKU-1',
    attributes: {},
    product: {
      type: 'STANDARD',
      name: 'Produit 1',
      bundleComponents: [],
    },
  };

  const prismaStub = {
    sale: { findUnique: saleFindUnique },
    saleReturn: { findMany: saleReturnFindMany },
    productVariation: {
      findMany: vi.fn().mockResolvedValue([variationRecord]),
    },
    $transaction: vi.fn(async (fn: any) =>
      fn({
        saleReturn: {
          create: saleReturnCreate,
          findMany: saleReturnFindMany,
        },
        saleReturnItem: {
          createMany: saleReturnItemCreateMany,
        },
        productStock: {
          findUnique: stockFindUnique,
          update: stockUpdate,
          create: stockCreate,
        },
        sale: {
          findUnique: saleFindUnique,
          update: saleUpdate,
        },
      }),
    ),
  };

  const auditStub = {
    audit: vi.fn().mockResolvedValue(undefined),
    notifyLowStock: vi.fn().mockResolvedValue(undefined),
  };

<<<<<<< HEAD
  const service = new SalesService(prismaStub as any, auditStub as any);
=======
  const scopeLoggerStub = { logViolation: vi.fn(), logOverride: vi.fn() };
  const service = new SalesService(prismaStub as any, auditStub as any, scopeLoggerStub as any);
>>>>>>> 7884868 (STOCKSYS)
  return {
    service,
    prismaStub,
    auditStub,
    spies: {
      saleReturnCreate,
      saleReturnItemCreateMany,
      stockFindUnique,
      stockUpdate,
      saleUpdate,
    },
  };
};

describe('SalesService.returnItems', () => {
  it('rejette un retour depassant la quantite vendue', async () => {
    const { service } = createService();

    await expect(
      service.returnItems(
        'sale-1',
        [
          {
            variationId: 'var-1',
            quantity: 2,
          },
        ],
        { storeId: 'store-1', permissions: [] },
      ),
    ).rejects.toThrowError(new BadRequestException('Quantite de retour depasse le vendu pour var-1'));
  });

  it('cree un retour valide et reintegre le stock', async () => {
    const { service, prismaStub, spies } = createService();

    await service.returnItems(
      'sale-1',
      [
        {
          variationId: 'var-1',
          quantity: 1,
        },
      ],
      { storeId: 'store-1', permissions: [] },
    );

    expect(prismaStub.$transaction).toHaveBeenCalled();
    expect(spies.saleReturnCreate).toHaveBeenCalled();
    expect(spies.saleReturnItemCreateMany).toHaveBeenCalledWith({
      data: [
        {
          returnId: 'return-1',
          variationId: 'var-1',
          quantity: 1,
        },
      ],
    });
    expect(spies.stockFindUnique).toHaveBeenCalled();
    expect(spies.stockUpdate).toHaveBeenCalled();
    expect(spies.saleUpdate).not.toHaveBeenCalled();
  });
});
