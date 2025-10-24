import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { SearchService } from './search.service.js';

@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  global(@Req() req: any, @Query('term') term: string) { return this.service.global(term, req.user); }
}
