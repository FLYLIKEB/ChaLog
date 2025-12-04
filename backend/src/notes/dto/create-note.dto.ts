import { IsString, IsNumber, Min, Max, IsBoolean, IsObject, ValidateNested, IsOptional, IsArray, ArrayMaxSize } from 'class-validator';
import { Type, Transform } from 'class-transformer';

class RatingsDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  richness: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  strength: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  smoothness: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  clarity: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  complexity: number;
}

export class CreateNoteDto {
  @IsNumber()
  teaId: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsObject()
  @ValidateNested()
  @Type(() => RatingsDto)
  ratings: RatingsDto;

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

  @IsBoolean()
  isPublic: boolean;
}

