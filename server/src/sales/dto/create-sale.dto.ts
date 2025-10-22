import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export enum SaleStatusDto { COMPLETED='COMPLETED', PENDING_SYNC='PENDING_SYNC', RETURNED='RETURNED', PARTIALLY_PAID='PARTIALLY_PAID', UNPAID='UNPAID', PAID='PAID' }
export enum PaymentMethodDto { CASH='CASH', CARD='CARD', MOBILE_MONEY='MOBILE_MONEY' }

class SaleItemDto {
  @IsString() @IsNotEmpty() variationId!: string;
  @IsNumber() @Min(1) quantity!: number;
  @IsNumber() @Min(0) priceAtSale!: number;
}

class PaymentDto {
  @IsEnum(PaymentMethodDto) method!: PaymentMethodDto;
  @IsNumber() @Min(0) amount!: number;
  @IsDateString() createdAt!: string;
}

export class CreateSaleDto {
  @IsString() @IsNotEmpty() id!: string;
  @IsString() @IsNotEmpty() userId!: string;
  @IsString() @IsNotEmpty() storeId!: string;
  @IsArray() items!: SaleItemDto[];
  @IsArray() payments!: PaymentDto[];
  @IsNumber() @Min(0) totalAmount!: number;
  @IsEnum(SaleStatusDto) status!: SaleStatusDto;
  @IsDateString() createdAt!: string;
}

export class BulkSalesDto { sales!: CreateSaleDto[] }

