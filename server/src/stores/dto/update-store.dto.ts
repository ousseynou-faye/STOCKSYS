import { IsOptional, IsString } from 'class-validator';

export class UpdateStoreDto { @IsOptional() @IsString() name?: string; }

