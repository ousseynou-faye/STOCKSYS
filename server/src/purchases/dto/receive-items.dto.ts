import { IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ReceiveItemDto {
  @IsString() @IsNotEmpty() variationId!: string;
  @IsInt() @Min(1) quantity!: number;
}

export class ReceiveItemsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReceiveItemDto) items!: ReceiveItemDto[];
}

