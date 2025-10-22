import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CloseSessionDto {
  @IsString() @IsNotEmpty() sessionId!: string;
  @IsNumber() closingBalance!: number;
}

