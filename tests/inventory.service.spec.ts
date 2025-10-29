import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { InventoryService } from '../server/src/inventory/inventory.service.js';

const createAuditStub = () => ({
  audit: vi.fn().mockResolvedValue(undefined),
});

describe('InventoryService', () => {
  it('refuse la mise a jour des comptages pour une autre boutique', async () => {
    const prisma = {
      inventorySession: {
        findUnique: vi.fn().mockResolvedValue({ id: 'sess-1', storeId: 'store-2' }),
      },
      inventoryCountItem: {
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    const service = new InventoryService(prisma as any, createAuditStub() as any);

    await expect(
      service.updateCounts(
        'sess-1',
        [{ variationId: 'var-1', countedQuantity: 10 }],
        false,
        { storeId: 'store-1', permissions: [] },
      ),
    ).rejects.toThrowError(new BadRequestException('Inventaire limite a votre boutique.'));
  });

  it('confirme un inventaire en recalculant les stocks', async () => {
    const session = {
      id: 'sess-1',
      storeId: 'store-1',
      status: 'REVIEW',
      items: [
        { variationId: 'var-1', countedQuantity: 4 },
        { variationId: 'var-2', countedQuantity: 2 },
      ],
    };

    const inventorySessionFindUnique = vi.fn().mockResolvedValue(session);
    const productStockFindMany = vi.fn().mockResolvedValue([
      { variationId: 'var-1', quantity: 3 },
      { variationId: 'var-2', quantity: 5 },
    ]);
    const productStockUpdate = vi.fn();
    const inventorySessionUpdate = vi.fn();

    const prisma = {
      inventorySession: {
        findUnique: inventorySessionFindUnique,
      },
      $transaction: vi.fn(async (fn: any) =>
        fn({
          productStock: {
            findMany: productStockFindMany,
            update: productStockUpdate,
          },
          inventorySession: {
            update: inventorySessionUpdate,
          },
        }),
      ),
    };

    const auditStub = createAuditStub();
    const service = new InventoryService(prisma as any, auditStub as any);

    await service.confirm('sess-1', { storeId: 'store-1', permissions: [] });

    expect(productStockFindMany).toHaveBeenCalledWith({
      where: { storeId: 'store-1', variationId: { in: ['var-1', 'var-2'] } },
    });

    expect(productStockUpdate).toHaveBeenNthCalledWith(1, {
      where: { storeId_variationId: { storeId: 'store-1', variationId: 'var-1' } },
      data: { quantity: 4 },
    });
    expect(productStockUpdate).toHaveBeenNthCalledWith(2, {
      where: { storeId_variationId: { storeId: 'store-1', variationId: 'var-2' } },
      data: { quantity: 2 },
    });
    expect(inventorySessionUpdate).toHaveBeenCalledWith({
      where: { id: 'sess-1' },
      data: { status: 'COMPLETED', completedAt: expect.any(Date) },
    });
    expect(auditStub.audit).toHaveBeenCalledTimes(2);
    const [firstAudit] = (auditStub.audit as any).mock.calls;
    expect(firstAudit[1].details).toContain('Inventaire #');
  });

  it('passe le statut en REVIEW lorsque finalize est true', async () => {
    const prisma = {
      inventorySession: {
        findUnique: vi.fn().mockResolvedValue({ id: 'sess-2', storeId: 'store-1' }),
        update: vi.fn().mockResolvedValue(undefined),
      },
      inventoryCountItem: {
        update: vi.fn(),
      },
      $transaction: vi.fn(async (operations: Promise<any>[]) => {
        await Promise.all(operations);
      }),
    };

    const service = new InventoryService(prisma as any, createAuditStub() as any);

    await service.updateCounts(
      'sess-2',
      [
        { variationId: 'var-1', countedQuantity: 5 },
        { variationId: 'var-2', countedQuantity: 3 },
      ],
      true,
      { storeId: 'store-1', permissions: [] },
    );

    expect(prisma.inventorySession.update).toHaveBeenCalledWith({
      where: { id: 'sess-2' },
      data: { status: 'REVIEW' },
    });
  });

  it('rejette la confirmation si la session nest pas en statut REVIEW', async () => {
    const prisma = {
      inventorySession: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'sess-3',
          storeId: 'store-1',
          status: 'IN_PROGRESS',
          items: [{ variationId: 'var-1', countedQuantity: 5 }],
        }),
      },
    };

    const service = new InventoryService(prisma as any, createAuditStub() as any);

    await expect(service.confirm('sess-3', { storeId: 'store-1', permissions: [] })).rejects.toThrow(
      new BadRequestException("La session d'inventaire doit être en statut 'REVIEW' avant confirmation"),
    );
  });
});
