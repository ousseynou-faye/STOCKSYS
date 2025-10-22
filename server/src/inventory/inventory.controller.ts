import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { InventoryService } from './inventory.service.js';
import { StartInventoryDto } from './dto/start-inventory.dto.js';
import { UpdateCountsDto } from './dto/update-counts.dto.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory-sessions')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @RequirePermissions('PERFORM_INVENTORY')
  @Get()
  list() { return this.service.list(); }

  @RequirePermissions('PERFORM_INVENTORY')
  @Post()
  start(@Req() req: any, @Body() body: StartInventoryDto) { return this.service.start(body.storeId, req.user); }

  @RequirePermissions('PERFORM_INVENTORY')
  @Patch(':id/items')
  update(@Req() req: any, @Param('id') id: string, @Body() body: UpdateCountsDto) {
    return this.service.updateCounts(id, body.items, !!body.finalize, req.user);
  }

  @RequirePermissions('PERFORM_INVENTORY')
  @Post(':id/confirm')
  confirm(@Req() req: any, @Param('id') id: string) { return this.service.confirm(id, req.user); }
}
