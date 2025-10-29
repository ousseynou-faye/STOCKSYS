import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PurchasesService } from '../server/src/purchases/purchases.service.js';

const createAuditStub = () => ({
  audit: vi.fn().mockResolvedValue(undefined),
  notifyLowStock: vi.fn().mockResolvedValue(undefined),
  notify: vi.fn().mockResolvedValue(undefined),
});

describe('PurchasesService.receive', () => {
  const user = { storeId: 'store-1', permissions: [] as string[] };
  const purchaseOrder = {
    id: 'po-1',
    status: 'ORDERED',
    storeId: 'store-1',
    items: [
      {
        id: 'poi-1',
        variationId: 'var-1',
        quantity: 3,
        receivedQuantity: 2,
      },
    ],
  };

  const createPrismaStub = () => ({
    $transaction: vi.fn(async (fn: any) =>
      fn({
        purchaseOrder: {
          findUnique: vi.fn().mockResolvedValue(purchaseOrder),
          update: vi.fn(),
        },
        purchaseOrderItem: {
          update: vi.fn(),
          findMany: vi.fn(),
        },
        productStock: {
          findUnique: vi.fn(),
          update: vi.fn(),
          create: vi.fn(),
        },
      }),
    ),
  });

  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('rejette lorsque la quantite recu depasse le commande', async () => {
    const prisma = createPrismaStub();
    const service = new PurchasesService(prisma as any, createAuditStub() as any);

    await expect(
      service.receive(
        purchaseOrder.id,
        [
          {
            variationId: 'var-1',
            quantity: 2,
          },
        ],
        user,
      ),
    ).rejects.toThrowError(new BadRequestException('Depassement de la quantite commandee.'));
  });

  it('met a jour les quantites et le statut lorsque la reception est validee', async () => {
    const poItemUpdate = vi.fn();
    const poFindMany = vi.fn().mockResolvedValue([{ quantity: 3, receivedQuantity: 3 }]);
    const stockUpdate = vi.fn();
    const poUpdate = vi.fn();
    const stockFindUnique = vi.fn().mockResolvedValue({ id: 'stock-1', quantity: 2 });

    const prisma = {
      $transaction: vi.fn(async (fn: any) =>
        fn({
          purchaseOrder: {
            findUnique: vi.fn().mockResolvedValue(purchaseOrder),
            update: poUpdate,
          },
          purchaseOrderItem: {
            update: poItemUpdate,
            findMany: poFindMany,
          },
          productStock: {
            findUnique: stockFindUnique,
            update: stockUpdate,
            create: vi.fn(),
          },
        }),
      ),
    };

    const service = new PurchasesService(prisma as any, createAuditStub() as any);

    await service.receive(
      purchaseOrder.id,
      [
        {
          variationId: 'var-1',
          quantity: 1,
        },
      ],
      user,
    );

    expect(poItemUpdate).toHaveBeenCalledWith({
      where: { id: 'poi-1' },
      data: { receivedQuantity: 3 },
    });
    expect(stockFindUnique).toHaveBeenCalledWith({
      where: { storeId_variationId: { storeId: purchaseOrder.storeId, variationId: 'var-1' } },
    });
    expect(stockUpdate).toHaveBeenCalledWith({
      where: { id: 'stock-1' },
      data: { quantity: 3 },
    });
    expect(poUpdate).toHaveBeenCalledWith({
      where: { id: purchaseOrder.id },
      data: { status: 'RECEIVED' },
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
