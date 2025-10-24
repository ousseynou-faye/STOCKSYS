import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async global(term: string, user?: any) {
    const lower = term?.toLowerCase() || '';
    const whereStoreScoped = (!((user?.permissions || []).includes('MANAGE_ROLES')) && user?.storeId) ? { storeId: user.storeId } : {};
    const [products, variations, sales, suppliers] = await Promise.all([
      // Produits visibles: ceux ayant du stock dans la boutique (si scope)
      this.prisma.product.findMany({
        where: {
          name: { contains: lower, mode: 'insensitive' },
          ...(whereStoreScoped && user?.storeId ? { variations: { some: { stocks: { some: { storeId: user.storeId } } } } } : {}),
        },
      }),
      this.prisma.productVariation.findMany({
        where: {
          sku: { contains: lower, mode: 'insensitive' },
          ...(whereStoreScoped && user?.storeId ? { stocks: { some: { storeId: user.storeId } } } : {}),
        },
      }),
      this.prisma.sale.findMany({ where: { id: { contains: term }, ...(whereStoreScoped as any) }, take: 20, orderBy: { createdAt: 'desc' } }),
      this.prisma.supplier.findMany({ where: { name: { contains: lower, mode: 'insensitive' } } }),
    ]);
    return { products: [...products, ...variations], sales, suppliers };
  }
}
