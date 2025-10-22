import { Module } from '@nestjs/common';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';

@Module({ controllers: [SearchController], providers: [SearchService] })
export class SearchModule {}

