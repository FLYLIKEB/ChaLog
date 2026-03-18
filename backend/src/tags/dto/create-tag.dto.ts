import { IsString, MinLength, MaxLength, IsIn, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsOptional()
  @IsIn(['general', 'flavor'])
  category?: 'general' | 'flavor';
}
