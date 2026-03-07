import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NoteReport } from './entities/note-report.entity';
import { Note } from '../notes/entities/note.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NoteReport, Note])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
