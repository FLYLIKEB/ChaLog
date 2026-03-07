import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AppleLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @IsString()
  @IsOptional()
  name?: string;
}
