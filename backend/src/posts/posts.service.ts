import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, QueryFailedError, In } from 'typeorm';
import { Post, PostCategory } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostBookmark } from './entities/post-bookmark.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(PostLike)
    private postLikesRepository: Repository<PostLike>,
    @InjectRepository(PostBookmark)
    private postBookmarksRepository: Repository<PostBookmark>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async create(userId: number, dto: CreatePostDto): Promise<any> {
    const post = this.postsRepository.create({
      ...dto,
      userId,
      isSponsored: dto.isSponsored ?? false,
      sponsorNote: dto.sponsorNote ?? null,
    });
    const saved = await this.postsRepository.save(post);
    return this.findOne(saved.id, userId);
  }

  async findAll(
    category?: PostCategory,
    page = 1,
    limit = 20,
    currentUserId?: number,
  ): Promise<any[]> {
    const skip = (page - 1) * limit;
    const qb = this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .orderBy('post.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (category) {
      qb.where('post.category = :category', { category });
    }

    const posts = await qb.getMany();
    return this.enrichPostsWithStats(posts, currentUserId);
  }

  async findOne(id: number, currentUserId?: number): Promise<any> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    const enriched = await this.enrichPostsWithStats([post], currentUserId);
    return enriched[0];
  }

  async incrementViewCount(id: number): Promise<void> {
    await this.postsRepository.increment({ id }, 'viewCount', 1);
  }

  async update(id: number, userId: number, dto: UpdatePostDto): Promise<any> {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    if (post.userId !== userId) {
      throw new ForbiddenException('이 게시글을 수정할 권한이 없습니다.');
    }
    Object.assign(post, dto);
    await this.postsRepository.save(post);
    return this.findOne(id, userId);
  }

  async remove(id: number, userId: number): Promise<void> {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    if (post.userId !== userId) {
      throw new ForbiddenException('이 게시글을 삭제할 권한이 없습니다.');
    }
    await this.postsRepository.remove(post);
  }

  /** 운영자 강제 삭제 (소유권 검사 없음) */
  async removeByAdmin(id: number): Promise<void> {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    await this.postsRepository.remove(post);
  }

  async toggleLike(postId: number, userId: number): Promise<{ liked: boolean; likeCount: number }> {
    return this.dataSource.transaction(async (manager) => {
      const post = await manager.findOne(Post, { where: { id: postId } });
      if (!post) {
        throw new NotFoundException('게시글을 찾을 수 없습니다.');
      }

      const existing = await manager.findOne(PostLike, { where: { postId, userId } });
      if (existing) {
        await manager.remove(PostLike, existing);
        const likeCount = await manager.count(PostLike, { where: { postId } });
        return { liked: false, likeCount };
      }

      try {
        const like = manager.create(PostLike, { postId, userId });
        await manager.save(PostLike, like);
      } catch (error) {
        if (error instanceof QueryFailedError && (error as any).code === 'ER_DUP_ENTRY') {
          this.logger.warn(`Duplicate like for postId: ${postId}, userId: ${userId}`);
        } else {
          throw error;
        }
      }

      const likeCount = await manager.count(PostLike, { where: { postId } });
      return { liked: true, likeCount };
    });
  }

  async toggleBookmark(postId: number, userId: number): Promise<{ bookmarked: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const post = await manager.findOne(Post, { where: { id: postId } });
      if (!post) {
        throw new NotFoundException('게시글을 찾을 수 없습니다.');
      }

      const existing = await manager.findOne(PostBookmark, { where: { postId, userId } });
      if (existing) {
        await manager.remove(PostBookmark, existing);
        return { bookmarked: false };
      }

      try {
        const bookmark = manager.create(PostBookmark, { postId, userId });
        await manager.save(PostBookmark, bookmark);
      } catch (error) {
        if (error instanceof QueryFailedError && (error as any).code === 'ER_DUP_ENTRY') {
          this.logger.warn(`Duplicate bookmark for postId: ${postId}, userId: ${userId}`);
        } else {
          throw error;
        }
      }

      return { bookmarked: true };
    });
  }

  private async enrichPostsWithStats(posts: Post[], currentUserId?: number): Promise<any[]> {
    if (posts.length === 0) return [];

    const postIds = posts.map((p) => p.id);

    const likeCounts = await this.postLikesRepository
      .createQueryBuilder('like')
      .select('like.postId', 'postId')
      .addSelect('COUNT(like.id)', 'count')
      .where('like.postId IN (:...postIds)', { postIds })
      .groupBy('like.postId')
      .getRawMany();

    const likeCountMap = new Map<number, number>();
    likeCounts.forEach((item) => {
      const id = Number(item.postId);
      const count = Number(item.count);
      if (!isNaN(id) && !isNaN(count)) likeCountMap.set(id, count);
    });

    let userLikedIds = new Set<number>();
    let userBookmarkedIds = new Set<number>();

    if (currentUserId) {
      const [likes, bookmarks] = await Promise.all([
        this.postLikesRepository.find({ where: { postId: In(postIds), userId: currentUserId } }),
        this.postBookmarksRepository.find({ where: { postId: In(postIds), userId: currentUserId } }),
      ]);
      userLikedIds = new Set(likes.map((l) => l.postId));
      userBookmarkedIds = new Set(bookmarks.map((b) => b.postId));
    }

    return posts.map((post) => ({
      ...post,
      likeCount: likeCountMap.get(post.id) ?? 0,
      isLiked: userLikedIds.has(post.id),
      isBookmarked: userBookmarkedIds.has(post.id),
    }));
  }
}
