<<<<<<< HEAD
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
=======
import { IsNotEmpty, IsString } from 'class-validator';
>>>>>>> 7884868 (STOCKSYS)

export class CompanyInfoDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() address!: string;
  @IsString() @IsNotEmpty() taxNumber!: string;
  @IsString() logoUrl!: string; // Optional in UI
}
<<<<<<< HEAD

=======
>>>>>>> 7884868 (STOCKSYS)
