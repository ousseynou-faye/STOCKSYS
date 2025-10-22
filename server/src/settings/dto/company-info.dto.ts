import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CompanyInfoDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() address!: string;
  @IsString() @IsNotEmpty() taxNumber!: string;
  @IsString() logoUrl!: string; // Optional in UI
}

