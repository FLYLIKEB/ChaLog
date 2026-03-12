import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tea } from './entities/tea.entity';
import { UsersService } from '../users/users.service';
import { TeaAnalyticsService } from './tea-analytics.service';

@Injectable()
export class TeaRecommendationService {
  private readonly logger = new Logger(TeaRecommendationService.name);

  constructor(
    @InjectRepository(Tea)
    private teasRepository: Repository<Tea>,
    @InjectDataSource()
    private dataSource: DataSource,
    private usersService: UsersService,
    private teaAnalyticsService: TeaAnalyticsService,
  ) {}

  async findPopularTeas(limit = 10): Promise<Tea[]> {
    return this.teasRepository.find({
      relations: ['seller'],
      order: { reviewCount: 'DESC', averageRating: 'DESC', id: 'ASC' },
      take: Math.min(Math.max(1, limit), 50),
    });
  }

  async findNewTeas(limit = 10): Promise<Tea[]> {
    return this.teasRepository.find({
      relations: ['seller'],
      order: { createdAt: 'DESC', id: 'ASC' },
      take: Math.min(Math.max(1, limit), 50),
    });
  }

  async findCurationTeas(limit = 10, userId?: number): Promise<Tea[]> {
    const take = Math.min(Math.max(1, limit), 50);

    if (userId) {
      try {
        const preference = await this.usersService.getOnboardingPreference(userId);
        if (
          preference.hasCompletedOnboarding &&
          preference.preferredTeaTypes &&
          preference.preferredTeaTypes.length > 0
        ) {
          const types = preference.preferredTeaTypes;
          const popularByType = await this.teasRepository
            .createQueryBuilder('tea')
            .leftJoinAndSelect('tea.seller', 'seller')
            .where('tea.type IN (:...types)', { types })
            .orderBy('tea.reviewCount', 'DESC')
            .addOrderBy('tea.averageRating', 'DESC')
            .take(take)
            .getMany();
          if (popularByType.length >= take) {
            return popularByType;
          }
          const remaining = take - popularByType.length;
          const ids = popularByType.map((t) => t.id);
          const additional = await this.teasRepository
            .createQueryBuilder('tea')
            .leftJoinAndSelect('tea.seller', 'seller')
            .where('tea.id NOT IN (:...ids)', { ids: ids.length ? ids : [0] })
            .orderBy('tea.reviewCount', 'DESC')
            .take(remaining)
            .getMany();
          return [...popularByType, ...additional].slice(0, take);
        }
      } catch (error) {
        this.logger.warn(
          `Onboarding preference fetch failed for user ${userId}`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    const popularCount = Math.ceil(take * 0.7);
    const newCount = take - popularCount;
    const [popular, newTeas] = await Promise.all([
      this.findPopularTeas(popularCount),
      this.findNewTeas(newCount),
    ]);
    const seen = new Set<number>();
    const result: Tea[] = [];
    for (const t of popular) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        result.push(t);
      }
    }
    for (const t of newTeas) {
      if (!seen.has(t.id) && result.length < take) {
        seen.add(t.id);
        result.push(t);
      }
    }
    return result;
  }

  async getSimilarTeas(teaId: number): Promise<Tea[]> {
    const tea = await this.teasRepository.findOne({ where: { id: teaId } });
    if (!tea) throw new NotFoundException('차를 찾을 수 없습니다.');

    const rating = Number(tea.averageRating);
    const lower = Math.max(0, rating - 1);
    const upper = rating + 1;

    return this.teasRepository
      .createQueryBuilder('tea')
      .leftJoinAndSelect('tea.seller', 'seller')
      .where('tea.type = :type', { type: tea.type })
      .andWhere('tea.id != :id', { id: teaId })
      .andWhere('tea.averageRating BETWEEN :lower AND :upper', { lower, upper })
      .orderBy('ABS(tea.averageRating - :rating)', 'ASC')
      .addOrderBy('tea.reviewCount', 'DESC')
      .addOrderBy('tea.id', 'ASC')
      .setParameter('rating', rating)
      .limit(4)
      .getMany();
  }

  async findTeasByTags(params: {
    tags: string[];
    sort?: 'match' | 'popular' | 'recent';
    limit?: number;
    excludeTeaId?: number;
  }): Promise<Tea[]> {
    const tags = params.tags?.filter((t) => t?.trim()).map((t) => t.trim()) ?? [];
    if (tags.length === 0) return [];

    const sortType = params.sort ?? 'match';
    const take = Math.min(Math.max(1, params.limit ?? 50), 100);

    const placeholders = tags.map(() => '?').join(',');
    const args: (string | number)[] = [...tags];
    if (params.excludeTeaId != null) {
      args.push(params.excludeTeaId);
    }
    args.push(take);

    const orderClause =
      sortType === 'match'
        ? 'ORDER BY COUNT(DISTINCT t.id) DESC, tea.reviewCount DESC, tea.averageRating DESC, tea.id ASC'
        : sortType === 'popular'
          ? 'ORDER BY tea.reviewCount DESC, tea.averageRating DESC, tea.id ASC'
          : 'ORDER BY MAX(n.createdAt) DESC, tea.id ASC';

    const excludeClause = params.excludeTeaId != null ? 'AND tea.id != ?' : '';

    const rows = await this.dataSource.query(
      `SELECT tea.id, tea.name, tea.year, tea.type, tea.sellerId, s.name AS sellerName,
              tea.origin, tea.price, tea.averageRating, tea.reviewCount, tea.createdAt, tea.updatedAt
       FROM teas tea
       LEFT JOIN sellers s ON tea.sellerId = s.id
       JOIN notes n ON n.teaId = tea.id AND n.isPublic = 1
       JOIN note_tags nt ON nt.noteId = n.id
       JOIN tags t ON t.id = nt.tagId AND t.name IN (${placeholders})
       WHERE 1=1 ${excludeClause}
       GROUP BY tea.id, tea.name, tea.year, tea.type, tea.sellerId, s.name, tea.origin, tea.price,
                tea.averageRating, tea.reviewCount, tea.createdAt, tea.updatedAt
       ${orderClause}
       LIMIT ?`,
      args,
    );

    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      year: r.year,
      type: r.type,
      origin: r.origin,
      price: r.price,
      averageRating: Number(r.averageRating),
      reviewCount: Number(r.reviewCount),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      seller: r.sellerName ?? null,
    })) as Tea[];
  }

  async getSimilarTeasByTags(teaId: number, limit = 6): Promise<Tea[]> {
    const { tags } = await this.teaAnalyticsService.getPopularTags(teaId);
    if (tags.length === 0) {
      return this.getSimilarTeas(teaId).then((arr) => arr.slice(0, limit));
    }

    const tagNames = tags.map((t) => t.name);
    return this.findTeasByTags({
      tags: tagNames,
      sort: 'match',
      limit: Math.min(Math.max(1, limit), 20),
      excludeTeaId: teaId,
    });
  }
}
