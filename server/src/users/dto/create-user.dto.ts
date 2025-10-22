import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  username!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsArray()
  roleIds?: string[];
}

