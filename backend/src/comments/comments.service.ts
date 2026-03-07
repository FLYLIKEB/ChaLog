import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { Post } from '../posts/entities/post.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
  ) {}

  async findByPost(postId: number): Promise<Comment[]> {
    const post = await this.postsRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    return this.commentsRepository.find({
      where: { postId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async create(postId: number, userId: number, dto: CreateCommentDto): Promise<Comment> {
    const post = await this.postsRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    const comment = this.commentsRepository.create({ postId, userId, content: dto.content });
    const saved = await this.commentsRepository.save(comment);
    const found = await this.commentsRepository.findOne({
      where: { id: saved.id },
      relations: ['user'],
    });
    if (!found) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    return found;
  }

  async update(commentId: number, userId: number, dto: UpdateCommentDto): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException('이 댓글을 수정할 권한이 없습니다.');
    }
    Object.assign(comment, dto);
    await this.commentsRepository.save(comment);
    const updated = await this.commentsRepository.findOne({
      where: { id: commentId },
      relations: ['user'],
    });
    if (!updated) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    return updated;
  }

  async remove(commentId: number, userId: number): Promise<void> {
    const comment = await this.commentsRepository.findOne({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException('이 댓글을 삭제할 권한이 없습니다.');
    }
    await this.commentsRepository.remove(comment);
  }
}
