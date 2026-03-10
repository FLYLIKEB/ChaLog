import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { BlindTastingService } from './blind-tasting.service';
import { BlindTastingSession } from './entities/blind-tasting-session.entity';
import { BlindSessionParticipant } from './entities/blind-session-participant.entity';
import { Note } from '../notes/entities/note.entity';
import { TeasService } from '../teas/teas.service';
import { NotesService } from '../notes/notes.service';
import { BlindSessionStatus } from './entities/blind-tasting-session.entity';

describe('BlindTastingService', () => {
  let service: BlindTastingService;
  let sessionsRepository: jest.Mocked<Repository<BlindTastingSession>>;
  let participantsRepository: jest.Mocked<Repository<BlindSessionParticipant>>;
  let teasService: jest.Mocked<TeasService>;
  let notesService: jest.Mocked<NotesService>;

  const mockSession = (overrides: Partial<BlindTastingSession> = {}) =>
    ({
      id: 1,
      hostId: 10,
      teaId: 5,
      status: BlindSessionStatus.ACTIVE,
      inviteCode: 'abc123',
      createdAt: new Date(),
      endedAt: null,
      participants: [],
      ...overrides,
    }) as BlindTastingSession;

  const mockParticipant = (overrides: Partial<BlindSessionParticipant> = {}) =>
    ({
      id: 1,
      sessionId: 1,
      userId: 20,
      noteId: null,
      joinedAt: new Date(),
      user: { id: 20, name: 'Participant' },
      ...overrides,
    }) as BlindSessionParticipant;

  beforeEach(async () => {
    const mockSessionsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    const mockParticipantsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    const mockNotesRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlindTastingService,
        { provide: getRepositoryToken(BlindTastingSession), useValue: mockSessionsRepository },
        { provide: getRepositoryToken(BlindSessionParticipant), useValue: mockParticipantsRepository },
        { provide: getRepositoryToken(Note), useValue: mockNotesRepository },
        {
          provide: TeasService,
          useValue: { findOne: jest.fn().mockResolvedValue({ id: 5 }) },
        },
        {
          provide: NotesService,
          useValue: { create: jest.fn().mockResolvedValue({ id: 100 }) },
        },
      ],
    }).compile();

    service = module.get<BlindTastingService>(BlindTastingService);
    sessionsRepository = module.get(getRepositoryToken(BlindTastingSession));
    participantsRepository = module.get(getRepositoryToken(BlindSessionParticipant));
    teasService = module.get(TeasService);
    notesService = module.get(NotesService);
  });

  describe('create', () => {
    it('should create a blind session with invite code', async () => {
      const session = mockSession();
      (sessionsRepository.create as jest.Mock).mockReturnValue(session);
      (sessionsRepository.save as jest.Mock).mockResolvedValue(session);
      (sessionsRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.create(10, { teaId: 5 });
      expect(teasService.findOne).toHaveBeenCalledWith(5);
      expect(sessionsRepository.create).toHaveBeenCalled();
      expect(sessionsRepository.save).toHaveBeenCalled();
      expect(result.inviteCode).toBeDefined();
      expect(result.status).toBe(BlindSessionStatus.ACTIVE);
    });
  });

  describe('getSessionByInviteCode', () => {
    it('should return session info without tea for valid code', async () => {
      const session = mockSession({ host: { name: 'Host' } as any });
      (sessionsRepository.findOne as jest.Mock).mockResolvedValue(session);

      const result = await service.getSessionByInviteCode('abc123');
      expect(result.id).toBe(1);
      expect(result.hostName).toBe('Host');
      expect(result.status).toBe('active');
    });

    it('should throw NotFoundException for invalid code', async () => {
      (sessionsRepository.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.getSessionByInviteCode('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for ended session', async () => {
      const session = mockSession({ status: BlindSessionStatus.ENDED });
      (sessionsRepository.findOne as jest.Mock).mockResolvedValue(session);
      await expect(service.getSessionByInviteCode('abc123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('join', () => {
    it('should add participant for valid invite', async () => {
      const session = mockSession({ participants: [] });
      (sessionsRepository.findOne as jest.Mock).mockResolvedValue(session);
      const participant = mockParticipant();
      (participantsRepository.create as jest.Mock).mockReturnValue(participant);
      (participantsRepository.save as jest.Mock).mockResolvedValue(participant);

      const result = await service.join(20, 'abc123');
      expect(participantsRepository.create).toHaveBeenCalledWith({ sessionId: 1, userId: 20 });
      expect(participantsRepository.save).toHaveBeenCalled();
      expect(result.userId).toBe(20);
    });

    it('should throw BadRequestException when host tries to join', async () => {
      const session = mockSession({ hostId: 10 });
      (sessionsRepository.findOne as jest.Mock).mockResolvedValue(session);
      await expect(service.join(10, 'abc123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('endSession', () => {
    it('should end session when host calls', async () => {
      const session = mockSession();
      (sessionsRepository.findOne as jest.Mock).mockResolvedValue(session);
      const endedSession = { ...session, status: BlindSessionStatus.ENDED };
      (sessionsRepository.save as jest.Mock).mockResolvedValue(endedSession);

      const result = await service.endSession(10, 1);
      expect(result.status).toBe(BlindSessionStatus.ENDED);
    });

    it('should throw ForbiddenException when non-host calls', async () => {
      const session = mockSession({ hostId: 10 });
      (sessionsRepository.findOne as jest.Mock).mockResolvedValue(session);
      await expect(service.endSession(20, 1)).rejects.toThrow(ForbiddenException);
    });
  });
});
