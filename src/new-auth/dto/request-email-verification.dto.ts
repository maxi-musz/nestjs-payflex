import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestEmailVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
