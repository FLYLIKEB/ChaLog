import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TagsService } from './tags.service';
import { Tag } from '../notes/entities/tag.entity';
import { NoteTag } from '../notes/entities/note-tag.entity';
import { Note } from '../notes/entities/note.entity';
import { NoteLike } from '../notes/entities/note-like.entity';
import { NoteBookmark } from '../notes/entities/note-bookmark.entity';
import { TagFollow } from '../notes/entities/tag-follow.entity';

describe('TagsService - getByCategory & getPopularTags with category', () => {
  let service: TagsService;

  const mockTagsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockNoteTagQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  const mockNoteTagsRepository = {
    createQueryBuilder: jest.fn(() => mockNoteTagQueryBuilder),
    find: jest.fn(),
    count: jest.fn(),
  };

  const mockNotesRepository = { find: jest.fn() };
  const mockNoteLikesRepository = { find: jest.fn() };
  const mockNoteBookmarksRepository = { find: jest.fn() };
  const mockTagFollowsRepository = {
    count: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: getRepositoryToken(Tag), useValue: mockTagsRepository },
        { provide: getRepositoryToken(NoteTag), useValue: mockNoteTagsRepository },
        { provide: getRepositoryToken(Note), useValue: mockNotesRepository },
        { provide: getRepositoryToken(NoteLike), useValue: mockNoteLikesRepository },
        { provide: getRepositoryToken(NoteBookmark), useValue: mockNoteBookmarksRepository },
        { provide: getRepositoryToken(TagFollow), useValue: mockTagFollowsRepository },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  describe('getByCategory', () => {
    it('풍미 태그를 카테고리로 조회하여 반환한다', async () => {
      const flavorTags = [
        { id: 1, name: '꽃향', category: 'flavor' as const },
        { id: 2, name: '과일향', category: 'flavor' as const },
      ];
      mockTagsRepository.find.mockResolvedValue(flavorTags);
      mockNoteTagQueryBuilder.getRawMany.mockResolvedValue([
        { tagId: '1', noteCount: '3' },
        { tagId: '2', noteCount: '5' },
      ]);

      const result = await service.getByCategory('flavor');

      expect(mockTagsRepository.find).toHaveBeenCalledWith({
        where: { category: 'flavor' },
        order: { name: 'ASC' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: '꽃향', noteCount: 3, isFollowing: false });
      expect(result[1]).toEqual({ name: '과일향', noteCount: 5, isFollowing: false });
    });

    it('카테고리에 태그가 없으면 빈 배열을 반환한다', async () => {
      mockTagsRepository.find.mockResolvedValue([]);

      const result = await service.getByCategory('flavor');

      expect(result).toEqual([]);
    });

    it('노트가 없는 태그의 noteCount는 0이다', async () => {
      mockTagsRepository.find.mockResolvedValue([{ id: 3, name: '민트향', category: 'flavor' as const }]);
      mockNoteTagQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.getByCategory('flavor');

      expect(result[0].noteCount).toBe(0);
    });
  });

  describe('getPopularTags with category filter', () => {
    it('category 파라미터가 있으면 andWhere로 필터링한다', async () => {
      mockNoteTagQueryBuilder.getRawMany.mockResolvedValue([]);
      mockTagsRepository.find.mockResolvedValue([]);
      mockTagFollowsRepository.find.mockResolvedValue([]);

      await service.getPopularTags(10, undefined, 'flavor');

      expect(mockNoteTagQueryBuilder.andWhere).toHaveBeenCalledWith('tag.category = :category', { category: 'flavor' });
    });

    it('category가 없으면 필터링하지 않는다', async () => {
      mockNoteTagQueryBuilder.getRawMany.mockResolvedValue([]);

      await service.getPopularTags(10, undefined, undefined);

      const andWhereCalls = mockNoteTagQueryBuilder.andWhere.mock.calls;
      expect(andWhereCalls.every((args: unknown[]) => !String(args[0]).includes('category'))).toBe(true);
    });
  });
});
