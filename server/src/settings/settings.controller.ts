import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { PermissionsGuard } from '../common/guards/permissions.guard.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { SettingsService } from './settings.service.js';
import { CompanyInfoDto } from './dto/company-info.dto.js';
import { AppSettingsDto } from './dto/app-settings.dto.js';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @RequirePermissions('MANAGE_SETTINGS')
  @Get('company')
  company() { return this.service.company(); }

  @RequirePermissions('MANAGE_SETTINGS')
  @Put('company')
  updateCompany(@Body() body: CompanyInfoDto) { return this.service.updateCompany(body); }

  @RequirePermissions('MANAGE_SETTINGS')
  @Get('app')
  app() { return this.service.app(); }

  @RequirePermissions('MANAGE_SETTINGS')
  @Put('app')
  updateApp(@Body() body: AppSettingsDto) { return this.service.updateApp(body); }
}
