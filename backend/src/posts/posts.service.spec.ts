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

    // create/update use transaction; provide a manager that delegates to repository mocks
    mockDataSource.transaction.mockImplementation(async (fn) => {
      const manager = {
        create: jest.fn((Entity: any, data: any) => ({ ...data })),
        save: jest.fn().mockImplementation(async (Entity: any, entity: any) => {
          if (Entity === Post) return { ...entity, id: entity.id ?? 1 };
          return Array.isArray(entity) ? entity : { ...entity };
        }),
        findOne: jest.fn().mockResolvedValue(null),
        delete: jest.fn().mockResolvedValue(undefined),
      };
      return fn(manager);
    });
  });

  describe('create', () => {
    it('게시글을 생성하고 반환한다', async () => {
      const dto = {
        title: '우림 질문',
        content: '내용',
        category: PostCategory.BREWING_QUESTION,
      };
      const savedPost = { id: 1, ...dto, userId: 1, isSponsored: false, sponsorNote: null };

      mockPostsRepository.findOne.mockResolvedValue({ ...savedPost, user: { id: 1, name: '테스터' } });
      mockLikeQb.getRawMany.mockResolvedValue([]);
      mockPostLikesRepository.find.mockResolvedValue([]);
      mockPostBookmarksRepository.find.mockResolvedValue([]);

      const result = await service.create(1, dto as any);
      expect(result).toBeDefined();
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('이미지와 함께 게시글을 생성한다', async () => {
      const dto = {
        title: '이미지 포함',
        content: '내용',
        category: PostCategory.BREWING_QUESTION,
        images: [
          { url: 'https://example.com/1.jpg', caption: '첫 이미지' },
          { url: 'https://example.com/2.jpg', thumbnailUrl: 'https://example.com/thumb.jpg', caption: '두 번째' },
        ],
      };
      const savedPost = { id: 1, ...dto, userId: 1, isSponsored: false, sponsorNote: null, images: undefined };

      let savedPostImages: any[] = [];
      mockDataSource.transaction.mockImplementation(async (fn) => {
        const manager = {
          create: jest.fn((Entity: any, data: any) => ({ ...data })),
          save: jest.fn().mockImplementation(async (Entity: any, entity: any) => {
            if (Entity === Post) return { ...entity, id: 1 };
            if (Entity === PostImage) {
              savedPostImages = Array.isArray(entity) ? entity : [entity];
              return entity;
            }
            return entity;
          }),
          findOne: jest.fn().mockResolvedValue(null),
          delete: jest.fn().mockResolvedValue(undefined),
        };
        return fn(manager);
      });
      mockPostsRepository.findOne.mockResolvedValue({
        ...savedPost,
        user: { id: 1, name: '테스터' },
        images: [
          { url: 'https://example.com/1.jpg', caption: '첫 이미지', sortOrder: 0 },
          { url: 'https://example.com/2.jpg', thumbnailUrl: 'https://example.com/thumb.jpg', caption: '두 번째', sortOrder: 1 },
        ],
      });
      mockLikeQb.getRawMany.mockResolvedValue([]);
      mockPostLikesRepository.find.mockResolvedValue([]);
      mockPostBookmarksRepository.find.mockResolvedValue([]);

      const result = await service.create(1, dto as any);
      expect(result).toBeDefined();
      expect(result.images).toHaveLength(2);
      expect(savedPostImages).toHaveLength(2);
      expect(savedPostImages[0]).toMatchObject({
        postId: 1,
        url: 'https://example.com/1.jpg',
        caption: '첫 이미지',
        sortOrder: 0,
      });
      expect(savedPostImages[1]).toMatchObject({
        postId: 1,
        url: 'https://example.com/2.jpg',
        caption: '두 번째',
        sortOrder: 1,
      });
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
      mockDataSource.transaction.mockImplementation(async (fn) => {
        const manager = {
          create: jest.fn((Entity: any, data: any) => ({ ...data })),
          save: jest.fn().mockResolvedValue({}),
          findOne: jest.fn().mockResolvedValue(null),
          delete: jest.fn().mockResolvedValue(undefined),
        };
        return fn(manager);
      });
      await expect(service.update(999, 1, {} as any)).rejects.toThrow(NotFoundException);
    });

    it('작성자가 아니면 ForbiddenException을 던진다', async () => {
      mockDataSource.transaction.mockImplementation(async (fn) => {
        const manager = {
          create: jest.fn((Entity: any, data: any) => ({ ...data })),
          save: jest.fn().mockResolvedValue({}),
          findOne: jest.fn().mockResolvedValue({ id: 1, userId: 2 }),
          delete: jest.fn().mockResolvedValue(undefined),
        };
        return fn(manager);
      });
      await expect(service.update(1, 1, {} as any)).rejects.toThrow(ForbiddenException);
    });

    it('게시글을 수정한다', async () => {
      const post = { id: 1, userId: 1, title: '원래제목', user: { id: 1, name: '테스터' } };
      mockDataSource.transaction.mockImplementation(async (fn) => {
        const manager = {
          create: jest.fn((Entity: any, data: any) => ({ ...data })),
          save: jest.fn().mockResolvedValue({ ...post, title: '수정제목' }),
          findOne: jest.fn().mockResolvedValue(post),
          delete: jest.fn().mockResolvedValue(undefined),
        };
        return fn(manager);
      });
      mockPostsRepository.findOne.mockResolvedValue({ ...post, title: '수정제목', user: { id: 1, name: '테스터' } });
      mockLikeQb.getRawMany.mockResolvedValue([]);
      mockPostLikesRepository.find.mockResolvedValue([]);
      mockPostBookmarksRepository.find.mockResolvedValue([]);

      const result = await service.update(1, 1, { title: '수정제목' } as any);
      expect(result).toBeDefined();
    });

    it('이미지를 수정한다', async () => {
      const post = { id: 1, userId: 1, title: '제목', user: { id: 1, name: '테스터' } };
      let deletedPostId: number | null = null;
      let savedImages: any[] = [];
      mockDataSource.transaction.mockImplementation(async (fn) => {
        const manager = {
          create: jest.fn((Entity: any, data: any) => ({ ...data })),
          save: jest.fn().mockImplementation(async (Entity: any, entity: any) => {
            if (Entity === Post) return { ...entity };
            if (Entity === PostImage) {
              savedImages = Array.isArray(entity) ? entity : [entity];
              return entity;
            }
            return entity;
          }),
          findOne: jest.fn().mockResolvedValue(post),
          delete: jest.fn().mockImplementation(async (Entity: any, criteria: any) => {
            if (Entity === PostImage && criteria) deletedPostId = criteria.postId;
            return undefined;
          }),
        };
        return fn(manager);
      });
      mockPostsRepository.findOne.mockResolvedValue({
        ...post,
        title: '수정제목',
        images: [{ url: 'https://example.com/new.jpg', caption: '새 이미지', sortOrder: 0 }],
      });
      mockLikeQb.getRawMany.mockResolvedValue([]);
      mockPostLikesRepository.find.mockResolvedValue([]);
      mockPostBookmarksRepository.find.mockResolvedValue([]);

      const result = await service.update(1, 1, {
        title: '수정제목',
        images: [{ url: 'https://example.com/new.jpg', caption: '새 이미지' }],
      } as any);
      expect(result).toBeDefined();
      expect(deletedPostId).toBe(1);
      expect(savedImages).toHaveLength(1);
      expect(savedImages[0]).toMatchObject({
        postId: 1,
        url: 'https://example.com/new.jpg',
        caption: '새 이미지',
        sortOrder: 0,
      });
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
