import { Body, Controller, Get, Patch, Post, Req, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { StockService } from './stock.service.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { TransferStockDto } from './dto/transfer-stock.dto.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly service: StockService) {}

  @RequirePermissions('VIEW_STOCK')
  @Get()
  list(@Req() req: any, @Query() q: any) { return this.service.list(q, req.user); }

  @RequirePermissions('MANAGE_STOCK')
  @Patch('adjust')
  adjust(@Req() req: any, @Body() body: AdjustStockDto) { return this.service.adjust(body, req.user); }

  @RequirePermissions('MANAGE_STOCK_TRANSFERS')
  @Post('transfers')
  transfer(@Req() req: any, @Body() body: TransferStockDto) { return this.service.transfer(body, req.user); }
}
