import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FR } from '../common/i18n/fr.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(q?: any, user?: any) {
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
    // Scoping: si pas MANAGE_ROLES, ne retourner que les produits ayant du stock dans la boutique de l'utilisateur
    if (!((user?.permissions || []).includes('MANAGE_ROLES')) && user?.storeId) {
      where.variations = { some: { stocks: { some: { storeId: user.storeId } } } } as any;
    }
    const total = await this.prisma.product.count({ where });
    const data = await this.prisma.product.findMany({ where, include: { variations: true, bundleComponents: true }, orderBy, skip, take: limit });
    return { data, meta: { page, limit, total } };
  }
  async create(data: any) {
    try {
      if (data?.type === 'STANDARD') {
        const sku = data?.sku || `SKU-${Date.now()}`;
        const price = Number(data?.price ?? 0);
        // Create product and ensure a default variation exists for sales/stock flows
        return await this.prisma.product.create({
          data: {
            name: data.name,
            type: 'STANDARD',
            lowStockThreshold: Number(data.lowStockThreshold ?? 0),
            categoryId: data.categoryId,
            sku,
            price,
            variations: { create: [{ sku, price, attributes: {} }] },
          },
          include: { variations: true, bundleComponents: true },
        });
      }
      return await this.prisma.product.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new BadRequestException('SKU deja utilise.');
        if (error.code === 'P2003') throw new BadRequestException('Categorie ou reference invalide.');
      }
      throw error;
    }
  }
  async update(id: string, data: any) {
    const exists = await this.prisma.product.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(FR.ERR_PRODUCT_NOT_FOUND);
    let updated;
    try {
      updated = await this.prisma.product.update({ where: { id }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new BadRequestException('SKU deja utilise.');
        if (error.code === 'P2003') throw new BadRequestException('Categorie ou reference invalide.');
      }
      throw error;
    }
    // Keep default variation in sync for STANDARD products
    if ((updated as any).type === 'STANDARD') {
      const sku = data?.sku;
      const price = data?.price;
      if (sku !== undefined || price !== undefined) {
        const vars = await this.prisma.productVariation.findMany({ where: { productId: id }, orderBy: { createdAt: 'asc' } });
        if (vars.length === 0) {
          await this.prisma.productVariation.create({ data: { productId: id, sku: sku || `SKU-${Date.now()}`, price: Number(price ?? 0), attributes: {} } });
        } else {
          const patch: any = {};
          if (sku !== undefined) patch.sku = sku;
          if (price !== undefined) patch.price = Number(price);
          if (Object.keys(patch).length > 0) await this.prisma.productVariation.update({ where: { id: vars[0].id }, data: patch });
        }
      }
    }
    return this.prisma.product.findUnique({ where: { id }, include: { variations: true, bundleComponents: true } });
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
