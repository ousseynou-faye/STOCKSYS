import { IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TransferItemDto {
  @IsString() @IsNotEmpty() variationId!: string;
  @IsInt() @Min(1) quantity!: number;
}

export class TransferStockDto {
  @IsString() @IsNotEmpty() fromStoreId!: string;
  @IsString() @IsNotEmpty() toStoreId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => TransferItemDto) items!: TransferItemDto[];
}

