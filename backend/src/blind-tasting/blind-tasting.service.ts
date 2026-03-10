import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { BlindTastingSession } from './entities/blind-tasting-session.entity';
import { BlindSessionParticipant } from './entities/blind-session-participant.entity';
import { BlindSessionStatus } from './entities/blind-tasting-session.entity';
import { CreateBlindSessionDto } from './dto/create-blind-session.dto';
import { SubmitBlindNoteDto } from './dto/submit-blind-note.dto';
import { TeasService } from '../teas/teas.service';
import { NotesService } from '../notes/notes.service';
import { CreateNoteDto } from '../notes/dto/create-note.dto';
import { Note } from '../notes/entities/note.entity';

@Injectable()
export class BlindTastingService {
  constructor(
    @InjectRepository(BlindTastingSession)
    private sessionsRepository: Repository<BlindTastingSession>,
    @InjectRepository(BlindSessionParticipant)
    private participantsRepository: Repository<BlindSessionParticipant>,
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    private teasService: TeasService,
    private notesService: NotesService,
  ) {}

  private generateInviteCode(): string {
    return randomBytes(6).toString('base64url');
  }

  async create(userId: number, dto: CreateBlindSessionDto): Promise<BlindTastingSession> {
    await this.teasService.findOne(dto.teaId);

    let inviteCode: string;
    let existing: BlindTastingSession | null;
    do {
      inviteCode = this.generateInviteCode();
      existing = await this.sessionsRepository.findOne({ where: { inviteCode } });
    } while (existing);

    const session = this.sessionsRepository.create({
      hostId: userId,
      teaId: dto.teaId,
      status: BlindSessionStatus.ACTIVE,
      inviteCode,
    });
    return this.sessionsRepository.save(session);
  }

