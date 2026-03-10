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
import { BlindSessionRound } from './entities/blind-session-round.entity';
import { BlindSessionParticipantNote } from './entities/blind-session-participant-note.entity';
import { BlindSessionStatus } from './entities/blind-tasting-session.entity';
import { BlindRoundStatus } from './entities/blind-session-round.entity';
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
    @InjectRepository(BlindSessionRound)
    private roundsRepository: Repository<BlindSessionRound>,
    @InjectRepository(BlindSessionParticipantNote)
    private participantNotesRepository: Repository<BlindSessionParticipantNote>,
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    private teasService: TeasService,
    private notesService: NotesService,
  ) {}

  private generateInviteCode(): string {
    return randomBytes(6).toString('base64url');
  }

  async create(userId: number, dto: CreateBlindSessionDto): Promise<any> {
    // Validate all teas exist
    await Promise.all(dto.teaIds.map((id) => this.teasService.findOne(id)));

    let inviteCode: string;
    let existing: BlindTastingSession | null;
    do {
      inviteCode = this.generateInviteCode();
      existing = await this.sessionsRepository.findOne({ where: { inviteCode } });
    } while (existing);

    const session = this.sessionsRepository.create({
      hostId: userId,
      teaId: null,
      status: BlindSessionStatus.ACTIVE,
      inviteCode,
    });
    const savedSession = await this.sessionsRepository.save(session);

    // Create rounds for each tea
    const rounds = await Promise.all(
      dto.teaIds.map((teaId, index) =>
        this.roundsRepository.save(
          this.roundsRepository.create({
            sessionId: savedSession.id,
            teaId,
            roundOrder: index + 1,
            status: index === 0 ? BlindRoundStatus.IN_PROGRESS : BlindRoundStatus.PENDING,
            startedAt: index === 0 ? new Date() : null,
          }),
        ),
      ),
    );

    return {
      id: savedSession.id,
      inviteCode: savedSession.inviteCode,
      status: savedSession.status,
      rounds: rounds.map((r) => ({ id: r.id, roundOrder: r.roundOrder, status: r.status })),
    };
  }

  async getSessionByInviteCode(inviteCode: string): Promise<{
    id: number;
    inviteCode: string;
    status: string;
    hostName: string;
    participantCount: number;
    hostId: number;
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
      hostName: session.host.name,
      hostId: session.hostId,
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

  async getRounds(userId: number, sessionId: number): Promise<any[]> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: ['participants'],
    });
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    const isHost = session.hostId === userId;
    const isParticipant = session.participants?.some((p) => p.userId === userId);
    if (!isHost && !isParticipant) {
      throw new ForbiddenException('이 세션에 접근할 수 없습니다.');
    }

    const rounds = await this.roundsRepository.find({
      where: { sessionId },
      relations: ['tea'],
      order: { roundOrder: 'ASC' },
    });

    return rounds.map((r) => ({
      id: r.id,
      roundOrder: r.roundOrder,
      status: r.status,
      tea:
        isHost || session.status === BlindSessionStatus.ENDED
          ? r.tea
            ? { id: r.tea.id, name: r.tea.name, type: r.tea.type, year: r.tea.year }
            : null
          : null,
    }));
  }

  async nextRound(userId: number, sessionId: number): Promise<any> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }
    if (session.hostId !== userId) {
      throw new ForbiddenException('호스트만 라운드를 진행할 수 있습니다.');
    }
    if (session.status === BlindSessionStatus.ENDED) {
      throw new BadRequestException('이미 종료된 세션입니다.');
    }

    const rounds = await this.roundsRepository.find({
      where: { sessionId },
      order: { roundOrder: 'ASC' },
    });

    const currentRound = rounds.find((r) => r.status === BlindRoundStatus.IN_PROGRESS);
    if (!currentRound) {
      throw new BadRequestException('진행 중인 라운드가 없습니다.');
    }

    currentRound.status = BlindRoundStatus.COMPLETED;
    currentRound.completedAt = new Date();
    await this.roundsRepository.save(currentRound);

    const nextRound = rounds.find((r) => r.roundOrder === currentRound.roundOrder + 1);
    if (nextRound) {
      nextRound.status = BlindRoundStatus.IN_PROGRESS;
      nextRound.startedAt = new Date();
      await this.roundsRepository.save(nextRound);
      return {
        completedRound: { id: currentRound.id, roundOrder: currentRound.roundOrder },
        currentRound: { id: nextRound.id, roundOrder: nextRound.roundOrder, status: nextRound.status },
        isLastRound: false,
      };
    }

    return {
      completedRound: { id: currentRound.id, roundOrder: currentRound.roundOrder },
      currentRound: null,
      isLastRound: true,
    };
  }

  async getSession(userId: number, sessionId: number): Promise<any> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: ['host', 'participants', 'participants.user', 'rounds'],
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

    const rounds = (session.rounds ?? []).sort((a, b) => a.roundOrder - b.roundOrder);
    const currentRound = rounds.find((r) => r.status === BlindRoundStatus.IN_PROGRESS) ?? null;
    const totalRounds = rounds.length;

    // Get participant notes for current user
    const participantNotesByRound: Record<number, boolean> = {};
    if (participant) {
      const notes = await this.participantNotesRepository.find({
        where: { participantId: participant.id },
      });
      for (const n of notes) {
        participantNotesByRound[n.roundId] = true;
      }
    }

    // Get all participants' notes status per round
    const participantsStatus = await Promise.all(
      (session.participants ?? []).map(async (p) => {
        const notes = await this.participantNotesRepository.find({
          where: { participantId: p.id },
        });
        const completedRoundIds = notes.map((n) => n.roundId);
        return {
          userId: p.userId,
          userName: p.user.name,
          completedRounds: completedRoundIds,
          hasNote: notes.length > 0,
        };
      }),
    );


    const base = {
      id: session.id,
      inviteCode: session.inviteCode,
      status: session.status,
      hostName: session.host.name,
      participantCount: session.participants?.length ?? 0,
      isHost,
      totalRounds,
      currentRoundOrder: currentRound?.roundOrder ?? null,
      currentRoundId: currentRound?.id ?? null,
      participants: participantsStatus,
      myCompletedRounds: Object.keys(participantNotesByRound).map(Number),
    };

    if (session.status === BlindSessionStatus.ENDED || isHost) {
      const roundsWithTea = await this.roundsRepository.find({
        where: { sessionId },
        relations: ['tea'],
        order: { roundOrder: 'ASC' },
      });
      return {
        ...base,
        rounds: roundsWithTea.map((r) => ({
          id: r.id,
          roundOrder: r.roundOrder,
          status: r.status,
          tea: r.tea ? { id: r.tea.id, name: r.tea.name, type: r.tea.type, year: r.tea.year } : null,
        })),
      };
    }

    return {
      ...base,
      rounds: rounds.map((r) => ({
        id: r.id,
        roundOrder: r.roundOrder,
        status: r.status,
        tea: null,
      })),
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

    // Validate round
    const round = await this.roundsRepository.findOne({
      where: { id: dto.roundId, sessionId },
    });
    if (!round) {
      throw new NotFoundException('라운드를 찾을 수 없습니다.');
    }
    if (round.status !== BlindRoundStatus.IN_PROGRESS) {
      throw new BadRequestException('현재 진행 중인 라운드가 아닙니다.');
    }

    // Check if already submitted for this round
    const existingNote = await this.participantNotesRepository.findOne({
      where: { participantId: participant.id, roundId: dto.roundId },
    });
    if (existingNote) {
      throw new BadRequestException('이미 이 라운드의 기록을 제출했습니다.');
    }

    const createNoteDto: CreateNoteDto = {
      teaId: round.teaId,
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

    await this.participantNotesRepository.save(
      this.participantNotesRepository.create({
        participantId: participant.id,
        roundId: dto.roundId,
        noteId: note.id,
      }),
    );

    // Legacy: update participant.noteId for backward compat
    await this.participantsRepository.update({ id: participant.id }, { noteId: note.id });


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

  async getMyBlindSessions(userId: number): Promise<
    Array<{
      id: number;
      status: string;
      createdAt: Date;
      endedAt: Date | null;
      teaName: string | null;
      teaType: string | null;
      hostName: string;
      participantCount: number;
      isHost: boolean;
    }>
  > {
    const hostedSessions = await this.sessionsRepository.find({
      where: { hostId: userId },
      relations: ['host', 'tea', 'participants'],
      order: { createdAt: 'DESC' },
    });

    const participantRows = await this.participantsRepository.find({
      where: { userId },
      relations: ['session', 'session.host', 'session.tea', 'session.participants'],
    });

    const participatedSessionIds = new Set(participantRows.map((p) => p.sessionId));
    const hostedSessionIds = new Set(hostedSessions.map((s) => s.id));

    const participatedSessions = participantRows
      .filter((p) => !hostedSessionIds.has(p.sessionId))
      .map((p) => p.session);

    const allSessions = [...hostedSessions, ...participatedSessions];

    allSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return allSessions.map((session) => {
      const isHost = session.hostId === userId;
      const isActive = session.status === BlindSessionStatus.ACTIVE;
      const hideTeaInfo = isActive && !isHost;

      return {
        id: session.id,
        status: session.status,
        createdAt: session.createdAt,
        endedAt: session.endedAt,
        teaName: hideTeaInfo ? null : (session.tea?.name ?? null),
        teaType: hideTeaInfo ? null : (session.tea?.type ?? null),
        hostName: session.host?.name ?? '',
        participantCount: session.participants?.length ?? 0,
        isHost,
      };
    });
  }

  async getComparisonReport(userId: number, sessionId: number): Promise<any> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: ['participants', 'participants.user'],
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

    const rounds = await this.roundsRepository.find({
      where: { sessionId },
      relations: ['tea'],
      order: { roundOrder: 'ASC' },
    });

    const roundReports = await Promise.all(
      rounds.map(async (round) => {
        const participantNotes = await this.participantNotesRepository.find({
          where: { roundId: round.id },
          relations: ['participant', 'participant.user'],
        });

        const participantData = (
          await Promise.all(
            participantNotes.map(async (pn) => {
              if (!pn.noteId) return null;
              const note = await this.notesRepository.findOne({
                where: { id: pn.noteId },
                relations: ['noteTags', 'noteTags.tag', 'axisValues', 'axisValues.axis'],
              });
              if (!note) return null;
              return {
                userId: pn.participant.userId,
                userName: pn.participant.user.name,
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
          roundId: round.id,
          roundOrder: round.roundOrder,
          tea: round.tea
            ? { id: round.tea.id, name: round.tea.name, type: round.tea.type, year: round.tea.year }
            : null,
          participants: participantData,
          stats: {
            avgOverallRating,
            axisAverages: Object.values(axisAverages),
            tagDistribution,
          },
        };
      }),
    );

    return { rounds: roundReports };
  }
}
