import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, QueryFailedError } from 'typeorm';
import { Tea } from './entities/tea.entity';
import { Seller } from './entities/seller.entity';
import { TeaWishlist } from './entities/tea-wishlist.entity';
import { CreateTeaDto } from './dto/create-tea.dto';
import { UpdateTeaDto } from './dto/update-tea.dto';
import { PopularTagsResponseDto } from './dto/popular-tag.dto';
import { SellerService } from './seller.service';
import { TeaRecommendationService } from './tea-recommendation.service';
import { TeaAnalyticsService } from './tea-analytics.service';

@Injectable()
export class TeasService {
  constructor(
    @InjectRepository(Tea)
    private teasRepository: Repository<Tea>,
    @InjectRepository(TeaWishlist)
    private teaWishlistRepository: Repository<TeaWishlist>,
    @InjectDataSource()
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private sellerService: SellerService,
    private recommendationService: TeaRecommendationService,
    private analyticsService: TeaAnalyticsService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ── Core CRUD ────────────────────────────────────────────────────────────────

  async create(createTeaDto: CreateTeaDto): Promise<Tea> {
    let sellerId: number | null = null;
    if (createTeaDto.sellerId != null) {
      sellerId = createTeaDto.sellerId;
    } else if (createTeaDto.seller?.trim()) {
      const resolved = await this.sellerService.createSeller({
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
        const resolved = await this.sellerService.createSeller({ name: dto.seller.trim() });
        tea.seller = resolved;
      } else {
        tea.seller = null;
      }
    }
    try {
      await this.teasRepository.save(tea);
      this.eventEmitter.emit('tea.updated');
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
    minPrice?: number;
    maxPrice?: number;
    sellerName?: string;
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
    if (params.minPrice != null || params.maxPrice != null) {
      qb.andWhere('tea.price IS NOT NULL');
    }
    if (params.minPrice != null) {
      qb.andWhere('tea.price >= :minPrice', { minPrice: params.minPrice });
    }
    if (params.maxPrice != null) {
      qb.andWhere('tea.price <= :maxPrice', { maxPrice: params.maxPrice });
    }
    if (params.sellerName?.trim()) {
      qb.andWhere('seller.name LIKE :sellerName', { sellerName: `%${params.sellerName.trim()}%` });
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
    this.eventEmitter.emit('tea.updated');
  }

  @OnEvent('tea.updated')
  async invalidateTrendingCache(): Promise<void> {
    await Promise.all([
      this.cacheManager.del('trending:teas:7d'),
      this.cacheManager.del('trending:teas:30d'),
    ]);
  }

  // ── Wishlist ─────────────────────────────────────────────────────────────────

  async toggleWishlist(teaId: number, userId: number): Promise<{ wishlisted: boolean }> {
    return await this.dataSource.transaction(async (manager) => {
      await this.assertTeaExists(teaId);

      const existing = await manager.findOne(TeaWishlist, { where: { teaId, userId } });

      if (existing) {
        await manager.remove(TeaWishlist, existing);
        return { wishlisted: false };
      }

      try {
        const newWishlist = manager.create(TeaWishlist, { teaId, userId });
        await manager.save(TeaWishlist, newWishlist);
      } catch (error) {
        if (error instanceof QueryFailedError && (error as any).code === 'ER_DUP_ENTRY') {
          // duplicate — treat as already wishlisted
        } else {
          throw error;
        }
      }

      return { wishlisted: true };
    });
  }

  async isWishlistedByUser(teaId: number, userId?: number): Promise<boolean> {
    if (!userId) return false;
    const item = await this.teaWishlistRepository.findOne({ where: { teaId, userId } });
    return !!item;
  }

  async findWishlisted(userId: number): Promise<Tea[]> {
    const items = await this.teaWishlistRepository.find({
      where: { userId },
      relations: ['tea', 'tea.seller'],
      order: { createdAt: 'DESC' },
    });
    return items.map((item) => item.tea);
  }

  // ── Facade delegations ───────────────────────────────────────────────────────

  async createSeller(dto: Parameters<SellerService['createSeller']>[0]) {
    return this.sellerService.createSeller(dto);
  }

  async findSellerByName(name: string) {
    return this.sellerService.findSellerByName(name);
  }

  async updateSeller(name: string, dto: Parameters<SellerService['updateSeller']>[1]) {
    return this.sellerService.updateSeller(name, dto);
  }

  async findSellers() {
    return this.sellerService.findSellers();
  }

  async findSellersByQuery(query: string) {
    return this.sellerService.findSellersByQuery(query);
  }

  async findBySeller(sellerName: string) {
    return this.sellerService.findBySeller(sellerName);
  }

  async findPopularTeas(limit = 10) {
    return this.recommendationService.findPopularTeas(limit);
  }

  async findNewTeas(limit = 10) {
    return this.recommendationService.findNewTeas(limit);
  }

  async findCurationTeas(limit = 10, userId?: number) {
    return this.recommendationService.findCurationTeas(limit, userId);
  }

  async getSimilarTeas(teaId: number) {
    return this.recommendationService.getSimilarTeas(teaId);
  }

  async findTeasByTags(params: Parameters<TeaRecommendationService['findTeasByTags']>[0]) {
    return this.recommendationService.findTeasByTags(params);
  }

  async getSimilarTeasByTags(teaId: number, limit = 6) {
    return this.recommendationService.getSimilarTeasByTags(teaId, limit);
  }

  async getTrendingTeas(period: '7d' | '30d' = '7d') {
    return this.analyticsService.getTrendingTeas(period);
  }

  async getPopularTags(teaId: number): Promise<PopularTagsResponseDto> {
    return this.analyticsService.getPopularTags(teaId);
  }

  async getTopReviews(teaId: number, currentUserId?: number) {
    return this.analyticsService.getTopReviews(teaId, currentUserId);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async assertTeaExists(teaId: number): Promise<Tea> {
    const tea = await this.teasRepository.findOne({ where: { id: teaId } });
    if (!tea) {
      throw new NotFoundException('차를 찾을 수 없습니다.');
    }
    return tea;
  }
}
