import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards, Query, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @RequirePermissions('VIEW_STOCK')
  @Get()
  findAll(@Req() req: any, @Query() q: any) { return this.service.findAll(q, req.user); }

  @RequirePermissions('MANAGE_STOCK')
  @Post()
  create(@Body() body: CreateProductDto) { return this.service.create(body); }

  @RequirePermissions('MANAGE_STOCK')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateProductDto) { return this.service.update(id, body); }

  // Bundle components management
  @RequirePermissions('MANAGE_STOCK')
  @Get(':id/bundle-components')
  getBundle(@Param('id') id: string) { return this.service.getBundleComponents(id); }

  @RequirePermissions('MANAGE_STOCK')
  @Put(':id/bundle-components')
  setBundle(@Param('id') id: string, @Body() body: { components: { componentVariationId: string; quantity: number }[] }) {
    return this.service.setBundleComponents(id, Array.isArray(body?.components) ? body.components : []);
  }
}
