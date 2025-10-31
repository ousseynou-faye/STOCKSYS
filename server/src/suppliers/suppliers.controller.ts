import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { SuppliersService } from './suppliers.service.js';
import { CreateSupplierDto } from './dto/create-supplier.dto.js';
import { UpdateSupplierDto } from './dto/update-supplier.dto.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}

  @RequirePermissions('VIEW_SUPPLIERS')
  @Get()
  findAll(@Query() q: any) { return this.service.findAll(q); }

  @RequirePermissions('MANAGE_SUPPLIERS')
  @Post()
  create(@Body() body: CreateSupplierDto) { return this.service.create(body); }

  @RequirePermissions('MANAGE_SUPPLIERS')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateSupplierDto) { return this.service.update(id, body); }

  @RequirePermissions('MANAGE_SUPPLIERS')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @RequirePermissions('VIEW_SUPPLIERS')
  @Get(':id/products')
  products(@Param('id') id: string, @Query() q: any) { return this.service.products(id, q); }

  @RequirePermissions('MANAGE_SUPPLIERS')
  @Post(':id/products')
  addProduct(@Param('id') id: string, @Body() body: any) { return this.service.addProduct(id, body); }

  @RequirePermissions('MANAGE_SUPPLIERS')
  @Delete(':id/products/:variationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeProduct(@Param('id') id: string, @Param('variationId') variationId: string) { return this.service.removeProduct(id, variationId); }
}
