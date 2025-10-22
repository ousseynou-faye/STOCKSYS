import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CashierService } from './cashier.service.js';
import { StartSessionDto } from './dto/start-session.dto.js';
import { CloseSessionDto } from './dto/close-session.dto.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('cashier-sessions')
export class CashierController {
  constructor(private readonly service: CashierService) {}

  @RequirePermissions('MANAGE_CASHIER_SESSIONS')
  @Get()
  list(@Query() q: any) { return this.service.list(q); }

  @RequirePermissions('MANAGE_CASHIER_SESSIONS')
  @Get('active')
  active(@Query('userId') userId: string, @Query('storeId') storeId: string) { return this.service.active(userId, storeId); }

  @RequirePermissions('MANAGE_CASHIER_SESSIONS')
  @Post('start')
  start(@Body() body: StartSessionDto) { return this.service.start(body); }

  @RequirePermissions('MANAGE_CASHIER_SESSIONS')
  @Post(':id/close')
  close(@Body() body: CloseSessionDto) { return this.service.close(body.sessionId, body.closingBalance); }

  @RequirePermissions('MANAGE_CASHIER_SESSIONS')
  @Get(':id/summary')
  summary(@Param('id') id: string) { return this.service.liveSummary(id); }
}
