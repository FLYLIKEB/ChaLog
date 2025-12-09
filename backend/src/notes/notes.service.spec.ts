import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NotesService } from './notes.service';
import { Note } from './entities/note.entity';
import { Tag } from './entities/tag.entity';
import { NoteTag } from './entities/note-tag.entity';
import { RatingSchema } from './entities/rating-schema.entity';
import { RatingAxis } from './entities/rating-axis.entity';
import { NoteAxisValue } from './entities/note-axis-value.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { TeasService } from '../teas/teas.service';
import { S3Service } from '../common/storage/s3.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('NotesService', () => {
  let service: NotesService;
  let notesRepository: Repository<Note>;
  let tagsRepository: Repository<Tag>;
  let noteTagsRepository: Repository<NoteTag>;
  let ratingSchemaRepository: Repository<RatingSchema>;
  let ratingAxisRepository: Repository<RatingAxis>;
  let noteAxisValueRepository: Repository<NoteAxisValue>;
  let teasService: TeasService;
  let s3Service: S3Service;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockNotesRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockTagsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockNoteTagsRepository = {
    delete: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRatingSchemaRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockRatingAxisRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockNoteAxisValueRepository = {
    delete: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockTeasService = {
    findOne: jest.fn(),
    updateRating: jest.fn(),
  };

  const mockS3Service = {
    deleteFile: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((callback) => callback({
      findOne: jest.fn(),
      count: jest.fn(),
      remove: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        {
          provide: getRepositoryToken(Note),
          useValue: mockNotesRepository,
        },
        {
          provide: getRepositoryToken(Tag),
          useValue: mockTagsRepository,
        },
        {
          provide: getRepositoryToken(NoteTag),
          useValue: mockNoteTagsRepository,
        },
        {
          provide: getRepositoryToken(RatingSchema),
          useValue: mockRatingSchemaRepository,
        },
        {
          provide: getRepositoryToken(RatingAxis),
          useValue: mockRatingAxisRepository,
        },
        {
          provide: getRepositoryToken(NoteAxisValue),
          useValue: mockNoteAxisValueRepository,
        },
        {
          provide: 'DataSource',
          useValue: mockDataSource,
        },
        {
          provide: TeasService,
          useValue: mockTeasService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
    notesRepository = module.get<Repository<Note>>(getRepositoryToken(Note));
    tagsRepository = module.get<Repository<Tag>>(getRepositoryToken(Tag));
    noteTagsRepository = module.get<Repository<NoteTag>>(getRepositoryToken(NoteTag));
    ratingSchemaRepository = module.get<Repository<RatingSchema>>(getRepositoryToken(RatingSchema));
    ratingAxisRepository = module.get<Repository<RatingAxis>>(getRepositoryToken(RatingAxis));
    noteAxisValueRepository = module.get<Repository<NoteAxisValue>>(getRepositoryToken(NoteAxisValue));
    teasService = module.get<TeasService>(TeasService);
    s3Service = module.get<S3Service>(S3Service);

    jest.clearAllMocks();
  });

  describe('getActiveSchemas', () => {
    it('활성 스키마 목록을 반환해야 함', async () => {
      const mockSchemas = [
        {
          id: 1,
          code: 'STANDARD',
          version: '1.0.0',
          nameKo: '차록 표준 평가',
          nameEn: 'ChaLog Standard Rating',
          isActive: true,
        },
      ];

      mockRatingSchemaRepository.find.mockResolvedValue(mockSchemas);

      const result = await service.getActiveSchemas();

      expect(mockRatingSchemaRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockSchemas);
    });
  });

  describe('getSchemaAxes', () => {
    const schemaId = 1;

    it('스키마의 축 목록을 반환해야 함', async () => {
      const mockSchema = {
        id: schemaId,
        code: 'STANDARD',
        version: '1.0.0',
      };

      const mockAxes = [
        {
          id: 1,
          schemaId,
          code: 'RICHNESS',
          nameKo: '풍부함',
          nameEn: 'Richness',
          displayOrder: 1,
        },
        {
          id: 2,
          schemaId,
          code: 'STRENGTH',
          nameKo: '강도',
          nameEn: 'Strength',
          displayOrder: 2,
        },
      ];

      mockRatingSchemaRepository.findOne.mockResolvedValue(mockSchema);
      mockRatingAxisRepository.find.mockResolvedValue(mockAxes);

      const result = await service.getSchemaAxes(schemaId);

      expect(mockRatingSchemaRepository.findOne).toHaveBeenCalledWith({
        where: { id: schemaId },
      });
      expect(mockRatingAxisRepository.find).toHaveBeenCalledWith({
        where: { schemaId },
        order: { displayOrder: 'ASC' },
      });
      expect(result).toEqual(mockAxes);
    });

    it('존재하지 않는 스키마일 때 NotFoundException을 던져야 함', async () => {
      mockRatingSchemaRepository.findOne.mockResolvedValue(null);

      await expect(service.getSchemaAxes(schemaId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create - 새 구조 (스키마/축 값)', () => {
    const userId = 1;
    const teaId = 1;
    const schemaId = 1;

    const mockSchema = {
      id: schemaId,
      code: 'STANDARD',
      version: '1.0.0',
      nameKo: '차록 표준 평가',
      nameEn: 'ChaLog Standard Rating',
    };

    const mockAxes = [
      { id: 1, schemaId, code: 'RICHNESS', nameKo: '풍부함' },
      { id: 2, schemaId, code: 'STRENGTH', nameKo: '강도' },
    ];

    const createNoteDto: CreateNoteDto = {
      teaId,
      schemaId,
      overallRating: 4.0,
      isRatingIncluded: true,
      axisValues: [
        { axisId: 1, value: 4 },
        { axisId: 2, value: 4 },
      ],
      memo: '테스트 메모',
      isPublic: true,
    };

    const mockTea = {
      id: teaId,
      name: '테스트 차',
      type: '홍차',
    };

    const mockNote = {
      id: 1,
      teaId,
      userId,
      schemaId,
      overallRating: 4.0,
      isRatingIncluded: true,
      memo: createNoteDto.memo,
      images: null,
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockTeasService.findOne.mockResolvedValue(mockTea);
      mockRatingSchemaRepository.findOne.mockResolvedValue(mockSchema);
      mockRatingAxisRepository.find.mockResolvedValue(mockAxes);
      mockNotesRepository.create.mockReturnValue(mockNote);
      mockNotesRepository.save.mockResolvedValue(mockNote);
      mockNotesRepository.findOne.mockResolvedValue({
        ...mockNote,
        user: { id: userId, name: '테스트 사용자' },
        tea: mockTea,
        schema: mockSchema,
        noteTags: [],
        axisValues: [],
      });
      mockNotesRepository.find.mockResolvedValue([mockNote]);
      mockTeasService.updateRating.mockResolvedValue(undefined);
      mockNoteAxisValueRepository.create.mockImplementation((av) => av);
      mockNoteAxisValueRepository.save.mockResolvedValue([]);
    });

    it('스키마와 축 값을 포함한 노트를 생성해야 함', async () => {
      const result = await service.create(userId, createNoteDto);

      expect(mockTeasService.findOne).toHaveBeenCalledWith(teaId);
      expect(mockRatingSchemaRepository.findOne).toHaveBeenCalledWith({
        where: { id: schemaId },
      });
      expect(mockRatingAxisRepository.find).toHaveBeenCalledWith({
        where: { id: In([1, 2]) },
      });
      expect(mockNotesRepository.save).toHaveBeenCalled();
      expect(mockNoteAxisValueRepository.delete).toHaveBeenCalledWith({ noteId: mockNote.id });
      expect(mockNoteAxisValueRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('존재하지 않는 스키마일 때 NotFoundException을 던져야 함', async () => {
      mockRatingSchemaRepository.findOne.mockResolvedValue(null);

      await expect(service.create(userId, createNoteDto)).rejects.toThrow(NotFoundException);
    });

    it('유효하지 않은 축 ID가 포함되어 있을 때 BadRequestException을 던져야 함', async () => {
      mockRatingAxisRepository.find.mockResolvedValue([mockAxes[0]]); // 하나만 반환

      await expect(service.create(userId, createNoteDto)).rejects.toThrow(BadRequestException);
    });

    it('isRatingIncluded가 없으면 기본값 true를 사용해야 함', async () => {
      const dtoWithoutRatingIncluded = {
        ...createNoteDto,
        isRatingIncluded: undefined,
      };

      await service.create(userId, dtoWithoutRatingIncluded);

      expect(mockNotesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isRatingIncluded: true,
        }),
      );
    });
  });

  describe('update - 새 구조 (스키마/축 값)', () => {
    const userId = 1;
    const noteId = 1;
    const schemaId = 1;

    const mockNote = {
      id: noteId,
      teaId: 1,
      userId,
      schemaId,
      overallRating: 4.0,
      isRatingIncluded: true,
      memo: '테스트 메모',
      images: null,
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockSchema = {
      id: schemaId,
      code: 'STANDARD',
      version: '1.0.0',
    };

    const mockAxes = [
      { id: 1, schemaId, code: 'RICHNESS' },
      { id: 2, schemaId, code: 'STRENGTH' },
    ];

    beforeEach(() => {
      mockNotesRepository.findOne.mockResolvedValue({
        ...mockNote,
        user: { id: userId, name: '테스트 사용자' },
        tea: { id: 1, name: '테스트 차' },
        schema: mockSchema,
        noteTags: [],
        axisValues: [],
      });
      mockNotesRepository.save.mockResolvedValue(mockNote);
      mockNotesRepository.find.mockResolvedValue([mockNote]);
      mockTeasService.updateRating.mockResolvedValue(undefined);
    });

    it('축 값을 업데이트해야 함', async () => {
      const updateNoteDto: UpdateNoteDto = {
        axisValues: [
          { axisId: 1, value: 5 },
          { axisId: 2, value: 4 },
        ],
      };

      mockRatingAxisRepository.find.mockResolvedValue(mockAxes);
      mockNoteAxisValueRepository.create.mockImplementation((av) => av);
      mockNoteAxisValueRepository.save.mockResolvedValue([]);

      await service.update(noteId, userId, updateNoteDto);

      expect(mockNoteAxisValueRepository.delete).toHaveBeenCalledWith({ noteId });
      expect(mockRatingAxisRepository.find).toHaveBeenCalledWith({
        where: { id: In([1, 2]) },
      });
      expect(mockNoteAxisValueRepository.save).toHaveBeenCalled();
    });

    it('스키마 ID를 변경할 때 스키마 존재 확인해야 함', async () => {
      const newSchemaId = 2;
      const updateNoteDto: UpdateNoteDto = {
        schemaId: newSchemaId,
      };

      const newSchema = {
        id: newSchemaId,
        code: 'STANDARD',
        version: '2.0.0',
      };

      mockRatingSchemaRepository.findOne.mockResolvedValue(newSchema);

      await service.update(noteId, userId, updateNoteDto);

      expect(mockRatingSchemaRepository.findOne).toHaveBeenCalledWith({
        where: { id: newSchemaId },
      });
    });

    it('존재하지 않는 스키마로 변경 시도 시 NotFoundException을 던져야 함', async () => {
      const updateNoteDto: UpdateNoteDto = {
        schemaId: 999,
      };

      mockRatingSchemaRepository.findOne.mockResolvedValue(null);

      await expect(service.update(noteId, userId, updateNoteDto)).rejects.toThrow(NotFoundException);
    });

    it('axisValues가 없으면 축 값 업데이트를 건너뛰어야 함', async () => {
      const updateNoteDto: UpdateNoteDto = {
        memo: '업데이트된 메모',
      };

      await service.update(noteId, userId, updateNoteDto);

      expect(mockNoteAxisValueRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateTeaRating - 새 구조', () => {
    const teaId = 1;

    it('isRatingIncluded가 true인 노트만 평점 계산에 포함해야 함', async () => {
      const notes = [
        {
          id: 1,
          teaId,
          overallRating: 4.0,
          isRatingIncluded: true,
        },
        {
          id: 2,
          teaId,
          overallRating: 5.0,
          isRatingIncluded: false, // 제외됨
        },
        {
          id: 3,
          teaId,
          overallRating: 3.0,
          isRatingIncluded: true,
        },
      ];

      mockNotesRepository.find.mockResolvedValue(notes);
      mockTeasService.updateRating.mockResolvedValue(undefined);

      await service['updateTeaRating'](teaId);

      expect(mockNotesRepository.find).toHaveBeenCalledWith({
        where: { teaId, isRatingIncluded: true },
      });
      expect(mockTeasService.updateRating).toHaveBeenCalledWith(teaId, 3.5, 2); // (4.0 + 3.0) / 2
    });

    it('overallRating이 null인 노트는 평점 계산에서 제외해야 함', async () => {
      const notes = [
        {
          id: 1,
          teaId,
          overallRating: 4.0,
          isRatingIncluded: true,
        },
        {
          id: 2,
          teaId,
          overallRating: null,
          isRatingIncluded: true,
        },
      ];

      mockNotesRepository.find.mockResolvedValue(notes);
      mockTeasService.updateRating.mockResolvedValue(undefined);

      await service['updateTeaRating'](teaId);

      expect(mockTeasService.updateRating).toHaveBeenCalledWith(teaId, 4.0, 1);
    });

    it('평점이 포함된 노트가 없으면 평점을 0으로 설정해야 함', async () => {
      mockNotesRepository.find.mockResolvedValue([]);
      mockTeasService.updateRating.mockResolvedValue(undefined);

      await service['updateTeaRating'](teaId);

      expect(mockTeasService.updateRating).toHaveBeenCalledWith(teaId, 0, 0);
    });
  });

  describe('태그 기능 (기존 테스트 유지)', () => {
    const userId = 1;
    const teaId = 1;
    const schemaId = 1;

    const mockSchema = {
      id: schemaId,
      code: 'STANDARD',
      version: '1.0.0',
    };

    const createNoteDto: CreateNoteDto = {
      teaId,
      schemaId,
      overallRating: 4.0,
      isRatingIncluded: true,
      axisValues: [{ axisId: 1, value: 4 }],
      memo: '테스트 메모',
      tags: ['풀향', '허브향', '초콜릿향'],
      isPublic: true,
    };

    const mockTea = {
      id: teaId,
      name: '테스트 차',
      type: '홍차',
    };

    const mockNote = {
      id: 1,
      teaId,
      userId,
      schemaId,
      overallRating: 4.0,
      isRatingIncluded: true,
      memo: createNoteDto.memo,
      images: null,
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockTeasService.findOne.mockResolvedValue(mockTea);
      mockRatingSchemaRepository.findOne.mockResolvedValue(mockSchema);
      mockRatingAxisRepository.find.mockResolvedValue([{ id: 1, schemaId }]);
      mockNotesRepository.create.mockReturnValue(mockNote);
      mockNotesRepository.save.mockResolvedValue(mockNote);
      mockNotesRepository.findOne.mockResolvedValue({
        ...mockNote,
        user: { id: userId, name: '테스트 사용자' },
        tea: mockTea,
        schema: mockSchema,
        noteTags: [],
        axisValues: [],
      });
      mockNotesRepository.find.mockResolvedValue([mockNote]);
      mockTeasService.updateRating.mockResolvedValue(undefined);
      mockNoteAxisValueRepository.create.mockImplementation((av) => av);
      mockNoteAxisValueRepository.save.mockResolvedValue([]);
    });

    it('태그가 포함된 노트를 생성해야 함', async () => {
      mockTagsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const mockTags = [
        { id: 1, name: '풀향' },
        { id: 2, name: '허브향' },
        { id: 3, name: '초콜릿향' },
      ];

      mockTagsRepository.create.mockImplementation((tag) => tag);
      mockTagsRepository.save
        .mockResolvedValueOnce(mockTags[0])
        .mockResolvedValueOnce(mockTags[1])
        .mockResolvedValueOnce(mockTags[2]);

      mockNoteTagsRepository.create.mockImplementation((noteTag) => noteTag);
      mockNoteTagsRepository.save.mockResolvedValue([]);

      const result = await service.create(userId, createNoteDto);

      expect(mockTagsRepository.findOne).toHaveBeenCalledTimes(3);
      expect(mockTagsRepository.create).toHaveBeenCalledTimes(3);
      expect(mockTagsRepository.save).toHaveBeenCalledTimes(3);
      expect(mockNoteTagsRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
