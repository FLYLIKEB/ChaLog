import { IsString, IsNotEmpty } from 'class-validator';

export class KakaoLoginDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}

