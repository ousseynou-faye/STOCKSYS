import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SuppliersService } from '../server/src/suppliers/suppliers.service.js';

const createPrismaMock = () => {
  const supplierFindUnique = vi.fn();
  const purchaseOrderCount = vi.fn();
  const supplierProductDeleteMany = vi.fn();
  const supplierDelete = vi.fn();

  return {
    prisma: {
      supplier: { findUnique: supplierFindUnique },
      purchaseOrder: { count: purchaseOrderCount },
      $transaction: vi.fn(async (fn: any) =>
        fn({
          supplierProduct: { deleteMany: supplierProductDeleteMany },
          supplier: { delete: supplierDelete },
        }),
      ),
    },
    supplierFindUnique,
    purchaseOrderCount,
    supplierProductDeleteMany,
    supplierDelete,
  };
};

describe('SuppliersService.remove', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when supplier does not exist', async () => {
    const { prisma, supplierFindUnique, purchaseOrderCount } = createPrismaMock();
    supplierFindUnique.mockResolvedValue(null);
    const service = new SuppliersService(prisma as any);

    await expect(service.remove('sup-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(purchaseOrderCount).not.toHaveBeenCalled();
  });

  it('prevents deletion when purchase orders exist', async () => {
    const { prisma, supplierFindUnique, purchaseOrderCount } = createPrismaMock();
    supplierFindUnique.mockResolvedValue({ id: 'sup-1' });
    purchaseOrderCount.mockResolvedValue(3);
    const service = new SuppliersService(prisma as any);

    await expect(service.remove('sup-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('deletes supplier and catalog inside a transaction', async () => {
    const {
      prisma,
      supplierFindUnique,
      purchaseOrderCount,
      supplierProductDeleteMany,
      supplierDelete,
    } = createPrismaMock();
    supplierFindUnique.mockResolvedValue({ id: 'sup-1' });
    purchaseOrderCount.mockResolvedValue(0);
    supplierProductDeleteMany.mockResolvedValue({ count: 2 });
    supplierDelete.mockResolvedValue(undefined);

    const service = new SuppliersService(prisma as any);
    await service.remove('sup-1');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(supplierProductDeleteMany).toHaveBeenCalledWith({ where: { supplierId: 'sup-1' } });
    expect(supplierDelete).toHaveBeenCalledWith({ where: { id: 'sup-1' } });
  });
});
