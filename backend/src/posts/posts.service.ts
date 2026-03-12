import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, QueryFailedError, In } from 'typeorm';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { Post, PostCategory } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostBookmark } from './entities/post-bookmark.entity';
import { PostImage } from './entities/post-image.entity';
import { Note } from '../notes/entities/note.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

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
    @InjectRepository(PostImage)
    private postImagesRepository: Repository<PostImage>,
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectDataSource()
    private dataSource: DataSource,
    private usersService: UsersService,
  ) {}

  async create(userId: number, dto: CreatePostDto): Promise<any> {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new ForbiddenException('사용자를 찾을 수 없습니다.');

    if (dto.category === PostCategory.ANNOUNCEMENT && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('공지사항 게시판에는 관리자만 글을 작성할 수 있습니다.');
    }

    const isAdmin = user.role === UserRole.ADMIN;
    const isPinned = isAdmin && (dto.isPinned === true);

    const { images: imagesDto, taggedNoteIds, ...postData } = dto;

    const taggedNotes = await this.resolveTaggedNotes(taggedNoteIds, userId);

    return this.dataSource.transaction(async (manager) => {
      const post = manager.create(Post, {
        ...postData,
        userId,
        isAnonymous: dto.isAnonymous ?? false,
        isPinned,
        isSponsored: dto.isSponsored ?? false,
        sponsorNote: dto.sponsorNote ?? null,
        taggedNotes,
      });
      const saved = await manager.save(Post, post);

      if (imagesDto?.length) {
        const postImages = imagesDto.map((img, idx) =>
          manager.create(PostImage, {
            postId: saved.id,
            url: img.url,
            thumbnailUrl: img.thumbnailUrl ?? null,
            caption: img.caption?.trim() || null,
            sortOrder: idx,
          }),
        );
        await manager.save(PostImage, postImages);
      }

      const createdPost = await manager.findOne(Post, {
        where: { id: saved.id },
        relations: ['user', 'images', 'taggedNotes', 'taggedNotes.tea'],
      });
      if (!createdPost) {
        throw new NotFoundException('게시글을 찾을 수 없습니다.');
      }
      const enriched = await this.enrichPostsWithStats([createdPost], userId);
      return enriched[0];
    });
  }

  async findAll(
    category?: PostCategory | PostCategory[],
    page = 1,
    limit = 20,
    sort: 'latest' | 'popular' | 'commented' = 'latest',
    currentUserId?: number,
    bookmarked?: boolean,
  ): Promise<any[]> {
    if (bookmarked && !currentUserId) {
      throw new BadRequestException('북마크한 게시글을 조회하려면 로그인이 필요합니다.');
    }

    const { take, skip } = PaginationHelper.normalize(page, limit, 50);
    const qb = this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.images', 'postImages')
      .orderBy('post.isPinned', 'DESC')
      .skip(skip)
      .take(take);

    if (bookmarked && currentUserId) {
      qb.innerJoin('post_bookmarks', 'pb', 'pb.postId = post.id AND pb.userId = :bookmarkUserId', {
        bookmarkUserId: currentUserId,
      });
    }

    if (category) {
      if (Array.isArray(category)) {
        qb.where('post.category IN (:...categories)', { categories: category });
      } else {
        qb.where('post.category = :category', { category });
      }
    }

    if (sort === 'popular') {
      // 인기글: 좋아요 5개 이상만, 별도 쿼리로 ID 조회 후 fetch (TypeORM 서브쿼리 alias 이슈 회피)
      const popularQb = this.dataSource
        .createQueryBuilder()
        .select('pl.postId', 'postId')
        .addSelect('COUNT(pl.id)', 'likeCount')
        .from(PostLike, 'pl')
        .innerJoin(Post, 'p', 'p.id = pl.postId')
        .groupBy('pl.postId')
        .having('COUNT(pl.id) >= 5')
        .orderBy('likeCount', 'DESC')
        .addOrderBy('MAX(p.createdAt)', 'DESC');

      if (category) {
        if (Array.isArray(category)) {
          popularQb.andWhere('p.category IN (:...categories)', { categories: category });
        } else {
          popularQb.andWhere('p.category = :category', { category });
        }
      }
      if (bookmarked && currentUserId) {
        popularQb.innerJoin('post_bookmarks', 'pb', 'pb.postId = pl.postId AND pb.userId = :bookmarkUserId', {
          bookmarkUserId: currentUserId,
        });
      }

      const popularRows = await popularQb.skip(skip).take(take).getRawMany();
      const popularIds = popularRows.map((r) => r.postId);

      if (popularIds.length === 0) {
        return this.enrichPostsWithStats([], currentUserId);
      }

      const posts = await this.postsRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.user', 'user')
        .leftJoinAndSelect('post.images', 'postImages')
        .where('post.id IN (:...ids)', { ids: popularIds })
        .orderBy('post.isPinned', 'DESC')
        .addOrderBy('post.createdAt', 'DESC')
        .getMany();

      const orderMap = new Map(popularIds.map((id, i) => [id, i]));
      posts.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

      return this.enrichPostsWithStats(posts, currentUserId);
    }

    if (sort === 'commented') {
      qb.leftJoin(
        (sub) =>
          sub
            .select('c.postId', 'postId')
            .addSelect('COUNT(c.id)', 'commentCount')
            .from('comments', 'c')
            .groupBy('c.postId'),
        'commentCounts',
        'commentCounts.postId = post.id',
      );
      qb.addOrderBy('COALESCE(commentCounts.commentCount, 0)', 'DESC');
    }
    qb.addOrderBy('post.createdAt', 'DESC');

    const posts = await qb.getMany();
    return this.enrichPostsWithStats(posts, currentUserId);
  }

  async findOne(id: number, currentUserId?: number): Promise<any> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['user', 'images', 'taggedNotes', 'taggedNotes.tea'],
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
    const user = await this.usersService.findOne(userId);
    const isAdmin = user?.role === UserRole.ADMIN;
    const updateDto = { ...dto };
    if (!isAdmin && 'isPinned' in dto) {
      delete (updateDto as any).isPinned;
    }
    const { images: imagesDto, taggedNoteIds, ...restDto } = updateDto;

    const taggedNotes = taggedNoteIds !== undefined
      ? await this.resolveTaggedNotes(taggedNoteIds, userId)
      : undefined;

    return this.dataSource.transaction(async (manager) => {
      const post = await manager.findOne(Post, {
        where: { id },
        relations: ['taggedNotes'],
      });
      if (!post) {
        throw new NotFoundException('게시글을 찾을 수 없습니다.');
      }
      if (post.userId !== userId) {
        throw new ForbiddenException('이 게시글을 수정할 권한이 없습니다.');
      }
      Object.assign(post, restDto);
      if (taggedNotes !== undefined) {
        post.taggedNotes = taggedNotes;
      }
      await manager.save(Post, post);

      if (imagesDto !== undefined) {
        await manager.delete(PostImage, { postId: id });
        if (imagesDto?.length) {
          const postImages = imagesDto.map((img, idx) =>
            manager.create(PostImage, {
              postId: id,
              url: img.url,
              thumbnailUrl: img.thumbnailUrl ?? null,
              caption: img.caption?.trim() || null,
              sortOrder: idx,
            }),
          );
          await manager.save(PostImage, postImages);
        }
      }

      const updatedPost = await manager.findOne(Post, {
        where: { id },
        relations: ['user', 'images', 'taggedNotes', 'taggedNotes.tea'],
      });
      if (!updatedPost) {
        throw new NotFoundException('게시글을 찾을 수 없습니다.');
      }
      const enriched = await this.enrichPostsWithStats([updatedPost], userId);
      return enriched[0];
    });
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

  private async resolveTaggedNotes(noteIds: number[] | undefined, userId: number): Promise<Note[]> {
    if (!noteIds?.length) return [];
    const notes = await this.notesRepository.find({
      where: { id: In(noteIds), userId },
      relations: ['tea'],
    });
    return notes;
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

    return posts.map((post) => {
      const result: any = {
        ...post,
        likeCount: likeCountMap.get(post.id) ?? 0,
        isLiked: userLikedIds.has(post.id),
        isBookmarked: userBookmarkedIds.has(post.id),
      };
      if (result.images?.length) {
        result.images = [...result.images].sort((a: PostImage, b: PostImage) => a.sortOrder - b.sortOrder);
      }
      return result;
    });
  }
}
