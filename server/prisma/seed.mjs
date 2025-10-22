import { PrismaClient } from '@prisma/client';
// Ensure DATABASE_URL is available when running `node prisma/seed.mjs` from server/
import { config as loadEnv } from 'dotenv';
try { loadEnv({ path: '../../prisma/.env' }); } catch {}
try { loadEnv({ path: '../.env' }); } catch {}
try { loadEnv({ path: '../../.env' }); } catch {}
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERM = {
  // Sales
  CREATE_SALE: 'CREATE_SALE',
  VIEW_SALES_HISTORY: 'VIEW_SALES_HISTORY',
  MANAGE_RETURNS: 'MANAGE_RETURNS',
  // Stock
  VIEW_STOCK: 'VIEW_STOCK',
  MANAGE_STOCK: 'MANAGE_STOCK',
  PERFORM_INVENTORY: 'PERFORM_INVENTORY',
  MANAGE_STOCK_TRANSFERS: 'MANAGE_STOCK_TRANSFERS',
  // Purchases
  VIEW_PURCHASES: 'VIEW_PURCHASES',
  CREATE_PURCHASE_ORDER: 'CREATE_PURCHASE_ORDER',
  MANAGE_PURCHASE_ORDERS: 'MANAGE_PURCHASE_ORDERS',
  // Suppliers
  VIEW_SUPPLIERS: 'VIEW_SUPPLIERS',
  MANAGE_SUPPLIERS: 'MANAGE_SUPPLIERS',
  // Expenses
  VIEW_EXPENSES: 'VIEW_EXPENSES',
  MANAGE_EXPENSES: 'MANAGE_EXPENSES',
  // Reports
  VIEW_REPORTS: 'VIEW_REPORTS',
  // Users & Roles
  VIEW_USERS: 'VIEW_USERS',
  MANAGE_USERS: 'MANAGE_USERS',
  VIEW_ROLES: 'VIEW_ROLES',
  MANAGE_ROLES: 'MANAGE_ROLES',
  // Settings
  VIEW_CATEGORIES: 'VIEW_CATEGORIES',
  MANAGE_CATEGORIES: 'MANAGE_CATEGORIES',
  VIEW_STORES: 'VIEW_STORES',
  MANAGE_STORES: 'MANAGE_STORES',
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  // Dashboard
  VIEW_DASHBOARD_STATS: 'VIEW_DASHBOARD_STATS',
  VIEW_DASHBOARD_CASHIER: 'VIEW_DASHBOARD_CASHIER',
  // Audit
  VIEW_AUDIT_LOG: 'VIEW_AUDIT_LOG',
  // Cashier
  MANAGE_CASHIER_SESSIONS: 'MANAGE_CASHIER_SESSIONS',
};

const SEED_MODE = process.env.SEED_MODE || 'demo'; // 'demo' | 'minimal'

