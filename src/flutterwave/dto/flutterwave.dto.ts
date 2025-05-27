import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class VerifyBvnDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(11)
  bvn: string;
}