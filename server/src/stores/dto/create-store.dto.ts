import { IsString } from 'class-validator';

export class CreateStoreDto { @IsString() name!: string; }

