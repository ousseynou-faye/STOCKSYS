import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class StartSessionDto {
  @IsString() @IsNotEmpty() userId!: string;
  @IsString() @IsNotEmpty() storeId!: string;
  @IsNumber() @Min(0) openingBalance!: number;
}

