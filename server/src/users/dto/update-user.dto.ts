import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() @IsString() username?: string;
  @IsOptional() @IsString() storeId?: string;
  @IsOptional() @IsArray() roleIds?: string[];
  @IsOptional() @IsString() profilePictureUrl?: string;
}

