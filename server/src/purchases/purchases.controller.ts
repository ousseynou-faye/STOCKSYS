import { Body, Controller, Get, Param, Post, Put, Req, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { PurchasesService } from './purchases.service.js';
import { ReceiveItemsDto } from './dto/receive-items.dto.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchase-orders')
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  @RequirePermissions('VIEW_PURCHASES')
  @Get()
  list(@Query() q: any) { return this.service.list(q); }

  @RequirePermissions('CREATE_PURCHASE_ORDER')
  @Post()
  create(@Body() body: any) { return this.service.create(body); }

  @RequirePermissions('MANAGE_PURCHASE_ORDERS')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }

  @RequirePermissions('MANAGE_PURCHASE_ORDERS')
  @Post(':id/receive')
  receive(@Req() req: any, @Param('id') id: string, @Body() body: ReceiveItemsDto) {
    return this.service.receive(id, body.items, req.user);
  }
}
