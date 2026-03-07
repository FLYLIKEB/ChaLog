import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tea } from './entities/tea.entity';
import { Seller } from './entities/seller.entity';
import { CreateTeaDto } from './dto/create-tea.dto';
import { PopularTagDto, PopularTagsResponseDto } from './dto/popular-tag.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class TeasService {
  private readonly logger = new Logger(TeasService.name);

  constructor(
    @InjectRepository(Tea)
    private teasRepository: Repository<Tea>,
    @InjectRepository(Seller)
    private sellerRepository: Repository<Seller>,
    @InjectDataSource()
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private usersService: UsersService,
  ) {}

  async create(createTeaDto: CreateTeaDto): Promise<Tea> {
    const tea = this.teasRepository.create({
      ...createTeaDto,
      averageRating: 0,
      reviewCount: 0,
    });
    return await this.teasRepository.save(tea);
  }

  async findAll(): Promise<Tea[]> {
    return await this.teasRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findPopularTeas(limit = 10): Promise<Tea[]> {
    return this.teasRepository.find({
      order: { reviewCount: 'DESC', averageRating: 'DESC', id: 'ASC' },
      take: Math.min(Math.max(1, limit), 50),
    });
  }

  async findNewTeas(limit = 10): Promise<Tea[]> {
    return this.teasRepository.find({
      order: { createdAt: 'DESC', id: 'ASC' },
      take: Math.min(Math.max(1, limit), 50),
    });
  }

  async createSeller(dto: {
    name: string;
    address?: string;
    mapUrl?: string;
    websiteUrl?: string;
    phone?: string;
    description?: string;
    businessHours?: string;
  }): Promise<Seller> {
    const trimmed = dto.name.trim();
    if (!trimmed) {
      throw new Error('찻집 이름을 입력해주세요.');
    }
    const existing = await this.sellerRepository.findOne({ where: { name: trimmed } });
    if (existing) {
      if (
        dto.address !== undefined ||
        dto.mapUrl !== undefined ||
        dto.websiteUrl !== undefined ||
        dto.phone !== undefined ||
        dto.description !== undefined ||
        dto.businessHours !== undefined
      ) {
        Object.assign(existing, {
          address: dto.address?.trim() || null,
          mapUrl: dto.mapUrl?.trim() || null,
          websiteUrl: dto.websiteUrl?.trim() || null,
          phone: dto.phone?.trim() || null,
          description: dto.description?.trim() || null,
          businessHours: dto.businessHours?.trim() || null,
        });
        return await this.sellerRepository.save(existing);
      }
      return existing;
    }
    const fromTeas = await this.dataSource.query(
      `SELECT 1 FROM teas WHERE seller = ? LIMIT 1`,
      [trimmed],
    );
    if (fromTeas.length > 0) {
      const seller = this.sellerRepository.create({
        name: trimmed,
        address: dto.address?.trim() || null,
        mapUrl: dto.mapUrl?.trim() || null,
        websiteUrl: dto.websiteUrl?.trim() || null,
        phone: dto.phone?.trim() || null,
        description: dto.description?.trim() || null,
        businessHours: dto.businessHours?.trim() || null,
      });
      try {
        return await this.sellerRepository.save(seller);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'ER_DUP_ENTRY') {
          const found = await this.sellerRepository.findOne({ where: { name: trimmed } });
          if (found) return found;
        }
        throw err;
      }
    }
    try {
      const seller = this.sellerRepository.create({
        name: trimmed,
        address: dto.address?.trim() || null,
        mapUrl: dto.mapUrl?.trim() || null,
        websiteUrl: dto.websiteUrl?.trim() || null,
        phone: dto.phone?.trim() || null,
        description: dto.description?.trim() || null,
        businessHours: dto.businessHours?.trim() || null,
      });
      return await this.sellerRepository.save(seller);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ER_DUP_ENTRY') {
        const found = await this.sellerRepository.findOne({ where: { name: trimmed } });
        if (found) return found;
      }
      throw err;
    }
  }

  async findSellerByName(name: string): Promise<Seller | null> {
    return this.sellerRepository.findOne({ where: { name: decodeURIComponent(name) } });
  }

  async updateSeller(
    name: string,
    dto: {
      address?: string;
      mapUrl?: string;
      websiteUrl?: string;
      phone?: string;
      description?: string;
      businessHours?: string;
    },
  ): Promise<Seller | null> {
    const seller = await this.sellerRepository.findOne({
      where: { name: decodeURIComponent(name) },
    });
    if (!seller) return null;
    Object.assign(seller, {
      address: dto.address !== undefined ? (dto.address?.trim() || null) : seller.address,
      mapUrl: dto.mapUrl !== undefined ? (dto.mapUrl?.trim() || null) : seller.mapUrl,
      websiteUrl:
        dto.websiteUrl !== undefined ? (dto.websiteUrl?.trim() || null) : seller.websiteUrl,
      phone: dto.phone !== undefined ? (dto.phone?.trim() || null) : seller.phone,
      description:
        dto.description !== undefined ? (dto.description?.trim() || null) : seller.description,
      businessHours:
        dto.businessHours !== undefined ? (dto.businessHours?.trim() || null) : seller.businessHours,
    });
    return await this.sellerRepository.save(seller);
  }

  async findSellers(): Promise<{ name: string; teaCount: number }[]> {
    const rows: { seller: string; teaCount: string }[] = await this.dataSource.query(
      `SELECT seller AS seller, COUNT(*) AS teaCount
       FROM teas
       WHERE seller IS NOT NULL AND seller != ''
       GROUP BY seller
       ORDER BY teaCount DESC`,
    );
    const fromTeas = rows.map((r) => ({ name: r.seller, teaCount: Number(r.teaCount) }));
    try {
      const sellerRows: { name: string }[] = await this.dataSource.query(
        `SELECT name FROM sellers`,
      );
      const teaSellerNames = new Set(fromTeas.map((s) => s.name));
      const additional = sellerRows
        .filter((s) => !teaSellerNames.has(s.name))
        .map((s) => ({ name: s.name, teaCount: 0 }));
      return [...fromTeas, ...additional];
    } catch {
      return fromTeas;
    }
  }

  async findSellersByQuery(query: string): Promise<{ name: string; teaCount: number }[]> {
    const rows: { seller: string; teaCount: string }[] = await this.dataSource.query(
      `SELECT seller AS seller, COUNT(*) AS teaCount
       FROM teas
       WHERE seller IS NOT NULL AND seller != '' AND seller LIKE ?
       GROUP BY seller
       ORDER BY teaCount DESC
       LIMIT 20`,
      [`%${query}%`],
    );
    const fromTeas = rows.map((r) => ({ name: r.seller, teaCount: Number(r.teaCount) }));
    try {
      const sellerRows: { name: string }[] = await this.dataSource.query(
        `SELECT name FROM sellers WHERE name LIKE ?`,
        [`%${query}%`],
      );
      const teaSellerNames = new Set(fromTeas.map((s) => s.name));
      const additional = sellerRows
        .filter((s) => !teaSellerNames.has(s.name))
        .map((s) => ({ name: s.name, teaCount: 0 }));
      return [...fromTeas, ...additional].slice(0, 20);
    } catch {
      return fromTeas.slice(0, 20);
    }
  }

  async findBySeller(sellerName: string): Promise<Tea[]> {
    return this.teasRepository.find({
      where: { seller: sellerName },
      order: { reviewCount: 'DESC', averageRating: 'DESC', id: 'ASC' },
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

  async findOne(id: number): Promise<Tea> {
    const tea = await this.teasRepository.findOne({
      where: { id },
      relations: ['notes'],
    });
    if (!tea) {
      throw new NotFoundException('차를 찾을 수 없습니다.');
    }
    return tea;
  }

  async search(query: string): Promise<Tea[]> {
    return await this.teasRepository
      .createQueryBuilder('tea')
      .where('tea.name LIKE :query', { query: `%${query}%` })
      .orWhere('tea.type LIKE :query', { query: `%${query}%` })
      .orWhere('tea.seller LIKE :query', { query: `%${query}%` })
      .orderBy('tea.createdAt', 'DESC')
      .getMany();
  }

  async findWithFilters(params: {
    q?: string;
    type?: string;
    minRating?: number;
    sort?: 'popular' | 'new' | 'rating';
    limit?: number;
  }): Promise<Tea[]> {
    const qb = this.teasRepository.createQueryBuilder('tea');

    if (params.q?.trim()) {
      const query = `%${params.q.trim()}%`;
      qb.andWhere(
        '(tea.name LIKE :query OR tea.type LIKE :query OR tea.seller LIKE :query)',
        { query },
      );
    }
    if (params.type?.trim()) {
      qb.andWhere('tea.type = :type', { type: params.type.trim() });
    }
    if (params.minRating != null && !Number.isNaN(params.minRating)) {
      const min = Math.max(0, Math.min(5, params.minRating));
      qb.andWhere('tea.averageRating >= :minRating', { minRating: min });
    }

    switch (params.sort) {
      case 'popular':
        qb.orderBy('tea.reviewCount', 'DESC')
          .addOrderBy('tea.averageRating', 'DESC')
          .addOrderBy('tea.id', 'ASC');
        break;
      case 'rating':
        qb.orderBy('tea.averageRating', 'DESC')
          .addOrderBy('tea.reviewCount', 'DESC')
          .addOrderBy('tea.id', 'ASC');
        break;
      case 'new':
      default:
        qb.orderBy('tea.createdAt', 'DESC').addOrderBy('tea.id', 'ASC');
        break;
    }

    const take = Math.min(Math.max(1, params.limit ?? 50), 100);
    qb.take(take);

    return qb.getMany();
  }

  async updateRating(teaId: number, averageRating: number, reviewCount: number): Promise<void> {
    await this.teasRepository.update(teaId, {
      averageRating: Number(averageRating.toFixed(2)),
      reviewCount,
    });
  }

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
      seller: string | null;
      origin: string | null;
      price: number | null;
      averageRating: string;
      reviewCount: string;
      createdAt: Date;
      updatedAt: Date;
    }> = await this.dataSource.query(
      `SELECT tea.id, tea.name, tea.year, tea.type, tea.seller, tea.origin, tea.price,
              tea.averageRating, tea.reviewCount, tea.createdAt, tea.updatedAt
       FROM teas tea
       JOIN notes n ON n.teaId = tea.id AND n.isPublic = 1
       LEFT JOIN (
         SELECT noteId, COUNT(*) AS like_count
         FROM note_likes
         GROUP BY noteId
       ) lc ON lc.noteId = n.id
       WHERE n.createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY tea.id, tea.name, tea.year, tea.type, tea.seller, tea.origin, tea.price,
                tea.averageRating, tea.reviewCount, tea.createdAt, tea.updatedAt
       ORDER BY SUM((1 + COALESCE(lc.like_count, 0)) * EXP(-? * DATEDIFF(NOW(), n.createdAt))) DESC
       LIMIT 10`,
      [days, decay],
    );

    const result = rows.map((r) => ({
      ...r,
      averageRating: Number(r.averageRating),
      reviewCount: Number(r.reviewCount),
    })) as Tea[];
    await this.cacheManager.set(cacheKey, result, 600000); // 10분 TTL
    return result;
  }

  async getSimilarTeas(teaId: number): Promise<Tea[]> {
    const tea = await this.assertTeaExists(teaId);

    const rating = Number(tea.averageRating);
    const lower = Math.max(0, rating - 1);
    const upper = rating + 1;

    return this.teasRepository
      .createQueryBuilder('tea')
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

  private async assertTeaExists(teaId: number): Promise<Tea> {
    const tea = await this.teasRepository.findOne({ where: { id: teaId } });
    if (!tea) {
      throw new NotFoundException('차를 찾을 수 없습니다.');
    }
    return tea;
  }
}
