import { IsString, IsOptional, IsNumber, Min, IsIn } from 'class-validator';

// 허용된 차 종류 목록 (6대다류 순서)
export const ALLOWED_TEA_TYPES = ['녹차', '백차', '황차', '우롱차', '홍차', '흑차', '보이차', '대용차'] as const;

export class CreateTeaDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(1900)
  year?: number;

  @IsString()
  @IsIn(ALLOWED_TEA_TYPES, { message: '차 종류는 다음 중 하나여야 합니다: 녹차, 백차, 황차, 우롱차, 홍차, 흑차, 보이차, 대용차' })
  type: string;

  @IsOptional()
  @IsNumber()
  sellerId?: number | null;

  /** sellerId가 없을 때 찻집 이름으로 찾거나 생성. sellerId 우선 */
  @IsOptional()
  @IsString()
  seller?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;
}

