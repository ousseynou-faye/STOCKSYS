import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { SalesService } from './sales.service.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @RequirePermissions('VIEW_SALES_HISTORY')
  @Get()
  list(@Query() q: any) { return this.service.list(q); }

  @RequirePermissions('CREATE_SALE')
  @Post()
  create(@Req() req: any, @Body() sale: CreateSaleDto) { return this.service.create(sale, req.user); }

  @RequirePermissions('CREATE_SALE')
  @Post('bulk')
  bulk(@Req() req: any, @Body() body: BulkSalesDto) { return this.service.bulk(body.sales, req.user); }
}
import { CreateSaleDto, BulkSalesDto } from './dto/create-sale.dto.js';
