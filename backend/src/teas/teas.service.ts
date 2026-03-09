import { Injectable, Logger, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tea } from './entities/tea.entity';
import { Seller } from './entities/seller.entity';
import { CreateTeaDto } from './dto/create-tea.dto';
import { UpdateTeaDto } from './dto/update-tea.dto';
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
    let sellerId: number | null = null;
    if (createTeaDto.sellerId != null) {
      sellerId = createTeaDto.sellerId;
    } else if (createTeaDto.seller?.trim()) {
      const resolved = await this.createSeller({
        name: createTeaDto.seller.trim(),
      });
      sellerId = resolved.id;
    }
    const { seller, sellerId: _sid, ...dtoRest } = createTeaDto;
    const tea = this.teasRepository.create({
      ...dtoRest,
      seller: sellerId != null ? ({ id: sellerId } as Seller) : null,
      averageRating: 0,
      reviewCount: 0,
    });
    try {
      const saved = await this.teasRepository.save(tea);
      return this.teasRepository.findOneOrFail({
        where: { id: saved.id },
        relations: ['seller'],
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          '이름·연도·셀러가 동일한 차가 이미 등록되어 있습니다.',
        );
      }
      throw err;
    }
  }

  async update(id: number, dto: UpdateTeaDto): Promise<Tea> {
    const tea = await this.teasRepository.findOne({ where: { id } });
    if (!tea) {
      throw new NotFoundException('차를 찾을 수 없습니다.');
    }
    const { sellerId, seller, ...rest } = dto;
    Object.assign(tea, rest);
    if ('sellerId' in dto) {
      tea.seller =
        dto.sellerId != null ? ({ id: dto.sellerId } as Seller) : null;
    } else if ('seller' in dto) {
      if (dto.seller?.trim()) {
        const resolved = await this.createSeller({ name: dto.seller.trim() });
        tea.seller = resolved;
      } else {
        tea.seller = null;
      }
    }
    try {
      await this.teasRepository.save(tea);
      return this.teasRepository.findOneOrFail({
        where: { id },
        relations: ['seller'],
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          '이름·연도·셀러가 동일한 차가 이미 등록되어 있습니다.',
        );
      }
      throw err;
    }
  }

  async findAll(): Promise<Tea[]> {
    return await this.teasRepository.find({
      relations: ['seller'],
      order: { createdAt: 'DESC' },
    });
  }

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
    const rows: { name: string; teaCount: string }[] = await this.dataSource.query(
      `SELECT s.name AS name, COUNT(*) AS teaCount
       FROM teas t
       JOIN sellers s ON t.sellerId = s.id
       WHERE t.sellerId IS NOT NULL
       GROUP BY s.id, s.name
       ORDER BY teaCount DESC`,
    );
    const fromTeas = rows.map((r) => ({ name: r.name, teaCount: Number(r.teaCount) }));
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
    const rows: { name: string; teaCount: string }[] = await this.dataSource.query(
      `SELECT s.name AS name, COUNT(*) AS teaCount
       FROM teas t
       JOIN sellers s ON t.sellerId = s.id
       WHERE t.sellerId IS NOT NULL AND s.name LIKE ?
       GROUP BY s.id, s.name
       ORDER BY teaCount DESC
       LIMIT 20`,
      [`%${query}%`],
    );
    const fromTeas = rows.map((r) => ({ name: r.name, teaCount: Number(r.teaCount) }));
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
    const seller = await this.sellerRepository.findOne({
      where: { name: sellerName },
    });
    if (!seller) return [];
    return this.teasRepository.find({
      where: { seller: { id: seller.id } },
      relations: ['seller'],
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

  async findOne(id: number): Promise<Tea> {
    const tea = await this.teasRepository.findOne({
      where: { id },
      relations: ['notes', 'seller'],
    });
    if (!tea) {
      throw new NotFoundException('차를 찾을 수 없습니다.');
    }
    return tea;
  }

  async search(query: string): Promise<Tea[]> {
    return await this.teasRepository
      .createQueryBuilder('tea')
      .leftJoinAndSelect('tea.seller', 'seller')
      .where('tea.name LIKE :query', { query: `%${query}%` })
      .orWhere('tea.type LIKE :query', { query: `%${query}%` })
      .orWhere('seller.name LIKE :query', { query: `%${query}%` })
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
    const qb = this.teasRepository
      .createQueryBuilder('tea')
      .leftJoinAndSelect('tea.seller', 'seller');

    if (params.q?.trim()) {
      const query = `%${params.q.trim()}%`;
      qb.andWhere(
        '(tea.name LIKE :query OR tea.type LIKE :query OR seller.name LIKE :query)',
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
      sellerId: number | null;
      sellerName: string | null;
      origin: string | null;
      price: number | null;
      averageRating: string;
      reviewCount: string;
      createdAt: Date;
      updatedAt: Date;
    }> = await this.dataSource.query(
      `SELECT tea.id, tea.name, tea.year, tea.type, tea.sellerId, s.name AS sellerName,
              tea.origin, tea.price, tea.averageRating, tea.reviewCount, tea.createdAt, tea.updatedAt
       FROM teas tea
       LEFT JOIN sellers s ON tea.sellerId = s.id
       JOIN notes n ON n.teaId = tea.id AND n.isPublic = 1
       LEFT JOIN (
         SELECT noteId, COUNT(*) AS like_count
         FROM note_likes
         GROUP BY noteId
       ) lc ON lc.noteId = n.id
       WHERE n.createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY tea.id, tea.name, tea.year, tea.type, tea.sellerId, s.name, tea.origin, tea.price,
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
      averageRating: Number(r.averageRating),
      reviewCount: Number(r.reviewCount),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      seller: r.sellerName ?? null,
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
    await this.assertTeaExists(teaId);

    const { tags } = await this.getPopularTags(teaId);
    if (tags.length === 0) {
      return this.getSimilarTeas(teaId).then((arr) => arr.slice(0, limit));
    }

    const tagNames = tags.map((t) => t.name);
    const result = await this.findTeasByTags({
      tags: tagNames,
      sort: 'match',
      limit: Math.min(Math.max(1, limit), 20),
      excludeTeaId: teaId,
    });
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
