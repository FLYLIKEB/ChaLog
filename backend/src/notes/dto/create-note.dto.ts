import { IsString, IsNumber, Min, Max, IsBoolean, ValidateNested, IsOptional, IsArray, ArrayMaxSize, registerDecorator, ValidationOptions } from 'class-validator';
import { Type, Transform } from 'class-transformer';

function IsHalfStep(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isHalfStep',
      target: (object as { constructor: Function }).constructor,
      propertyName,
      options: { message: `${propertyName}은 0.5 단위여야 합니다`, ...validationOptions },
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'number') return false;
          return Number.isInteger(value * 2);
        },
      },
    });
  };
}

class AxisValueDto {
  @IsNumber()
  axisId: number;

  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Max(5)
  @IsHalfStep()
  value: number;
}

export class CreateNoteDto {
  @IsNumber()
  teaId: number;

  /** 단일 스키마 (하위 호환) - schemaIds가 있으면 무시됨 */
  @IsOptional()
  @IsNumber()
  schemaId?: number;

  /** 다중 스키마 ID (1개 이상) */
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMaxSize(10)
  schemaIds?: number[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Max(5)
  @IsHalfStep()
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
  appearance?: string | null;

  @IsOptional()
  @Transform(({ value }) => value === null ? null : value)
  @IsString()
  memo?: string | null;

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

