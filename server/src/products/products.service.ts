import { Injectable, NotFoundException } from '@nestjs/common';
import { FR } from '../common/i18n/fr.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(q?: any) {
    const page = Math.max(parseInt(q?.page ?? '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? '20', 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const sort = (q?.sort as string) || 'createdAt';
    const orderBy = Array.isArray(sort)
      ? (sort as any[]).map((s: any) => (s.startsWith('-') ? { [s.slice(1)]: 'desc' } : { [s]: 'asc' }))
      : (sort.startsWith('-') ? { [sort.slice(1)]: 'desc' } : { [sort]: 'asc' });
    const where: any = {};
    if (q?.name) where.name = { contains: q.name, mode: 'insensitive' };
    if (q?.categoryId) where.categoryId = q.categoryId;
    const total = await this.prisma.product.count({ where });
    const data = await this.prisma.product.findMany({ where, include: { variations: true, bundleComponents: true }, orderBy, skip, take: limit });
    return { data, meta: { page, limit, total } };
  }
  create(data: any) { return this.prisma.product.create({ data }); }
  async update(id: string, data: any) {
    const exists = await this.prisma.product.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(FR.ERR_PRODUCT_NOT_FOUND);
    return this.prisma.product.update({ where: { id }, data });
  }

  // ==========================
  // Bundle components helpers
  // ==========================
  async getBundleComponents(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(FR.ERR_PRODUCT_NOT_FOUND);
    const list = await this.prisma.bundleComponent.findMany({ where: { bundleProductId: productId } });
    return list;
  }

  async setBundleComponents(productId: string, components: { componentVariationId: string; quantity: number }[]) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(FR.ERR_PRODUCT_NOT_FOUND);
    await this.prisma.$transaction(async (tx) => {
      await tx.bundleComponent.deleteMany({ where: { bundleProductId: productId } });
      if (Array.isArray(components) && components.length > 0) {
        const data = components
          .filter((c) => c && c.componentVariationId && typeof c.quantity === 'number' && c.quantity > 0)
          .map((c) => ({ bundleProductId: productId, componentVariationId: c.componentVariationId, quantity: c.quantity }));
        if (data.length > 0) await tx.bundleComponent.createMany({ data, skipDuplicates: true });
      }
    });
    return { success: true };
  }
}
