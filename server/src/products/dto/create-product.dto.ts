import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum ProductTypeDto { STANDARD='STANDARD', VARIABLE='VARIABLE', BUNDLE='BUNDLE' }

class VariationDto {
  @IsString() @IsNotEmpty() sku!: string;
  @IsNumber() @Min(0) price!: number;
  @IsOptional() attributes?: Record<string, string>;
}

export class CreateProductDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsEnum(ProductTypeDto) type!: ProductTypeDto;
  @IsString() categoryId!: string;
  @IsNumber() @Min(0) lowStockThreshold!: number;

  @IsOptional() @IsString() sku?: string; // STANDARD/BUNDLE
  @IsOptional() @IsNumber() price?: number; // STANDARD/BUNDLE

  @IsOptional() @IsArray() variations?: VariationDto[]; // VARIABLE
}

