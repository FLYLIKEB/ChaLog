import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(72, { message: '비밀번호는 최대 72자 이하여야 합니다.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: '비밀번호는 영문자와 숫자를 모두 포함해야 합니다.' })
  password: string;
}

