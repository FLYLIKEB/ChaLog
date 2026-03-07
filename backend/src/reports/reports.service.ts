import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoteReport } from './entities/note-report.entity';
import { Note } from '../notes/entities/note.entity';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(NoteReport)
    private noteReportsRepository: Repository<NoteReport>,
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
  ) {}

  async reportNote(noteId: number, reporterId: number, dto: CreateReportDto): Promise<NoteReport> {
    const note = await this.notesRepository.findOne({ where: { id: noteId } });
    if (!note) {
      throw new NotFoundException('노트를 찾을 수 없습니다.');
    }

    if (note.userId === reporterId) {
      throw new ForbiddenException('자신의 노트는 신고할 수 없습니다.');
    }

    const alreadyReported = await this.noteReportsRepository.exist({
      where: { noteId, reporterId },
    });
    if (alreadyReported) {
      throw new ConflictException('이미 신고한 노트입니다.');
    }

    const report = this.noteReportsRepository.create({
      noteId,
      reporterId,
      reason: dto.reason,
    });

    const saved = await this.noteReportsRepository.save(report);
    this.logger.log(`Note ${noteId} reported by user ${reporterId} for reason: ${dto.reason}`);
    return saved;
  }
}
