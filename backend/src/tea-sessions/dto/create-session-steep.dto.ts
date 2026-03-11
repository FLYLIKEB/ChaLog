import { IsNumber, IsOptional, IsObject } from 'class-validator';

export class CreateSessionSteepDto {
  @IsNumber()
  steepNumber: number;

  @IsNumber()
  steepDurationSeconds: number;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown> | null;
}
