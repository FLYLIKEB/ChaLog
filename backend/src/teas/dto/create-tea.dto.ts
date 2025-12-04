import { IsString, IsOptional, IsNumber, Min, IsIn } from 'class-validator';

// 허용된 차 종류 목록
export const ALLOWED_TEA_TYPES = ['녹차', '홍차', '우롱차', '백차', '흑차', '대용차', '황차', '보이차'] as const;

export class CreateTeaDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(1900)
  year?: number;

  @IsString()
  @IsIn(ALLOWED_TEA_TYPES, { message: '차 종류는 다음 중 하나여야 합니다: 녹차, 홍차, 우롱차, 백차, 흑차, 대용차, 황차, 보이차' })
  type: string;

  @IsOptional()
  @IsString()
  seller?: string;

  @IsOptional()
  @IsString()
  origin?: string;
}

