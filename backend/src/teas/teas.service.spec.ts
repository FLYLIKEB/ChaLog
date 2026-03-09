import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { TeasService } from './teas.service';
import { Tea } from './entities/tea.entity';
import { Seller } from './entities/seller.entity';
import { UsersService } from '../users/users.service';

const mockSeller = (overrides: Partial<Seller> = {}): Seller =>
  ({ id: 1, name: '차향', ...overrides } as Seller);

const mockTea = (overrides: Partial<Tea> = {}): Tea =>
  ({
    id: 1,
    name: '정산소종',
    type: '홍차',
    year: 2023,
    seller: mockSeller(),
    origin: '중국 푸젠',
    price: 15000,
    weight: 50,
    averageRating: 4.0,
    reviewCount: 5,
    notes: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }) as Tea;

describe('TeasService', () => {
  let service: TeasService;
  let teasRepository: jest.Mocked<Repository<Tea>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  const mockTeasRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockSellerRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockUsersService = {
    getOnboardingPreference: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCacheManager.get.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeasService,
        { provide: getRepositoryToken(Tea), useValue: mockTeasRepository },
        { provide: getRepositoryToken(Seller), useValue: mockSellerRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<TeasService>(TeasService);
    teasRepository = module.get(getRepositoryToken(Tea));
    dataSource = module.get(DataSource);
  });

  describe('getPopularTags', () => {
    it('공개 노트의 태그를 빈도순으로 반환해야 한다', async () => {
      mockTeasRepository.findOne.mockResolvedValue(mockTea());
      mockDataSource.query.mockResolvedValue([
        { name: '꽃향', count: '5' },
        { name: '단맛', count: '3' },
        { name: '스모키', count: '1' },
      ]);

      const result = await service.getPopularTags(1);

      expect(result.tags).toHaveLength(3);
      expect(result.tags[0]).toEqual({ name: '꽃향', count: 5 });
      expect(result.tags[1]).toEqual({ name: '단맛', count: 3 });
      expect(result.tags[2]).toEqual({ name: '스모키', count: 1 });
    });

    it('태그가 없을 때 빈 배열을 반환해야 한다', async () => {
      mockTeasRepository.findOne.mockResolvedValue(mockTea());
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getPopularTags(1);

      expect(result.tags).toHaveLength(0);
    });

    it('존재하지 않는 차 ID로 요청 시 NotFoundException을 던져야 한다', async () => {
      mockTeasRepository.findOne.mockResolvedValue(null);

      await expect(service.getPopularTags(999)).rejects.toThrow(NotFoundException);
    });

    it('count 값을 숫자로 변환해야 한다', async () => {
      mockTeasRepository.findOne.mockResolvedValue(mockTea());
      mockDataSource.query.mockResolvedValue([{ name: '꽃향', count: '10' }]);

      const result = await service.getPopularTags(1);

      expect(typeof result.tags[0].count).toBe('number');
      expect(result.tags[0].count).toBe(10);
    });
  });

  describe('getTopReviews', () => {
    it('likeCount 내림차순으로 최대 3개 차록을 반환해야 한다', async () => {
      mockTeasRepository.findOne.mockResolvedValue(mockTea());
      mockDataSource.query.mockResolvedValue([
        { id: 1, teaId: 1, userId: 1, likeCount: '5', memo: '좋아요' },
        { id: 2, teaId: 1, userId: 2, likeCount: '3', memo: '맛있어요' },
        { id: 3, teaId: 1, userId: 3, likeCount: '1', memo: '향이 좋아요' },
      ]);

      const result = await service.getTopReviews(1);

      expect(result).toHaveLength(3);
      expect(result[0].likeCount).toBe(5);
      expect(result[1].likeCount).toBe(3);
      expect(result[2].likeCount).toBe(1);
    });

    it('차록이 없을 때 빈 배열을 반환해야 한다', async () => {
      mockTeasRepository.findOne.mockResolvedValue(mockTea());
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getTopReviews(1);

      expect(result).toHaveLength(0);
    });

    it('존재하지 않는 차 ID로 요청 시 NotFoundException을 던져야 한다', async () => {
      mockTeasRepository.findOne.mockResolvedValue(null);

      await expect(service.getTopReviews(999)).rejects.toThrow(NotFoundException);
    });

    it('currentUserId 없을 때 isLiked는 false여야 한다', async () => {
      mockTeasRepository.findOne.mockResolvedValue(mockTea());
      mockDataSource.query.mockResolvedValue([
        { id: 1, teaId: 1, userId: 1, likeCount: '2', isLiked: '0' },
      ]);

      const result = await service.getTopReviews(1);

      expect(result[0].isLiked).toBe(false);
      expect(result[0].isBookmarked).toBe(false);
    });

    it('currentUserId가 있고 좋아요를 눌렀을 때 isLiked는 true여야 한다', async () => {
      mockTeasRepository.findOne.mockResolvedValue(mockTea());
      mockDataSource.query.mockResolvedValue([
        { id: 1, teaId: 1, userId: 2, likeCount: '3', isLiked: '1' },
      ]);

      const result = await service.getTopReviews(1, 99);

      expect(result[0].isLiked).toBe(true);
    });

    it('currentUserId가 있고 좋아요를 누르지 않았을 때 isLiked는 false여야 한다', async () => {
      mockTeasRepository.findOne.mockResolvedValue(mockTea());
      mockDataSource.query.mockResolvedValue([
        { id: 1, teaId: 1, userId: 2, likeCount: '1', isLiked: '0' },
      ]);

      const result = await service.getTopReviews(1, 99);

      expect(result[0].isLiked).toBe(false);
    });
  });

  describe('getSimilarTeas', () => {
    it('같은 종류이고 유사한 평점의 차를 반환해야 한다', async () => {
      const targetTea = mockTea({ id: 1, type: '홍차', averageRating: 4.0 });
      mockTeasRepository.findOne.mockResolvedValue(targetTea);
      mockQueryBuilder.getMany.mockResolvedValue([
        mockTea({ id: 2, name: '다즐링', averageRating: 4.2 }),
        mockTea({ id: 3, name: '아삼', averageRating: 3.8 }),
      ]);

      const result = await service.getSimilarTeas(1);

      expect(result).toHaveLength(2);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('tea.id != :id', { id: 1 });
    });

    it('보조 정렬(reviewCount DESC, id ASC)이 적용되어야 한다', async () => {
      mockTeasRepository.findOne.mockResolvedValue(mockTea());
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getSimilarTeas(1);

      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('tea.reviewCount', 'DESC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('tea.id', 'ASC');
    });

    it('결과에 요청한 차 자신이 포함되지 않아야 한다', async () => {
      const targetTea = mockTea({ id: 1, type: '녹차', averageRating: 3.5 });
      mockTeasRepository.findOne.mockResolvedValue(targetTea);
      mockQueryBuilder.getMany.mockResolvedValue([
        mockTea({ id: 2, name: '용정차', type: '녹차', averageRating: 3.7 }),
      ]);

      const result = await service.getSimilarTeas(1);

      const ids = result.map((t) => t.id);
      expect(ids).not.toContain(1);
    });

    it('존재하지 않는 차 ID로 요청 시 NotFoundException을 던져야 한다', async () => {
      mockTeasRepository.findOne.mockResolvedValue(null);

      await expect(service.getSimilarTeas(999)).rejects.toThrow(NotFoundException);
    });

    it('유사한 차가 없을 때 빈 배열을 반환해야 한다', async () => {
      mockTeasRepository.findOne.mockResolvedValue(mockTea());
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.getSimilarTeas(1);

      expect(result).toHaveLength(0);
    });
  });

  describe('findPopularTeas', () => {
    it('reviewCount, averageRating 내림차순으로 limit 개수를 반환해야 한다', async () => {
      mockTeasRepository.find.mockResolvedValue([
        mockTea({ id: 1, reviewCount: 10 }),
        mockTea({ id: 2, reviewCount: 5 }),
      ]);

      const result = await service.findPopularTeas(10);

      expect(result).toHaveLength(2);
      expect(mockTeasRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { reviewCount: 'DESC', averageRating: 'DESC', id: 'ASC' },
          take: 10,
        }),
      );
    });

    it('limit을 50으로 제한해야 한다', async () => {
      mockTeasRepository.find.mockResolvedValue([]);

      await service.findPopularTeas(100);

      expect(mockTeasRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });
  });

  describe('findNewTeas', () => {
    it('createdAt 내림차순으로 limit 개수를 반환해야 한다', async () => {
      mockTeasRepository.find.mockResolvedValue([mockTea({ id: 1 }), mockTea({ id: 2 })]);

      const result = await service.findNewTeas(5);

      expect(result).toHaveLength(2);
      expect(mockTeasRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC', id: 'ASC' },
          take: 5,
        }),
      );
    });
  });

  describe('findSellers', () => {
    it('seller별 teaCount를 집계하여 반환해야 한다', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([
          { name: '차향', teaCount: '5' },
          { name: '티하우스', teaCount: '3' },
        ])
        .mockRejectedValueOnce(new Error('skip additional'));

      const result = await service.findSellers();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: '차향', teaCount: 5 });
      expect(result[1]).toEqual({ name: '티하우스', teaCount: 3 });
    });
  });

  describe('findSellersByQuery', () => {
    it('검색어로 seller를 필터링하여 반환해야 한다', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([
          { name: '차향', teaCount: '5' },
          { name: '차향몰', teaCount: '2' },
        ])
        .mockRejectedValueOnce(new Error('skip additional'));

      const result = await service.findSellersByQuery('차');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: '차향', teaCount: 5 });
      expect(result[1]).toEqual({ name: '차향몰', teaCount: 2 });
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('LIKE ?'),
        ['%차%'],
      );
    });
  });

  describe('findBySeller', () => {
    it('해당 seller의 차 목록을 반환해야 한다', async () => {
      mockSellerRepository.findOne.mockResolvedValue(mockSeller());
      mockTeasRepository.find.mockResolvedValue([
        mockTea({ id: 1, seller: mockSeller() }),
        mockTea({ id: 2, seller: mockSeller() }),
      ]);

      const result = await service.findBySeller('차향');

      expect(result).toHaveLength(2);
      expect(mockTeasRepository.find).toHaveBeenCalledWith({
        where: { seller: { id: 1 } },
        relations: ['seller'],
        order: { reviewCount: 'DESC', averageRating: 'DESC', id: 'ASC' },
      });
    });
  });

  describe('findWithFilters', () => {
    it('q 파라미터로 검색어 필터링을 적용해야 한다', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockTea({ name: '정산소종' })]);

      const result = await service.findWithFilters({ q: '정산' });

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('type 파라미터로 차종 필터링을 적용해야 한다', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockTea({ type: '홍차' })]);

      const result = await service.findWithFilters({ type: '홍차' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('tea.type = :type', {
        type: '홍차',
      });
    });

    it('minRating 파라미터로 최소 평점 필터링을 적용해야 한다', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findWithFilters({ minRating: 4 });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'tea.averageRating >= :minRating',
        { minRating: 4 },
      );
    });

    it('sort=popular일 때 reviewCount DESC로 정렬해야 한다', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findWithFilters({ sort: 'popular' });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('tea.reviewCount', 'DESC');
    });

    it('sort=rating일 때 averageRating DESC로 정렬해야 한다', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findWithFilters({ sort: 'rating' });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('tea.averageRating', 'DESC');
    });
  });

  describe('findCurationTeas', () => {
    it('userId 없을 때 인기+신규 차를 혼합하여 반환해야 한다', async () => {
      mockTeasRepository.find
        .mockResolvedValueOnce([mockTea({ id: 1 }), mockTea({ id: 2 })])
        .mockResolvedValueOnce([mockTea({ id: 3 })]);

      const result = await service.findCurationTeas(10);

      expect(result.length).toBeGreaterThan(0);
      expect(mockTeasRepository.find).toHaveBeenCalled();
    });

    it('userId와 온보딩 완료 시 preferredTeaTypes 기반으로 반환해야 한다', async () => {
      mockUsersService.getOnboardingPreference.mockResolvedValue({
        preferredTeaTypes: ['홍차', '녹차'],
        hasCompletedOnboarding: true,
      });
      const popularByType = Array.from({ length: 10 }, (_, i) =>
        mockTea({ id: i + 1, type: ['홍차', '녹차'][i % 2] }),
      );
      mockQueryBuilder.getMany.mockResolvedValue(popularByType);

      const result = await service.findCurationTeas(10, 1);

      expect(result).toHaveLength(10);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('tea.type IN (:...types)', {
        types: ['홍차', '녹차'],
      });
    });
  });
});
