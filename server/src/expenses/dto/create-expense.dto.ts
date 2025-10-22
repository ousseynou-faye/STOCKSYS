import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsString() @IsNotEmpty() storeId!: string;
  @IsString() @IsNotEmpty() userId!: string;
  @IsString() @IsNotEmpty() category!: string;
  @IsString() @IsNotEmpty() description!: string;
  @IsNumber() @Min(0) amount!: number;
}

