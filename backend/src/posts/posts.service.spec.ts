import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { UsersService } from '../users/users.service';
import { Post, PostCategory } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostBookmark } from './entities/post-bookmark.entity';
import { PostImage } from './entities/post-image.entity';

describe('PostsService', () => {
  let service: PostsService;

  const mockLikeQb = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockPostQb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const mockPostsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    increment: jest.fn(),
    createQueryBuilder: jest.fn(() => mockPostQb),
  };

  const mockPostLikesRepository = {
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(() => mockLikeQb),
  };

  const mockPostBookmarksRepository = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockPostImagesRepository = {
    create: jest.fn(),
    save: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const mockUsersService = {
    findOne: jest.fn().mockResolvedValue({ id: 1, name: '테스터', role: 'user' }),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: getRepositoryToken(Post), useValue: mockPostsRepository },
        { provide: getRepositoryToken(PostLike), useValue: mockPostLikesRepository },
        { provide: getRepositoryToken(PostBookmark), useValue: mockPostBookmarksRepository },
        { provide: getRepositoryToken(PostImage), useValue: mockPostImagesRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    jest.clearAllMocks();

    mockPostLikesRepository.find.mockResolvedValue([]);
    mockPostBookmarksRepository.find.mockResolvedValue([]);
    mockLikeQb.getRawMany.mockResolvedValue([]);
    mockPostQb.getMany.mockResolvedValue([]);
  });

  describe('create', () => {
    it('게시글을 생성하고 반환한다', async () => {
      const dto = {
        title: '우림 질문',
        content: '내용',
        category: PostCategory.BREWING_QUESTION,
      };
      const savedPost = { id: 1, ...dto, userId: 1, isSponsored: false, sponsorNote: null };

      mockPostsRepository.create.mockReturnValue(savedPost);
      mockPostsRepository.save.mockResolvedValue(savedPost);
      mockPostsRepository.findOne.mockResolvedValue({ ...savedPost, user: { id: 1, name: '테스터' } });
      mockLikeQb.getRawMany.mockResolvedValue([]);
      mockPostLikesRepository.find.mockResolvedValue([]);
      mockPostBookmarksRepository.find.mockResolvedValue([]);

      const result = await service.create(1, dto as any);
      expect(result).toBeDefined();
      expect(mockPostsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: '우림 질문', userId: 1 }),
      );
    });
  });

  describe('findAll', () => {
    it('게시글 목록을 반환한다', async () => {
      mockPostQb.getMany.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });

    it('카테고리 필터를 적용한다', async () => {
      mockPostQb.getMany.mockResolvedValue([]);
      await service.findAll(PostCategory.RECOMMENDATION);
      expect(mockPostQb.where).toHaveBeenCalledWith(
        'post.category = :category',
        { category: PostCategory.RECOMMENDATION },
      );
    });
  });

  describe('findOne', () => {
    it('게시글이 없으면 NotFoundException을 던진다', async () => {
      mockPostsRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('게시글을 반환한다', async () => {
      const post = { id: 1, title: '제목', userId: 1, user: { id: 1, name: '테스터' } };
      mockPostsRepository.findOne.mockResolvedValue(post);
      mockLikeQb.getRawMany.mockResolvedValue([]);
      mockPostLikesRepository.find.mockResolvedValue([]);
      mockPostBookmarksRepository.find.mockResolvedValue([]);

      const result = await service.findOne(1);
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('게시글이 없으면 NotFoundException을 던진다', async () => {
      mockPostsRepository.findOne.mockResolvedValue(null);
      await expect(service.update(999, 1, {} as any)).rejects.toThrow(NotFoundException);
    });

    it('작성자가 아니면 ForbiddenException을 던진다', async () => {
      mockPostsRepository.findOne.mockResolvedValue({ id: 1, userId: 2 });
      await expect(service.update(1, 1, {} as any)).rejects.toThrow(ForbiddenException);
    });

    it('게시글을 수정한다', async () => {
      const post = { id: 1, userId: 1, title: '원래제목', user: { id: 1, name: '테스터' } };
      mockPostsRepository.findOne
        .mockResolvedValueOnce(post)
        .mockResolvedValueOnce({ ...post, title: '수정제목', user: { id: 1, name: '테스터' } });
      mockPostsRepository.save.mockResolvedValue({ ...post, title: '수정제목' });
      mockLikeQb.getRawMany.mockResolvedValue([]);
      mockPostLikesRepository.find.mockResolvedValue([]);
      mockPostBookmarksRepository.find.mockResolvedValue([]);

      const result = await service.update(1, 1, { title: '수정제목' } as any);
      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('게시글이 없으면 NotFoundException을 던진다', async () => {
      mockPostsRepository.findOne.mockResolvedValue(null);
      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('작성자가 아니면 ForbiddenException을 던진다', async () => {
      mockPostsRepository.findOne.mockResolvedValue({ id: 1, userId: 2 });
      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('게시글을 삭제한다', async () => {
      const post = { id: 1, userId: 1 };
      mockPostsRepository.findOne.mockResolvedValue(post);
      mockPostsRepository.remove.mockResolvedValue(post);
      await expect(service.remove(1, 1)).resolves.toBeUndefined();
    });
  });

  describe('toggleLike', () => {
    it('좋아요 토글을 처리한다', async () => {
      mockDataSource.transaction.mockImplementation(async (fn) => {
        const manager = {
          findOne: jest.fn()
            .mockResolvedValueOnce({ id: 1, userId: 1 })
            .mockResolvedValueOnce(null),
          create: jest.fn().mockReturnValue({}),
          save: jest.fn().mockResolvedValue({}),
          count: jest.fn().mockResolvedValue(1),
        };
        return fn(manager);
      });

      const result = await service.toggleLike(1, 1);
      expect(result).toEqual({ liked: true, likeCount: 1 });
    });
  });

  describe('toggleBookmark', () => {
    it('북마크 토글을 처리한다', async () => {
      mockDataSource.transaction.mockImplementation(async (fn) => {
        const manager = {
          findOne: jest.fn()
            .mockResolvedValueOnce({ id: 1, userId: 1 })
            .mockResolvedValueOnce(null),
          create: jest.fn().mockReturnValue({}),
          save: jest.fn().mockResolvedValue({}),
        };
        return fn(manager);
      });

      const result = await service.toggleBookmark(1, 1);
      expect(result).toEqual({ bookmarked: true });
    });
  });
});
