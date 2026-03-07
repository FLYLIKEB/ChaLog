import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { NoteReport, ReportReason } from './entities/note-report.entity';
import { Note } from '../notes/entities/note.entity';
import { CreateReportDto } from './dto/create-report.dto';

describe('ReportsService', () => {
  let service: ReportsService;
  let noteReportsRepository: Repository<NoteReport>;
  let notesRepository: Repository<Note>;

  const mockNoteReportsRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockNotesRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(NoteReport),
          useValue: mockNoteReportsRepository,
        },
        {
          provide: getRepositoryToken(Note),
          useValue: mockNotesRepository,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    noteReportsRepository = module.get<Repository<NoteReport>>(getRepositoryToken(NoteReport));
    notesRepository = module.get<Repository<Note>>(getRepositoryToken(Note));

    jest.clearAllMocks();
  });

  describe('reportNote', () => {
    const dto: CreateReportDto = { reason: ReportReason.SPAM };
    const noteId = 1;
    const reporterId = 2;

    it('정상적으로 신고를 저장해야 한다', async () => {
      const note = { id: noteId, userId: 99 } as Note;
      const created = { id: 10, noteId, reporterId, reason: ReportReason.SPAM } as NoteReport;

      mockNotesRepository.findOne.mockResolvedValue(note);
      mockNoteReportsRepository.create.mockReturnValue(created);
      mockNoteReportsRepository.save.mockResolvedValue(created);

      const result = await service.reportNote(noteId, reporterId, dto);

      expect(notesRepository.findOne).toHaveBeenCalledWith({ where: { id: noteId } });
      expect(noteReportsRepository.create).toHaveBeenCalledWith({
        noteId,
        reporterId,
        reason: dto.reason,
      });
      expect(noteReportsRepository.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('존재하지 않는 노트를 신고하면 NotFoundException을 던져야 한다', async () => {
      mockNotesRepository.findOne.mockResolvedValue(null);

      await expect(service.reportNote(noteId, reporterId, dto)).rejects.toThrow(NotFoundException);
    });

    it('자신의 노트를 신고하면 ForbiddenException을 던져야 한다', async () => {
      const note = { id: noteId, userId: reporterId } as Note;
      mockNotesRepository.findOne.mockResolvedValue(note);

      await expect(service.reportNote(noteId, reporterId, dto)).rejects.toThrow(ForbiddenException);
    });
  });
});
