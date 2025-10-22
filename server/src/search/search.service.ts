import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async global(term: string) {
    const lower = term?.toLowerCase() || '';
    const [products, variations, sales, suppliers] = await Promise.all([
      this.prisma.product.findMany({ where: { name: { contains: lower, mode: 'insensitive' } } }),
      this.prisma.productVariation.findMany({ where: { sku: { contains: lower, mode: 'insensitive' } } }),
      this.prisma.sale.findMany({ where: { id: { contains: term } }, take: 20, orderBy: { createdAt: 'desc' } }),
      this.prisma.supplier.findMany({ where: { name: { contains: lower, mode: 'insensitive' } } }),
    ]);
    return { products: [...products, ...variations], sales, suppliers };
  }
}

