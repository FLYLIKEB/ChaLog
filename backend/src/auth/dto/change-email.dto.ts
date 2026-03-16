import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ChangeEmailRequestDto {
  @IsEmail()
  newEmail: string;
}

export class ChangeEmailConfirmDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}
