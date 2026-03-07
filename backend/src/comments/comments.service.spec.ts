import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { Post } from '../posts/entities/post.entity';

describe('CommentsService', () => {
  let service: CommentsService;

  const mockCommentsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockPostsRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: getRepositoryToken(Comment), useValue: mockCommentsRepository },
        { provide: getRepositoryToken(Post), useValue: mockPostsRepository },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    jest.clearAllMocks();
  });

  describe('findByPost', () => {
    it('게시글이 없으면 NotFoundException을 던진다', async () => {
      mockPostsRepository.findOne.mockResolvedValue(null);
      await expect(service.findByPost(999)).rejects.toThrow(NotFoundException);
    });

    it('댓글 목록을 반환한다', async () => {
      mockPostsRepository.findOne.mockResolvedValue({ id: 1 });
      mockCommentsRepository.find.mockResolvedValue([
        { id: 1, postId: 1, content: '댓글', user: { id: 1, name: '테스터' } },
      ]);
      const result = await service.findByPost(1);
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('게시글이 없으면 NotFoundException을 던진다', async () => {
      mockPostsRepository.findOne.mockResolvedValue(null);
      await expect(service.create(999, 1, { content: '댓글' })).rejects.toThrow(NotFoundException);
    });

    it('댓글을 생성하고 반환한다', async () => {
      const post = { id: 1 };
      const comment = { id: 1, postId: 1, userId: 1, content: '댓글', user: { id: 1, name: '테스터' } };
      mockPostsRepository.findOne.mockResolvedValue(post);
      mockCommentsRepository.create.mockReturnValue({ postId: 1, userId: 1, content: '댓글' });
      mockCommentsRepository.save.mockResolvedValue({ id: 1 });
      mockCommentsRepository.findOne.mockResolvedValue(comment);

      const result = await service.create(1, 1, { content: '댓글' });
      expect(result.content).toBe('댓글');
    });
  });

  describe('update', () => {
    it('댓글이 없으면 NotFoundException을 던진다', async () => {
      mockCommentsRepository.findOne.mockResolvedValue(null);
      await expect(service.update(999, 1, { content: '수정' })).rejects.toThrow(NotFoundException);
    });

    it('작성자가 아니면 ForbiddenException을 던진다', async () => {
      mockCommentsRepository.findOne.mockResolvedValue({ id: 1, userId: 2 });
      await expect(service.update(1, 1, { content: '수정' })).rejects.toThrow(ForbiddenException);
    });

    it('댓글을 수정한다', async () => {
      const comment = { id: 1, userId: 1, content: '원래', user: { id: 1 } };
      mockCommentsRepository.findOne
        .mockResolvedValueOnce(comment)
        .mockResolvedValueOnce({ ...comment, content: '수정됨' });
      mockCommentsRepository.save.mockResolvedValue({ ...comment, content: '수정됨' });

      const result = await service.update(1, 1, { content: '수정됨' });
      expect(result.content).toBe('수정됨');
    });
  });

  describe('remove', () => {
    it('댓글이 없으면 NotFoundException을 던진다', async () => {
      mockCommentsRepository.findOne.mockResolvedValue(null);
      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('작성자가 아니면 ForbiddenException을 던진다', async () => {
      mockCommentsRepository.findOne.mockResolvedValue({ id: 1, userId: 2 });
      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
    });

    it('댓글을 삭제한다', async () => {
      const comment = { id: 1, userId: 1 };
      mockCommentsRepository.findOne.mockResolvedValue(comment);
      mockCommentsRepository.remove.mockResolvedValue(comment);
      await expect(service.remove(1, 1)).resolves.toBeUndefined();
    });
  });
});
