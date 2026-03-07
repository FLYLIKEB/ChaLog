import {
  IsNumber,
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateCellarItemDto {
  @IsNumber()
  teaId: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  @IsIn(['g', 'ml', 'bag', 'cake'])
  unit?: string;

  @IsOptional()
  @IsDateString()
  openedAt?: string | null;

  @IsOptional()
  @IsDateString()
  remindAt?: string | null;

  @IsOptional()
  @IsString()
  memo?: string | null;
}
