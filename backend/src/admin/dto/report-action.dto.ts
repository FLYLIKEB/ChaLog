import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
