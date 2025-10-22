import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { ReportsService } from './reports.service.js';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('sales')
  sales(@Query() q: any) { return this.service.salesReport(q); }

  @Get('stock-valuation')
  stockValuation(@Query('storeId') storeId?: string) { return this.service.stockValuationReport(storeId || ''); }

  @Get('profitability')
  profitability(@Query() q: any) { return this.service.profitabilityReport(q); }

  @Get('expenses')
  expenses(@Query() q: any) { return this.service.expensesReport(q); }

  @Get('top-products')
  topProducts(@Query() q: any) { return this.service.topProductsReport(q); }

  @Get('top-variations')
  topVariations(@Query() q: any) { return this.service.topVariationsReport(q); }
}
