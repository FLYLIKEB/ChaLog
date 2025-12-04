import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotesService } from './notes.service';
import { Note } from './entities/note.entity';
import { Tag } from './entities/tag.entity';
import { NoteTag } from './entities/note-tag.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { TeasService } from '../teas/teas.service';
import { S3Service } from '../common/storage/s3.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('NotesService - 태그 기능', () => {
  let service: NotesService;
  let notesRepository: Repository<Note>;
  let tagsRepository: Repository<Tag>;
  let noteTagsRepository: Repository<NoteTag>;
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

  const mockTeasService = {
    findOne: jest.fn(),
    updateRating: jest.fn(),
  };

  const mockS3Service = {
    deleteFile: jest.fn(),
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
    teasService = module.get<TeasService>(TeasService);
    s3Service = module.get<S3Service>(S3Service);

    jest.clearAllMocks();
  });

  describe('create - 태그가 포함된 노트 생성', () => {
    const userId = 1;
    const teaId = 1;
    const createNoteDto: CreateNoteDto = {
      teaId,
      rating: 4,
      ratings: {
        richness: 4,
        strength: 3,
        smoothness: 4,
        clarity: 5,
        complexity: 4,
      },
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
      rating: 4,
      ratings: createNoteDto.ratings,
      memo: createNoteDto.memo,
      images: null,
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockTeasService.findOne.mockResolvedValue(mockTea);
      mockNotesRepository.create.mockReturnValue(mockNote);
      mockNotesRepository.save.mockResolvedValue(mockNote);
      mockNotesRepository.findOne.mockResolvedValue({
        ...mockNote,
        user: { id: userId, name: '테스트 사용자' },
        tea: mockTea,
        noteTags: [],
      });
      mockNotesRepository.find.mockResolvedValue([mockNote]);
      mockTeasService.updateRating.mockResolvedValue(undefined);
    });

    it('태그가 포함된 노트를 생성해야 함', async () => {
      // 기존 태그가 없는 경우 (새로 생성)
      mockTagsRepository.findOne
        .mockResolvedValueOnce(null) // 풀향 - 없음
        .mockResolvedValueOnce(null) // 허브향 - 없음
        .mockResolvedValueOnce(null); // 초콜릿향 - 없음

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

      expect(mockTeasService.findOne).toHaveBeenCalledWith(teaId);
      expect(mockNotesRepository.save).toHaveBeenCalled();
      expect(mockTagsRepository.findOne).toHaveBeenCalledTimes(3);
      expect(mockTagsRepository.create).toHaveBeenCalledTimes(3);
      expect(mockTagsRepository.save).toHaveBeenCalledTimes(3);
      expect(mockNoteTagsRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('기존 태그를 재사용해야 함', async () => {
      const existingTags = [
        { id: 1, name: '풀향' },
        { id: 2, name: '허브향' },
        { id: 3, name: '초콜릿향' },
      ];

      // 모든 태그가 이미 존재
      mockTagsRepository.findOne
        .mockResolvedValueOnce(existingTags[0])
        .mockResolvedValueOnce(existingTags[1])
        .mockResolvedValueOnce(existingTags[2]);

      mockNoteTagsRepository.create.mockImplementation((noteTag) => noteTag);
      mockNoteTagsRepository.save.mockResolvedValue([]);

      await service.create(userId, createNoteDto);

      expect(mockTagsRepository.findOne).toHaveBeenCalledTimes(3);
      expect(mockTagsRepository.create).not.toHaveBeenCalled();
      expect(mockTagsRepository.save).not.toHaveBeenCalled();
      expect(mockNoteTagsRepository.save).toHaveBeenCalled();
    });

    it('태그가 없으면 태그 처리를 건너뛰어야 함', async () => {
      const dtoWithoutTags: CreateNoteDto = {
        teaId,
        rating: 4,
        ratings: createNoteDto.ratings,
        memo: '테스트 메모',
        isPublic: true,
      };

      const result = await service.create(userId, dtoWithoutTags);

      expect(mockTagsRepository.findOne).not.toHaveBeenCalled();
      expect(mockNoteTagsRepository.save).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('빈 태그 배열이면 태그 처리를 건너뛰어야 함', async () => {
      const dtoWithEmptyTags: CreateNoteDto = {
        ...createNoteDto,
        tags: [],
      };

      const result = await service.create(userId, dtoWithEmptyTags);

      expect(mockTagsRepository.findOne).not.toHaveBeenCalled();
      expect(mockNoteTagsRepository.save).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('update - 태그 업데이트', () => {
    const userId = 1;
    const noteId = 1;
    const updateNoteDto: UpdateNoteDto = {
      tags: ['새태그1', '새태그2'],
    };

    const mockNote = {
      id: noteId,
      teaId: 1,
      userId,
      rating: 4,
      ratings: {
        richness: 4,
        strength: 3,
        smoothness: 4,
        clarity: 5,
        complexity: 4,
      },
      memo: '테스트 메모',
      images: null,
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockNotesRepository.findOne.mockResolvedValue({
        ...mockNote,
        user: { id: userId, name: '테스트 사용자' },
        tea: { id: 1, name: '테스트 차' },
        noteTags: [],
      });
      mockNotesRepository.save.mockResolvedValue(mockNote);
      mockNotesRepository.find.mockResolvedValue([mockNote]);
      mockTeasService.updateRating.mockResolvedValue(undefined);
    });

    it('태그를 업데이트해야 함', async () => {
      mockTagsRepository.findOne
        .mockResolvedValueOnce(null) // 새태그1 - 없음
        .mockResolvedValueOnce(null); // 새태그2 - 없음

      const mockTags = [
        { id: 1, name: '새태그1' },
        { id: 2, name: '새태그2' },
      ];

      mockTagsRepository.create.mockImplementation((tag) => tag);
      mockTagsRepository.save
        .mockResolvedValueOnce(mockTags[0])
        .mockResolvedValueOnce(mockTags[1]);

      mockNoteTagsRepository.delete.mockResolvedValue({ affected: 0 });
      mockNoteTagsRepository.create.mockImplementation((noteTag) => noteTag);
      mockNoteTagsRepository.save.mockResolvedValue([]);

      await service.update(noteId, userId, updateNoteDto);

      expect(mockNoteTagsRepository.delete).toHaveBeenCalledWith({ noteId });
      expect(mockTagsRepository.findOne).toHaveBeenCalledTimes(2);
      expect(mockNoteTagsRepository.save).toHaveBeenCalled();
    });

    it('태그를 빈 배열로 업데이트하면 모든 태그가 삭제되어야 함', async () => {
      mockNoteTagsRepository.delete.mockResolvedValue({ affected: 2 });

      await service.update(noteId, userId, { tags: [] });

      expect(mockNoteTagsRepository.delete).toHaveBeenCalledWith({ noteId });
      expect(mockTagsRepository.findOne).not.toHaveBeenCalled();
      expect(mockNoteTagsRepository.save).not.toHaveBeenCalled();
    });

    it('tags 필드가 없으면 태그 업데이트를 건너뛰어야 함', async () => {
      const dtoWithoutTags = { memo: '업데이트된 메모' };

      await service.update(noteId, userId, dtoWithoutTags);

      expect(mockNoteTagsRepository.delete).not.toHaveBeenCalled();
      expect(mockTagsRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findOne - 태그 포함 조회', () => {
    const noteId = 1;
    const userId = 1;

    const mockNote = {
      id: noteId,
      teaId: 1,
      userId,
      rating: 4,
      ratings: {
        richness: 4,
        strength: 3,
        smoothness: 4,
        clarity: 5,
        complexity: 4,
      },
      memo: '테스트 메모',
      images: null,
      isPublic: true,
      user: { id: userId, name: '테스트 사용자' },
      tea: { id: 1, name: '테스트 차' },
      noteTags: [
        {
          id: 1,
          noteId,
          tagId: 1,
          tag: { id: 1, name: '풀향' },
        },
        {
          id: 2,
          noteId,
          tagId: 2,
          tag: { id: 2, name: '허브향' },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('태그가 포함된 노트를 조회해야 함', async () => {
      mockNotesRepository.findOne.mockResolvedValue(mockNote);

      const result = await service.findOne(noteId, userId);

      expect(mockNotesRepository.findOne).toHaveBeenCalledWith({
        where: { id: noteId },
        relations: ['user', 'tea', 'noteTags', 'noteTags.tag'],
      });
      expect(result.noteTags).toHaveLength(2);
      expect(result.noteTags[0].tag.name).toBe('풀향');
      expect(result.noteTags[1].tag.name).toBe('허브향');
    });
  });

  describe('remove - 태그가 포함된 노트 삭제', () => {
    const noteId = 1;
    const userId = 1;

    const mockNote = {
      id: noteId,
      teaId: 1,
      userId,
      rating: 4,
      ratings: {
        richness: 4,
        strength: 3,
        smoothness: 4,
        clarity: 5,
        complexity: 4,
      },
      memo: '테스트 메모',
      images: null,
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockNotesRepository.findOne.mockResolvedValue(mockNote);
      mockNotesRepository.remove.mockResolvedValue(mockNote);
      mockNotesRepository.find.mockResolvedValue([mockNote]);
      mockTeasService.updateRating.mockResolvedValue(undefined);
    });

    it('태그가 포함된 노트를 삭제해야 함', async () => {
      await service.remove(noteId, userId);

      expect(mockNotesRepository.findOne).toHaveBeenCalledWith({
        where: { id: noteId },
      });
      expect(mockNotesRepository.remove).toHaveBeenCalledWith(mockNote);
      // CASCADE 설정으로 note_tags도 자동 삭제됨
    });
  });
});

