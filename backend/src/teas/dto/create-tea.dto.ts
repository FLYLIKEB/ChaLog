import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateTeaDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(1900)
  year?: number;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  seller?: string;

  @IsOptional()
  @IsString()
  origin?: string;
}

