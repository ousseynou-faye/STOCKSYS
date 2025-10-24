import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { ReportsService } from './reports.service.js';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('sales')
  sales(@Req() req: any, @Query() q: any) { return this.service.salesReport(q, req.user); }

  @Get('stock-valuation')
  stockValuation(@Req() req: any, @Query('storeId') storeId?: string) { return this.service.stockValuationReport(storeId || '', req.user); }

  @Get('profitability')
  profitability(@Req() req: any, @Query() q: any) { return this.service.profitabilityReport(q, req.user); }

  @Get('expenses')
  expenses(@Req() req: any, @Query() q: any) { return this.service.expensesReport(q, req.user); }

  @Get('top-products')
  topProducts(@Req() req: any, @Query() q: any) { return this.service.topProductsReport(q, req.user); }

  @Get('top-variations')
  topVariations(@Req() req: any, @Query() q: any) { return this.service.topVariationsReport(q, req.user); }
}
