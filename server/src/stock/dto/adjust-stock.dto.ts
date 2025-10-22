import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class AdjustStockDto {
  @IsString() @IsNotEmpty() variationId!: string;
  @IsString() @IsNotEmpty() storeId!: string;
  @IsInt() @Min(0) newQuantity!: number;
}

