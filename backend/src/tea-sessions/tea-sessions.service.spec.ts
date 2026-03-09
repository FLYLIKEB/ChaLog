import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TeaSessionsService } from './tea-sessions.service';
import { TeaSession } from './entities/tea-session.entity';
import { TeaSessionSteep } from './entities/tea-session-steep.entity';
import { TeasService } from '../teas/teas.service';
import { NotesService } from '../notes/notes.service';

describe('TeaSessionsService', () => {
  let service: TeaSessionsService;
  let teaSessionsRepository: Repository<TeaSession>;
  let teaSessionSteepsRepository: Repository<TeaSessionSteep>;
  let teasService: TeasService;
  let notesService: NotesService;

  const mockTea = { id: 1, name: '테스트 차', type: '녹차' };
  const mockSession = (overrides: Partial<TeaSession> = {}): TeaSession =>
    ({
      id: 1,
      userId: 10,
      teaId: 1,
      tea: mockTea as any,
      noteId: null,
      steeps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as TeaSession);

  const mockSteep = (overrides: Partial<TeaSessionSteep> = {}): TeaSessionSteep =>
    ({
      id: 1,
      sessionId: 1,
      steepNumber: 1,
      steepDurationSeconds: 30,
      aroma: null,
      taste: null,
      color: null,
      memo: null,
      createdAt: new Date(),
      ...overrides,
    } as TeaSessionSteep);

  const mockTeaSessionsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockTeaSessionSteepsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockTeasService = {
    findOne: jest.fn(),
  };

  const mockNotesService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeaSessionsService,
        {
          provide: getRepositoryToken(TeaSession),
          useValue: mockTeaSessionsRepository,
        },
        {
          provide: getRepositoryToken(TeaSessionSteep),
          useValue: mockTeaSessionSteepsRepository,
        },
        {
          provide: TeasService,
          useValue: mockTeasService,
        },
        {
          provide: NotesService,
          useValue: mockNotesService,
        },
      ],
    }).compile();

    service = module.get<TeaSessionsService>(TeaSessionsService);
    teaSessionsRepository = module.get<Repository<TeaSession>>(
      getRepositoryToken(TeaSession),
    );
    teaSessionSteepsRepository = module.get<Repository<TeaSessionSteep>>(
      getRepositoryToken(TeaSessionSteep),
    );
    teasService = module.get<TeasService>(TeasService);
    notesService = module.get<NotesService>(NotesService);
  });

  it('서비스가 정의되어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('세션을 생성해야 한다', async () => {
      const userId = 10;
      const dto = { teaId: 1 };
      const createdSession = mockSession();

      mockTeasService.findOne.mockResolvedValue(mockTea);
      mockTeaSessionsRepository.create.mockReturnValue(createdSession);
      mockTeaSessionsRepository.save.mockResolvedValue(createdSession);
      mockTeaSessionsRepository.findOne.mockResolvedValue(createdSession);

      const result = await service.create(userId, dto);

      expect(mockTeasService.findOne).toHaveBeenCalledWith(dto.teaId);
      expect(mockTeaSessionsRepository.create).toHaveBeenCalled();
      expect(mockTeaSessionsRepository.save).toHaveBeenCalled();
      expect(result).toEqual(createdSession);
    });
  });

  describe('findOne', () => {
    it('본인 세션을 조회할 수 있어야 한다', async () => {
      const session = mockSession();
      mockTeaSessionsRepository.findOne.mockResolvedValue(session);

      const result = await service.findOne(10, 1);

      expect(result).toEqual(session);
    });

    it('존재하지 않는 세션 조회 시 NotFoundException을 던져야 한다', async () => {
      mockTeaSessionsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(10, 999)).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자 세션 조회 시 ForbiddenException을 던져야 한다', async () => {
      const session = mockSession({ userId: 10 });
      mockTeaSessionsRepository.findOne.mockResolvedValue(session);

      await expect(service.findOne(20, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addSteep', () => {
    it('탕을 추가할 수 있어야 한다', async () => {
      const session = mockSession({ noteId: null });
      const steep = mockSteep();
      mockTeaSessionsRepository.findOne.mockResolvedValue(session);
      mockTeaSessionSteepsRepository.create.mockReturnValue(steep);
      mockTeaSessionSteepsRepository.save.mockResolvedValue(steep);

      const result = await service.addSteep(10, 1, {
        steepNumber: 1,
        steepDurationSeconds: 30,
      });

      expect(mockTeaSessionSteepsRepository.create).toHaveBeenCalled();
      expect(mockTeaSessionSteepsRepository.save).toHaveBeenCalled();
      expect(result).toEqual(steep);
    });

    it('이미 발행된 세션에 탕 추가 시 BadRequestException을 던져야 한다', async () => {
      const session = mockSession({ noteId: 100 });
      mockTeaSessionsRepository.findOne.mockResolvedValue(session);

      await expect(
        service.addSteep(10, 1, {
          steepNumber: 1,
          steepDurationSeconds: 30,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
