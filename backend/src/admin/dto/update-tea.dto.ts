import { IsString, IsOptional, IsNumber, IsInt, Min, IsIn } from 'class-validator';
import { ALLOWED_TEA_TYPES } from '../../teas/dto/create-tea.dto';

export class UpdateTeaDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(1900)
  year?: number;

  @IsOptional()
  @IsString()
  @IsIn(ALLOWED_TEA_TYPES, {
    message: '차 종류는 다음 중 하나여야 합니다: 녹차, 백차, 황차, 청차/우롱차, 홍차, 흑차/보이차, 대용차',
  })
  type?: string;

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
  @IsInt()
  @Min(0)
  weight?: number;
}
