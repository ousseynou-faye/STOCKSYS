import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiNoContentResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt.guard.js";
import { PermissionsGuard } from "../common/guards/permissions.guard.js";
import { RequirePermissions } from "../common/decorators/permissions.decorator.js";
import { CategoriesService } from "./categories.service.js";
import { CreateCategoryDto } from "./dto/create-category.dto.js";
import { UpdateCategoryDto } from "./dto/update-category.dto.js";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @RequirePermissions('VIEW_CATEGORIES')
  @Get()
  @ApiOkResponse({ description: 'Liste des catégories', schema: { example: { data: [{ id: 'cat_1', name: 'Câbles' }], meta: { page: 1, limit: 20, total: 2 } } } })
  findAll(@Query() q: any) { return this.service.findAll(q); }

  @RequirePermissions('MANAGE_CATEGORIES')
  @Post()
  @ApiBody({ type: CreateCategoryDto, examples: { create: { value: { name: 'Nouveauté' } } } })
  create(@Body() body: CreateCategoryDto) { return this.service.create(body); }

  @RequirePermissions('MANAGE_CATEGORIES')
  @Patch(':id')
  @ApiBody({ type: UpdateCategoryDto, examples: { update: { value: { name: 'Nouveau nom' } } } })
  update(@Param('id') id: string, @Body() body: UpdateCategoryDto) { return this.service.update(id, body); }

  @RequirePermissions('MANAGE_CATEGORIES')
  @Delete(':id')
  @ApiNoContentResponse({ description: 'Supprimé' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