async function main() {
  console.log('Seeding... mode =', SEED_MODE);

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.productStock.deleteMany();
  await prisma.supplierProduct.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.expense.deleteMany();
  // Sessions & settings & inventory must be cleared before users/stores
  await prisma.cashierSession.deleteMany();
  await prisma.inventoryCountItem.deleteMany();
  await prisma.inventorySession.deleteMany();
  await prisma.setting.deleteMany();
  // Suppliers after POs and supplierProducts are gone
  await prisma.supplier.deleteMany();
  // Supprimer d'abord les composants de bundles (FK vers ProductVariation et Product)
  await prisma.bundleComponent.deleteMany();
  await prisma.productVariation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.store.deleteMany();

  // Minimal baseline: only roles + admin user, no demo catalogue/stores
  if (SEED_MODE === 'minimal') {
    const allPerms = Object.values(PERM);
    const roleAdmin = await prisma.role.create({ data: { name: 'Administrateur', permissions: allPerms } });
    const pass = await bcrypt.hash('password123', 8);
    await prisma.user.create({ data: { username: 'admin', passwordHash: pass, roles: { connect: [{ id: roleAdmin.id }] } } });
    console.log('Minimal seed complete (admin/password123).');
    return;
  }

  const stores = await prisma.$transaction([
    prisma.store.create({ data: { name: 'Boutique Principale (Abidjan)' } }),
    prisma.store.create({ data: { name: 'Entrepôt (Yamoussoukro)' } }),
  ]);

  const allPerms = Object.values(PERM);
  const roleAdmin = await prisma.role.create({ data: { name: 'Administrateur', permissions: allPerms } });
  const roleManager = await prisma.role.create({
    data: {
      name: 'Manager',
      permissions: [
        PERM.VIEW_DASHBOARD_STATS, PERM.CREATE_SALE, PERM.VIEW_SALES_HISTORY,
        PERM.VIEW_STOCK, PERM.MANAGE_STOCK, PERM.MANAGE_STOCK_TRANSFERS, PERM.PERFORM_INVENTORY,
        PERM.VIEW_PURCHASES, PERM.CREATE_PURCHASE_ORDER, PERM.MANAGE_PURCHASE_ORDERS,
        PERM.VIEW_SUPPLIERS, PERM.MANAGE_SUPPLIERS, PERM.VIEW_EXPENSES, PERM.MANAGE_EXPENSES,
        PERM.VIEW_REPORTS,
        // Stores visibility for filters/transfers
        PERM.VIEW_STORES,
        // Basic user visibility (for reports filters)
        PERM.VIEW_USERS,
        // Cashier operations
        PERM.MANAGE_CASHIER_SESSIONS,
      ],
    },
  });
  const roleCashier = await prisma.role.create({
    data: {
      name: 'Caissier',
      permissions: [PERM.VIEW_DASHBOARD_CASHIER, PERM.CREATE_SALE, PERM.VIEW_SALES_HISTORY, PERM.VIEW_STOCK, PERM.MANAGE_CASHIER_SESSIONS],
    },
  });

  const pass = await bcrypt.hash('password123', 8);
  const [uAdmin, uManager, uCashier1, uCashier2] = await prisma.$transaction([
    prisma.user.create({ data: { username: 'admin', passwordHash: pass, roles: { connect: [{ id: roleAdmin.id }] } } }),
    prisma.user.create({ data: { username: 'manager1', passwordHash: pass, storeId: stores[0].id, roles: { connect: [{ id: roleManager.id }] } } }),
    prisma.user.create({ data: { username: 'cashier1', passwordHash: pass, storeId: stores[0].id, roles: { connect: [{ id: roleCashier.id }] } } }),
    prisma.user.create({ data: { username: 'cashier2', passwordHash: pass, storeId: stores[1].id, roles: { connect: [{ id: roleCashier.id }] } } }),
  ]);

  const categories = await prisma.$transaction([
    prisma.category.create({ data: { name: 'Câbles' } }),
    prisma.category.create({ data: { name: 'Accessoires' } }),
  ]);

  const prodCable = await prisma.product.create({
    data: {
      name: 'Câble HDMI',
      type: 'VARIABLE',
      lowStockThreshold: 10,
      categoryId: categories[0].id,
      variations: {
        create: [
          { sku: 'HDMI-1M', price: 2000, attributes: { Longueur: '1m' } },
          { sku: 'HDMI-2M', price: 3000, attributes: { Longueur: '2m' } },
        ],
      },
    },
    include: { variations: true },
  });

  const prodPack = await prisma.product.create({
    data: {
      name: 'Pack Écran + Câble',
      type: 'BUNDLE',
      lowStockThreshold: 5,
      categoryId: categories[1].id,
      variations: { create: [{ sku: 'BUNDLE-001', price: 50000, attributes: {} }] },
    },
    include: { variations: true },
  });

  // Bundle components: use HDMI-2M as component for example
  await prisma.bundleComponent.create({
    data: {
      bundleProductId: prodPack.id,
      componentVariationId: prodCable.variations[1].id,
      quantity: 1,
    },
  });

  // Stock per store
  await prisma.$transaction([
    prisma.productStock.create({ data: { storeId: stores[0].id, variationId: prodCable.variations[0].id, quantity: 100 } }),
    prisma.productStock.create({ data: { storeId: stores[0].id, variationId: prodCable.variations[1].id, quantity: 100 } }),
    prisma.productStock.create({ data: { storeId: stores[0].id, variationId: prodPack.variations[0].id, quantity: 20 } }),
    prisma.productStock.create({ data: { storeId: stores[1].id, variationId: prodCable.variations[0].id, quantity: 80 } }),
    prisma.productStock.create({ data: { storeId: stores[1].id, variationId: prodCable.variations[1].id, quantity: 80 } }),
  ]);

  // Suppliers and catalogue
  const supplier = await prisma.supplier.create({ data: { name: 'Fournitech SARL', email: 'contact@fournitech.ci', phone: '+225 01020304', address: 'Abidjan, Plateau' } });
  await prisma.supplierProduct.createMany({ data: [
    { supplierId: supplier.id, variationId: prodCable.variations[0].id, purchasePrice: 1500, supplierSku: 'FT-HDMI-1M' },
    { supplierId: supplier.id, variationId: prodCable.variations[1].id, purchasePrice: 2200, supplierSku: 'FT-HDMI-2M' },
  ]});

  // Purchase orders demo
  const po = await prisma.purchaseOrder.create({ data: {
    supplierId: supplier.id,
    storeId: stores[0].id,
    status: 'ORDERED',
    totalAmount: 0,
    createdById: uManager.id,
    items: { create: [
      { variationId: prodCable.variations[1].id, quantity: 20, price: 2200 },
    ] },
  }, include: { items: true } });

  // Expenses demo
  await prisma.expense.createMany({ data: [
    { userId: uManager.id, storeId: stores[0].id, category: 'Loyer', description: 'Loyer mensuel', amount: 200000, createdAt: new Date() },
    { userId: uManager.id, storeId: stores[0].id, category: 'Salaires', description: 'Salaires du mois', amount: 500000, createdAt: new Date() },
  ]});

  console.log('Seed complete');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
