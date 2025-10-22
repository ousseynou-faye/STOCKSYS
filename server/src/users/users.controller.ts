import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @RequirePermissions('VIEW_USERS')
  @Get()
  @ApiOkResponse({ description: 'Liste utilisateurs', schema: { example: { data: [{ id: 'user_admin', username: 'admin', roleIds: ['role_admin'] }] } } })
  findAll(@Query() q: any) { return this.service.findAll(q); }

  @RequirePermissions('MANAGE_USERS')
  @Post()
  @ApiBody({ type: CreateUserDto, examples: { create: { value: { username: 'john', password: 'secret123', roleIds: ['role_cashier'], storeId: null } } } })
  create(@Body() body: CreateUserDto) { return this.service.create(body); }

  @RequirePermissions('MANAGE_USERS')
  @Patch(':id')
  @ApiBody({ type: UpdateUserDto, examples: { update: { value: { storeId: 'store_1', roleIds: ['role_manager'] } } } })
  update(@Param('id') id: string, @Body() body: UpdateUserDto) { return this.service.update(id, body); }

  @RequirePermissions('MANAGE_USERS')
  @Delete(':id')
  @ApiNoContentResponse({ description: 'Supprimé' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
