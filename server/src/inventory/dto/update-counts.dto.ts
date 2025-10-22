import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CountItemDto {
  @IsString() @IsNotEmpty() variationId!: string;
  @IsInt() @Min(0) countedQuantity!: number;
}

export class UpdateCountsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CountItemDto) items!: CountItemDto[];
  @IsOptional() @IsBoolean() finalize?: boolean;
}

