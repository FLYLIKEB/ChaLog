import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tea } from './entities/tea.entity';
import { PopularTagDto, PopularTagsResponseDto } from './dto/popular-tag.dto';

@Injectable()
export class TeaAnalyticsService {
  constructor(
    @InjectRepository(Tea)
    private teasRepository: Repository<Tea>,
    @InjectDataSource()
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async getPopularTags(teaId: number): Promise<PopularTagsResponseDto> {
    await this.assertTeaExists(teaId);

    const rows: { name: string; count: string }[] = await this.dataSource.query(
      `SELECT t.name, COUNT(nt.id) AS \`count\`
       FROM note_tags nt
       JOIN tags t ON t.id = nt.tagId
       JOIN notes n ON n.id = nt.noteId
       WHERE n.teaId = ? AND n.isPublic = 1
       GROUP BY t.id, t.name
       ORDER BY \`count\` DESC
       LIMIT 10`,
      [teaId],
    );

    const tags: PopularTagDto[] = rows.map((r) => ({
      name: r.name,
      count: Number(r.count),
    }));

    return { tags };
  }

  async getTopReviews(teaId: number, currentUserId?: number): Promise<any[]> {
    await this.assertTeaExists(teaId);

    const notes = await this.dataSource.query(
      `SELECT n.id, n.teaId, n.userId, n.schemaId, n.overallRating, n.isRatingIncluded,
              n.memo, n.images, n.imageThumbnails, n.isPublic, n.createdAt, n.updatedAt,
              u.name AS userName,
              tea.name AS teaName,
              (SELECT COUNT(*) FROM note_likes nl WHERE nl.noteId = n.id) AS likeCount,
              CASE
                WHEN ? IS NULL THEN 0
                ELSE EXISTS (
                  SELECT 1 FROM note_likes nl2
                  WHERE nl2.noteId = n.id AND nl2.userId = ?
                )
              END AS isLiked
       FROM notes n
       JOIN users u ON u.id = n.userId
       JOIN teas tea ON tea.id = n.teaId
       WHERE n.teaId = ? AND n.isPublic = 1
       ORDER BY likeCount DESC, n.createdAt DESC
       LIMIT 3`,
      [currentUserId ?? null, currentUserId ?? null, teaId],
    );

    return notes.map((note: any) => ({
      ...note,
      likeCount: Number(note.likeCount),
      isLiked: Boolean(Number(note.isLiked)),
      isBookmarked: false,
    }));
  }

  async getTrendingTeas(period: '7d' | '30d' = '7d'): Promise<Tea[]> {
    const cacheKey = `trending:teas:${period}`;
    const cached = await this.cacheManager.get<Tea[]>(cacheKey);
    if (cached) return cached;

    const days = period === '30d' ? 30 : 7;
    const decay = 0.15;

    const rows: Array<{
      id: number;
      name: string;
      year: number | null;
      type: string;
      sellerId: number | null;
      sellerName: string | null;
      origin: string | null;
      price: number | null;
      weight: number | null;
      averageRating: string;
      reviewCount: string;
      createdAt: Date;
      updatedAt: Date;
    }> = await this.dataSource.query(
      `SELECT tea.id, tea.name, tea.year, tea.type, tea.sellerId, s.name AS sellerName,
              tea.origin, tea.price, tea.weight,
              tea.averageRating, tea.reviewCount, tea.createdAt, tea.updatedAt
       FROM teas tea
       LEFT JOIN sellers s ON tea.sellerId = s.id
       JOIN notes n ON n.teaId = tea.id AND n.isPublic = 1
       LEFT JOIN (
         SELECT noteId, COUNT(*) AS like_count
         FROM note_likes
         GROUP BY noteId
       ) lc ON lc.noteId = n.id
       WHERE n.createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY tea.id, tea.name, tea.year, tea.type, tea.sellerId, s.name, tea.origin, tea.price, tea.weight,
                tea.averageRating, tea.reviewCount, tea.createdAt, tea.updatedAt
       ORDER BY SUM((1 + COALESCE(lc.like_count, 0)) * EXP(-? * DATEDIFF(NOW(), n.createdAt))) DESC
       LIMIT 10`,
      [days, decay],
    );

    const result = rows.map((r) => ({
      id: r.id,
      name: r.name,
      year: r.year,
      type: r.type,
      origin: r.origin,
      price: r.price,
      weight: r.weight,
      averageRating: Number(r.averageRating),
      reviewCount: Number(r.reviewCount),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      seller: r.sellerName ?? null,
    })) as Tea[];
    await this.cacheManager.set(cacheKey, result, 600000); // 10분 TTL
    return result;
  }

  private async assertTeaExists(teaId: number): Promise<Tea> {
    const tea = await this.teasRepository.findOne({ where: { id: teaId } });
    if (!tea) {
      throw new NotFoundException('차를 찾을 수 없습니다.');
    }
    return tea;
  }
}
