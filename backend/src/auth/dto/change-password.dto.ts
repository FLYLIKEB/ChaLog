import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @Matches(/(?=.*[a-zA-Z])(?=.*[0-9])/, { message: '비밀번호는 영문과 숫자를 포함해야 합니다.' })
  newPassword: string;

  @IsString()
  confirmPassword: string;
}
