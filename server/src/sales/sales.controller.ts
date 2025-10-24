import { Body, Controller, Get, Post, Query, Req, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { SalesService } from './sales.service.js';
import { ReturnSaleDto } from './dto/return-sale.dto.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @RequirePermissions('VIEW_SALES_HISTORY')
  @Get()
  list(@Req() req: any, @Query() q: any) { return this.service.list(q, req.user); }

  @RequirePermissions('CREATE_SALE')
  @Post()
  create(@Req() req: any, @Body() sale: CreateSaleDto) { return this.service.create(sale, req.user); }

  @RequirePermissions('CREATE_SALE')
  @Post('bulk')
  bulk(@Req() req: any, @Body() body: BulkSalesDto) { return this.service.bulk(body.sales, req.user); }

  @RequirePermissions('MANAGE_RETURNS')
  @Post(':id/returns')
  returnItems(@Req() req: any, @Param('id') id: string, @Body() body: ReturnSaleDto) {
    return this.service.returnItems(id, body.items, req.user);
  }
}
import { CreateSaleDto, BulkSalesDto } from './dto/create-sale.dto.js';