  async getSessionByInviteCode(inviteCode: string): Promise<{
    id: number;
    inviteCode: string;
    status: string;
    hostId: number;
    hostName: string;
    participantCount: number;
  }> {
    const session = await this.sessionsRepository.findOne({
      where: { inviteCode },
      relations: ['host', 'participants'],
    });
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }
    if (session.status !== BlindSessionStatus.ACTIVE) {
      throw new BadRequestException('이미 종료된 세션입니다.');
    }
    return {
      id: session.id,
      inviteCode: session.inviteCode,
      status: session.status,
      hostId: session.hostId,
      hostName: session.host.name,
      participantCount: session.participants?.length ?? 0,
    };
  }

  async join(userId: number, inviteCode: string): Promise<BlindSessionParticipant> {
    const session = await this.sessionsRepository.findOne({
      where: { inviteCode },
      relations: ['participants'],
    });
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }
    if (session.status !== BlindSessionStatus.ACTIVE) {
      throw new BadRequestException('이미 종료된 세션입니다.');
    }
    const alreadyJoined = session.participants?.some((p) => p.userId === userId);
    if (alreadyJoined) {
      throw new BadRequestException('이미 참가한 세션입니다.');
    }
    if (session.hostId === userId) {
      throw new BadRequestException('호스트는 별도 참가 등록이 필요 없습니다.');
    }

    const participant = this.participantsRepository.create({
      sessionId: session.id,
      userId,
    });
    return this.participantsRepository.save(participant);
  }

  async getSession(userId: number, sessionId: number): Promise<any> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: ['host', 'tea', 'participants', 'participants.user', 'participants.note'],
    });
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    const isHost = session.hostId === userId;
    const participant = session.participants?.find((p) => p.userId === userId);
    const isParticipant = !!participant;

    if (!isHost && !isParticipant) {
      throw new ForbiddenException('이 세션에 접근할 수 없습니다.');
    }

    const base = {
      id: session.id,
      inviteCode: session.inviteCode,
      status: session.status,
      hostName: session.host.name,
      participantCount: session.participants?.length ?? 0,
      isHost,
      participants: session.participants?.map((p) => ({
        userId: p.userId,
        userName: p.user.name,
        hasNote: !!p.noteId,
      })),
    };

    if (session.status === BlindSessionStatus.ENDED || isHost) {
      return {
        ...base,
        tea: session.tea
          ? {
              id: session.tea.id,
              name: session.tea.name,
              type: session.tea.type,
              year: session.tea.year,
            }
          : null,
      };
    }

    return {
      ...base,
      tea: null,
    };
  }

  async submitNote(
    userId: number,
    sessionId: number,
    dto: SubmitBlindNoteDto,
  ): Promise<{ noteId: number }> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: ['participants'],
    });
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }
    if (session.status !== BlindSessionStatus.ACTIVE) {
      throw new BadRequestException('이미 종료된 세션입니다.');
    }

    const participant = session.participants?.find((p) => p.userId === userId);
    if (!participant) {
      throw new ForbiddenException('이 세션의 참가자가 아닙니다.');
    }
    if (participant.noteId) {
      throw new BadRequestException('이미 기록을 제출했습니다.');
    }

    const createNoteDto: CreateNoteDto = {
      teaId: session.teaId,
      schemaId: dto.schemaId,
      schemaIds: dto.schemaIds,
      overallRating: dto.overallRating,
      isRatingIncluded: dto.isRatingIncluded ?? true,
      axisValues: dto.axisValues ?? [],
      memo: dto.memo,
      images: dto.images,
      imageThumbnails: dto.imageThumbnails,
      tags: dto.tags,
      isPublic: false,
    };

    const note = await this.notesService.create(userId, createNoteDto);

    await this.participantsRepository.update(
      { id: participant.id },
      { noteId: note.id },
    );

    return { noteId: note.id };
  }

  async endSession(userId: number, sessionId: number): Promise<BlindTastingSession> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }
    if (session.hostId !== userId) {
      throw new ForbiddenException('호스트만 세션을 종료할 수 있습니다.');
    }
    if (session.status === BlindSessionStatus.ENDED) {
      throw new BadRequestException('이미 종료된 세션입니다.');
    }

    session.status = BlindSessionStatus.ENDED;
    session.endedAt = new Date();
    return this.sessionsRepository.save(session);
  }

  async getComparisonReport(userId: number, sessionId: number): Promise<any> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: ['tea', 'participants', 'participants.user', 'participants.note'],
    });
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }
    if (session.status !== BlindSessionStatus.ENDED) {
      throw new BadRequestException('세션이 종료된 후에만 리포트를 볼 수 있습니다.');
    }
    const isHost = session.hostId === userId;
    const isParticipant = session.participants?.some((p) => p.userId === userId);
    if (!isHost && !isParticipant) {
      throw new ForbiddenException('이 세션의 리포트를 볼 권한이 없습니다.');
    }

    const participantsWithNotes = (session.participants ?? []).filter((p) => p.noteId);

    const participantData = (
      await Promise.all(
        participantsWithNotes.map(async (p) => {
          const note = await this.notesRepository.findOne({
            where: { id: p.noteId! },
            relations: ['noteTags', 'noteTags.tag', 'axisValues', 'axisValues.axis'],
          });
          if (!note) return null;
          return {
            userId: p.userId,
            userName: p.user.name,
            overallRating: note.overallRating,
            axisValues: note.axisValues,
            tags: note.noteTags?.map((nt) => nt.tag?.name).filter(Boolean) ?? [],
            memo: note.memo,
          };
        }),
      )
    ).filter((p): p is NonNullable<typeof p> => p != null);

    const ratings = participantData
      .map((p) => (p.overallRating != null ? Number(p.overallRating) : null))
      .filter((r): r is number => r != null);
    const avgOverallRating =
      ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

    const tagCounts: Record<string, number> = {};
    for (const p of participantData) {
      for (const tag of p.tags) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      }
    }
    const tagDistribution = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const axisAverages: Record<number, { axisName: string; avg: number; count: number }> = {};
    for (const p of participantData) {
      for (const av of p.axisValues ?? []) {
        const axisId = (av as any).axis?.id ?? (av as any).axisId;
        const axisName = (av as any).axis?.nameKo ?? `축 ${axisId}`;
        const val = Number((av as any).valueNumeric);
        if (!axisAverages[axisId]) {
          axisAverages[axisId] = { axisName, avg: 0, count: 0 };
        }
        axisAverages[axisId].avg += val;
        axisAverages[axisId].count += 1;
      }
    }
    for (const k of Object.keys(axisAverages)) {
      const v = axisAverages[Number(k)];
      if (v.count > 0) v.avg /= v.count;
    }

    return {
      tea: session.tea
        ? {
            id: session.tea.id,
            name: session.tea.name,
            type: session.tea.type,
            year: session.tea.year,
          }
        : null,
      participants: participantData,
      stats: {
        avgOverallRating,
        axisAverages: Object.values(axisAverages),
        tagDistribution,
      },
    };
  }
}
