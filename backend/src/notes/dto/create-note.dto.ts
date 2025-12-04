import { IsString, IsNumber, Min, Max, IsBoolean, IsObject, ValidateNested, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsString()
  memo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsBoolean()
  isPublic: boolean;
}

