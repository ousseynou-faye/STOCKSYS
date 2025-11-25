<<<<<<< HEAD
import { Module } from '@nestjs/common';
=======
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
>>>>>>> 7884868 (STOCKSYS)
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { RolesModule } from './roles/roles.module.js';
import { StoresModule } from './stores/stores.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ProductsModule } from './products/products.module.js';
import { StockModule } from './stock/stock.module.js';
import { SalesModule } from './sales/sales.module.js';
import { SuppliersModule } from './suppliers/suppliers.module.js';
import { PurchasesModule } from './purchases/purchases.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { CashierModule } from './cashier/cashier.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AuditModule } from './audit/audit.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { SearchModule } from './search/search.module.js';
import { ReportsModule } from './reports/reports.module.js';
<<<<<<< HEAD
=======
import { RequestContextMiddleware } from './common/middleware/request-context.middleware.js';
>>>>>>> 7884868 (STOCKSYS)

@Module({
  imports: [
    // Load env from server/.env and also fall back to ../prisma/.env or ../.env when running from monorepo root
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../prisma/.env', '../.env'] }),
<<<<<<< HEAD
=======
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
>>>>>>> 7884868 (STOCKSYS)
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    RolesModule,
    StoresModule,
    CategoriesModule,
    ProductsModule,
    StockModule,
    SalesModule,
    SuppliersModule,
    PurchasesModule,
    ExpensesModule,
    InventoryModule,
    CashierModule,
    NotificationsModule,
    AuditModule,
    SettingsModule,
    SearchModule,
    ReportsModule,
  ],
})
<<<<<<< HEAD
export class AppModule {}
=======
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
>>>>>>> 7884868 (STOCKSYS)
