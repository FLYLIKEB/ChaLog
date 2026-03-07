import { IsEnum } from 'class-validator';
import { ReportReason } from '../entities/note-report.entity';

export class CreateReportDto {
  @IsEnum(ReportReason)
  reason: ReportReason;
}
