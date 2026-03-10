import {
  IsNumber,
  Min,
  Max,
  IsBoolean,
  ValidateNested,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  IsString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

class AxisValueDto {
  @IsNumber()
  axisId: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  value: number;
}

export class SubmitBlindNoteDto {
  @IsOptional()
  @IsNumber()
  schemaId?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMaxSize(10)
  schemaIds?: number[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating?: number | null;

  @IsOptional()
  @IsBoolean()
  isRatingIncluded?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AxisValueDto)
  axisValues?: AxisValueDto[];

  @IsOptional()
  @Transform(({ value }) => (value === null ? null : value))
  @IsString()
  memo?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === null ? null : value))
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  images?: string[] | null;

  @IsOptional()
  @Transform(({ value }) => (value === null ? null : value))
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  imageThumbnails?: string[] | null;

  @IsOptional()
  @IsArray({ message: 'tags must be an array' })
  @ArrayMaxSize(10, { message: 'tags must contain at most 10 items' })
  @IsString({ each: true, message: 'each tag must be a string' })
  tags?: string[];
}
