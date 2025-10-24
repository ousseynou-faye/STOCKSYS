import { IsArray, IsInt, IsNotEmpty, IsPositive, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ReturnItemDto {
  @IsString()
  @IsNotEmpty()
  variationId!: string;

  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class ReturnSaleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];
}

