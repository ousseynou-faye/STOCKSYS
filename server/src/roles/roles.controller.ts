import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { RolesService } from './roles.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @RequirePermissions('VIEW_ROLES')
  @Get()
  @ApiOkResponse({ description: 'Liste des rôles', schema: { example: { data: [{ id: 'role_admin', name: 'Administrateur', permissions: ['VIEW_USERS'] }], meta: { page: 1, limit: 20, total: 1 } } } })
  findAll(@Query() q: any) { return this.service.findAll(q); }

  @RequirePermissions('MANAGE_ROLES')
  @Post()
  @ApiBody({ type: CreateRoleDto, examples: { create: { value: { name: 'Auditeur', permissions: ['VIEW_REPORTS'] } } } })
  create(@Body() body: CreateRoleDto) { return this.service.create(body); }

  @RequirePermissions('MANAGE_ROLES')
  @Patch(':id')
  @ApiBody({ type: UpdateRoleDto, examples: { update: { value: { permissions: ['VIEW_REPORTS','VIEW_AUDIT_LOG'] } } } })
  update(@Param('id') id: string, @Body() body: UpdateRoleDto) { return this.service.update(id, body); }

  @RequirePermissions('MANAGE_ROLES')
  @Delete(':id')
  @ApiNoContentResponse({ description: 'SupprimÃ©' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}





