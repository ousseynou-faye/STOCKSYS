import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { AuditService } from './audit.service.js';
import { AuditQueryDto } from './dto/audit-query.dto.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ApiTags('audit-logs')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @RequirePermissions('VIEW_AUDIT_LOG')
  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 15 })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String, description: 'Valeur de AuditActionType' })
  @ApiQuery({ name: 'date', required: false, type: String, description: 'YYYY-MM-DD (UTC)' })
  @ApiOkResponse({ description: 'Liste paginée des logs', schema: { example: { data: [{ id: 'log_1', action: 'USER_LOGIN', details: 'Connexion réussie', username: 'admin', userId: 'user_1', createdAt: '2025-10-13T12:34:56.000Z' }], meta: { total: 42, page: 1, limit: 15 } } } })
  list(@Query() query: AuditQueryDto) { return this.service.list(query); }
}
