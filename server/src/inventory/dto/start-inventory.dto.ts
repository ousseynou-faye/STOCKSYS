import { IsNotEmpty, IsString } from 'class-validator';

export class StartInventoryDto { @IsString() @IsNotEmpty() storeId!: string; }

