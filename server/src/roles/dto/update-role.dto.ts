import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateRoleDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsArray() permissions?: string[];
}

