import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { NotificationsService } from './notifications.service.js';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@Req() req: any) { return this.service.list(req.user); }

  @Post('mark-all-read')
  markAllRead(@Req() req: any) { return this.service.markAllRead(req.user); }
}
