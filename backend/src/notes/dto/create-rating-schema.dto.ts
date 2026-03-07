import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  MinLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSchemaAxisDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nameKo: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nameEn: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  minValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  maxValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(1)
  stepValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;
}

export class CreateRatingSchemaDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nameKo: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionKo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionEn?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSchemaAxisDto)
  @ArrayMinSize(1, { message: '최소 1개 이상의 평가 항목이 필요합니다.' })
  axes: CreateSchemaAxisDto[];
}
