import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TeaSession } from './entities/tea-session.entity';
import { TeaSessionSteep } from './entities/tea-session-steep.entity';
import { CreateTeaSessionDto } from './dto/create-tea-session.dto';
import { CreateSessionSteepDto } from './dto/create-session-steep.dto';
import { UpdateSessionSteepDto } from './dto/update-session-steep.dto';
import { PublishSessionToNoteDto } from './dto/publish-session-to-note.dto';
import { TeasService } from '../teas/teas.service';
import { NotesService } from '../notes/notes.service';
import { CreateNoteDto } from '../notes/dto/create-note.dto';
import { SteepDataV1 } from './types/steep-data';

@Injectable()
export class TeaSessionsService {
  constructor(
    @InjectRepository(TeaSession)
    private teaSessionsRepository: Repository<TeaSession>,
    @InjectRepository(TeaSessionSteep)
    private teaSessionSteepsRepository: Repository<TeaSessionSteep>,
    private teasService: TeasService,
    private notesService: NotesService,
  ) {}

  async create(userId: number, dto: CreateTeaSessionDto): Promise<TeaSession> {
    await this.teasService.findOne(dto.teaId);

    const session = this.teaSessionsRepository.create({
      userId,
      teaId: dto.teaId,
    });

    const saved = await this.teaSessionsRepository.save(session);
    return this.findOne(userId, saved.id);
  }

  async findAll(
    userId: number,
    teaId?: number,
    from?: string,
    to?: string,
  ): Promise<TeaSession[]> {
    const where: Record<string, unknown> = { userId };

    if (teaId !== undefined) {
      where.teaId = teaId;
    }

    if (from || to) {
      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to) : undefined;
      if (fromDate && toDate) {
        where.createdAt = Between(fromDate, toDate);
      } else if (fromDate) {
        where.createdAt = Between(fromDate, new Date('9999-12-31'));
      } else if (toDate) {
        where.createdAt = Between(new Date('1970-01-01'), toDate);
      }
    }

    return this.teaSessionsRepository.find({
      where,
      relations: ['tea'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: number, id: number): Promise<TeaSession> {
    const session = await this.teaSessionsRepository.findOne({
      where: { id },
      relations: ['tea', 'steeps'],
    });

    if (!session) {
      throw new NotFoundException(`세션(id: ${id})을 찾을 수 없습니다.`);
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('이 세션에 접근할 권한이 없습니다.');
    }

    return session;
  }

  async addSteep(
    userId: number,
    sessionId: number,
    dto: CreateSessionSteepDto,
  ): Promise<TeaSessionSteep> {
    const session = await this.findOne(userId, sessionId);

    if (session.noteId) {
      throw new BadRequestException('이미 노트로 발행된 세션에는 탕을 추가할 수 없습니다.');
    }

    const data: SteepDataV1 | null = dto.data
      ? { v: 1, ...(dto.data as Omit<SteepDataV1, 'v'>) }
      : null;

    const steep = this.teaSessionSteepsRepository.create({
      sessionId,
      steepNumber: dto.steepNumber,
      steepDurationSeconds: dto.steepDurationSeconds,
      data,
    });

    return this.teaSessionSteepsRepository.save(steep);
  }

  async updateSteep(
    userId: number,
    sessionId: number,
    steepId: number,
    dto: UpdateSessionSteepDto,
  ): Promise<TeaSessionSteep> {
    const session = await this.findOne(userId, sessionId);

    if (session.noteId) {
      throw new BadRequestException('이미 노트로 발행된 세션의 탕은 수정할 수 없습니다.');
    }

    const steep = await this.teaSessionSteepsRepository.findOne({
      where: { id: steepId, sessionId },
    });

    if (!steep) {
      throw new NotFoundException(`탕(id: ${steepId})을 찾을 수 없습니다.`);
    }

    if (dto.steepNumber !== undefined) steep.steepNumber = dto.steepNumber;
    if (dto.steepDurationSeconds !== undefined)
      steep.steepDurationSeconds = dto.steepDurationSeconds;
    if (dto.data !== undefined) {
      steep.data = dto.data
        ? { v: 1, ...(dto.data as Omit<SteepDataV1, 'v'>) }
        : null;
    }

    return this.teaSessionSteepsRepository.save(steep);
  }

  async deleteSteep(
    userId: number,
    sessionId: number,
    steepId: number,
  ): Promise<void> {
    const session = await this.findOne(userId, sessionId);

    if (session.noteId) {
      throw new BadRequestException('이미 노트로 발행된 세션의 탕은 삭제할 수 없습니다.');
    }

    const steep = await this.teaSessionSteepsRepository.findOne({
      where: { id: steepId, sessionId },
    });

    if (!steep) {
      throw new NotFoundException(`탕(id: ${steepId})을 찾을 수 없습니다.`);
    }

    await this.teaSessionSteepsRepository.remove(steep);
  }

  async publish(
    userId: number,
    sessionId: number,
    dto: PublishSessionToNoteDto,
  ): Promise<{ noteId: number }> {
    const session = await this.findOne(userId, sessionId);

    if (session.noteId) {
      throw new BadRequestException('이미 노트로 발행된 세션입니다.');
    }

    const steepSummary = this.buildSteepSummary(session.steeps);
    const memo = dto.memo
      ? `${dto.memo}\n\n---\n${steepSummary}`
      : steepSummary;

    const createNoteDto: CreateNoteDto = {
      teaId: session.teaId,
      schemaId: dto.schemaId,
      overallRating: dto.overallRating ?? null,
      isRatingIncluded: dto.isRatingIncluded ?? true,
      axisValues: dto.axisValues,
      memo,
      isPublic: dto.isPublic,
      tags: dto.tags,
    };

    const note = await this.notesService.create(userId, createNoteDto);

    session.noteId = note.id;
    await this.teaSessionsRepository.save(session);

    return { noteId: note.id };
  }

  private buildSteepSummary(steeps: TeaSessionSteep[]): string {
    if (!steeps || steeps.length === 0) {
      return '[탕 기록 없음]';
    }

    const sorted = [...steeps].sort((a, b) => a.steepNumber - b.steepNumber);

    const escapeCell = (s: string | null | undefined): string => {
      if (s == null || s === '') return '-';
      return String(s).replace(/\|/g, '·').replace(/\n/g, ' ');
    };

    const header = '| 탕 | 시간 | 수색 | 향 | 물온도 | 몸반응 | 만족도 | 메모 |';
    const separator = '|:---|:---|:---|:---|:---|:---|:---|:---|';
    const rows = sorted.map((s) => {
      const d = s.data as SteepDataV1 | null;
      const parts = [
        `${s.steepNumber}탕`,
        `${s.steepDurationSeconds}초`,
        escapeCell(d?.v === 1 ? d.color_note : null),
        escapeCell(d?.v === 1 ? d.aroma_profile : null),
        escapeCell(d?.v === 1 ? d.water_temp : null),
        escapeCell(d?.v === 1 ? d.body_feeling : null),
        d?.v === 1 && d.rating != null ? `${d.rating}/5` : '-',
        escapeCell(d?.v === 1 ? d.memo : null),
      ];
      return '| ' + parts.join(' | ') + ' |';
    });

    return [header, separator, ...rows].join('\n');
  }
}
