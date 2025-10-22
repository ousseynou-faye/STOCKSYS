import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ProductTypeDto } from './create-product.dto.js';

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(ProductTypeDto) type?: ProductTypeDto;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsNumber() @Min(0) lowStockThreshold?: number;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsArray() variations?: any[];
}

