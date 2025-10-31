import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { FR } from "../common/i18n/fr.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll(q?: any) {
    const page = Math.max(parseInt(q?.page ?? "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? "20", 10) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const sort = (q?.sort as string) || "name";
    const orderBy = Array.isArray(sort)
      ? (sort as any[]).map((s: any) => (s.startsWith("-") ? { [s.slice(1)]: "desc" } : { [s]: "asc" }))
      : sort.startsWith("-")
      ? { [sort.slice(1)]: "desc" }
      : { [sort]: "asc" };
    const where: any = {};
    if (q?.name) where.name = { contains: q.name, mode: "insensitive" };
    const total = await this.prisma.supplier.count({ where });
    const data = await this.prisma.supplier.findMany({ where, orderBy, skip, take: limit });
    return { data, meta: { page, limit, total } };
  }

  async create(data: any) {
    const name = (data?.name ?? "").toString().trim();
    if (!name) throw new BadRequestException("Le nom du fournisseur est requis.");
    const payload: any = Object.fromEntries(
      Object.entries({
        name,
        contactPerson: data?.contactPerson,
        phone: data?.phone,
        email: data?.email,
        address: data?.address,
        paymentTerms: data?.paymentTerms,
      }).filter(([, v]) => v !== undefined && v !== null && (typeof v !== "string" || v.trim() !== ""))
    );
    try {
      return await this.prisma.supplier.create({ data: payload });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") throw new BadRequestException("Contrainte d'unicité violée.");
      }
      if ((e as any)?.name === "PrismaClientValidationError") {
        throw new BadRequestException("Données fournisseur invalides.");
      }
      throw e;
    }
  }

  async update(id: string, data: any) {
    const exists = await this.prisma.supplier.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(FR.ERR_SUPPLIER_NOT_FOUND);
    const payload: any = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.contactPerson !== undefined ? { contactPerson: data.contactPerson } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.address !== undefined ? { address: data.address } : {}),
      ...(data.paymentTerms !== undefined ? { paymentTerms: data.paymentTerms } : {}),
    };
    return this.prisma.supplier.update({ where: { id }, data: payload });
  }

  async products(supplierId: string, q?: any) {
    const page = Math.max(parseInt(q?.page ?? "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q?.limit ?? "10", 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const sort = (q?.sort as string) || "createdAt";
    const orderBy = Array.isArray(sort)
      ? (sort as any[]).map((s: any) => (s.startsWith("-") ? { [s.slice(1)]: "desc" } : { [s]: "asc" }))
      : sort.startsWith("-")
      ? { [sort.slice(1)]: "desc" }
      : { [sort]: "asc" };
    const where: any = { supplierId };
    const total = await this.prisma.supplierProduct.count({ where });
    const data = await this.prisma.supplierProduct.findMany({ where, orderBy, skip, take: limit });
    return { data, meta: { page, limit, total } };
  }

  addProduct(supplierId: string, data: any) {
    return this.prisma.supplierProduct.create({
      data: {
        supplierId,
        variationId: data.variationId,
        purchasePrice: data.purchasePrice,
        supplierSku: data.supplierSku,
      },
    });
  }

  async removeProduct(supplierId: string, variationId: string) {
    await this.prisma.supplierProduct.delete({ where: { supplierId_variationId: { supplierId, variationId } } });
    return { success: true };
  }

  async remove(id: string): Promise<void> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException(FR.ERR_SUPPLIER_NOT_FOUND);

    const linkedOrders = await this.prisma.purchaseOrder.count({ where: { supplierId: id } });
    if (linkedOrders > 0) {
      throw new BadRequestException("Impossible de supprimer un fournisseur lie a des commandes d'achat.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.supplierProduct.deleteMany({ where: { supplierId: id } });
      await tx.supplier.delete({ where: { id } });
    });
  }
}
