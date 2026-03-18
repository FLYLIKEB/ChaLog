import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { TeawareCategory } from '../entities/teaware.entity';

export class CreateTeawareDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(TeawareCategory)
  category: TeawareCategory;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(9999.9)
  capacity?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  material?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string | null;
}
