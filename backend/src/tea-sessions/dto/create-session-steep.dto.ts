import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSessionSteepDto {
  @IsNumber()
  steepNumber: number;

  @IsNumber()
  steepDurationSeconds: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  aroma?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  taste?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  color?: string | null;

  @IsOptional()
  @IsString()
  memo?: string | null;
}
