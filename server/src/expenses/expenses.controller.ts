import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards, Query, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { ExpensesService } from './expenses.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @RequirePermissions('VIEW_EXPENSES')
  @Get()
  list(@Req() req: any, @Query() q: any) { return this.service.list(q, req.user); }

  @RequirePermissions('MANAGE_EXPENSES')
  @Post()
  create(@Body() body: CreateExpenseDto) { return this.service.create(body); }

  @RequirePermissions('MANAGE_EXPENSES')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateExpenseDto) { return this.service.update(id, body); }

  @RequirePermissions('MANAGE_EXPENSES')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}
