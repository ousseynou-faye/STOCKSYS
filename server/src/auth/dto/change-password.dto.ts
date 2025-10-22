import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString() @IsNotEmpty() currentPass!: string;
  @IsString() @MinLength(6) newPass!: string;
}

