import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiNoContentResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt.guard.js";
import { PermissionsGuard } from "../common/guards/permissions.guard.js";
import { RequirePermissions } from "../common/decorators/permissions.decorator.js";
import { StoresService } from "./stores.service.js";
import { CreateStoreDto } from "./dto/create-store.dto.js";
import { UpdateStoreDto } from "./dto/update-store.dto.js";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly service: StoresService) {}

  @RequirePermissions('VIEW_STORES')
  @Get()
  @ApiOkResponse({ description: 'Liste des boutiques', schema: { example: { data: [{ id: 'store_1', name: 'Boutique Principale' }], meta: { page: 1, limit: 20, total: 2 } } } })
  findAll(@Query() q: any) { return this.service.findAll(q); }

  @RequirePermissions('MANAGE_STORES')
  @Post()
  @ApiBody({ type: CreateStoreDto, examples: { create: { value: { name: 'Nouvelle Boutique' } } } })
  create(@Body() body: CreateStoreDto) { return this.service.create(body); }

  @RequirePermissions('MANAGE_STORES')
  @Patch(':id')
  @ApiBody({ type: UpdateStoreDto, examples: { update: { value: { name: 'Nom mis à jour' } } } })
  update(@Param('id') id: string, @Body() body: UpdateStoreDto) { return this.service.update(id, body); }

  @RequirePermissions('MANAGE_STORES')
  @Delete(':id')
  @ApiNoContentResponse({ description: 'Supprimé' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
