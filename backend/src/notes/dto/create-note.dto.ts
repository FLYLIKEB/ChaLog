import { IsString, IsNumber, Min, Max, IsBoolean, ValidateNested, IsOptional, IsArray, ArrayMaxSize, MaxLength, IsUrl, ValidateIf } from 'class-validator';
import { Type, Transform } from 'class-transformer';

class AxisValueDto {
  @IsNumber()
  axisId: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  value: number;
}

export class CreateNoteDto {
  @IsNumber()
  teaId: number;

  @IsNumber()
  schemaId: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating?: number | null;

  @IsOptional()
  @IsBoolean()
  isRatingIncluded?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AxisValueDto)
  axisValues: AxisValueDto[];

  @IsOptional()
  @Transform(({ value }) => value === null ? null : value)
  @IsString()
  memo?: string | null;

  @IsOptional()
  @Transform(({ value }) => (value === null || value === '' ? null : (typeof value === 'string' ? value.trim() : value)))
  @IsString()
  @MaxLength(500, { message: '구입처는 500자 이내로 입력해주세요.' })
  @ValidateIf((o) => o.whereToBuy != null && /^https?:\/\//i.test(o.whereToBuy))
  @IsUrl({}, { message: 'URL 형식이 올바르지 않습니다. http:// 또는 https://로 시작하는 유효한 URL을 입력해주세요.' })
  whereToBuy?: string | null;

  @IsOptional()
  @Transform(({ value }) => value === null ? null : value)
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  images?: string[] | null;

  @IsOptional()
  @Transform(({ value }) => value === null ? null : value)
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  imageThumbnails?: string[] | null;

  @IsOptional()
  @IsArray({ message: 'tags must be an array' })
  @ArrayMaxSize(10, { message: 'tags must contain at most 10 items' })
  @IsString({ each: true, message: 'each tag must be a string' })
  tags?: string[];

  @IsBoolean()
  isPublic: boolean;
}

