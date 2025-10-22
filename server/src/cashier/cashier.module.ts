import { Module } from '@nestjs/common';
import { CashierController } from './cashier.controller.js';
import { CashierService } from './cashier.service.js';

@Module({ controllers: [CashierController], providers: [CashierService] })
export class CashierModule {}

