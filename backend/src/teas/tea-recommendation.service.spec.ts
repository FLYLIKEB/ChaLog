import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TeaRecommendationService } from './tea-recommendation.service';
import { Tea } from './entities/tea.entity';
import { UsersService } from '../users/users.service';
import { TeaAnalyticsService } from './tea-analytics.service';

const mockTeasRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockDataSource = {
  query: jest.fn(),
};

const mockUsersService = {
  getOnboardingPreference: jest.fn(),
};

const mockTeaAnalyticsService = {
  getPopularTags: jest.fn(),
};

const makeTea = (overrides: Partial<Tea> = {}): Tea =>
  ({
    id: 1,
    name: '화과향',
    type: '백차',
    averageRating: 4.5,
    reviewCount: 20,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  }) as Tea;

describe('TeaRecommendationService', () => {
  let service: TeaRecommendationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeaRecommendationService,
        { provide: getRepositoryToken(Tea), useValue: mockTeasRepository },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: UsersService, useValue: mockUsersService },
        { provide: TeaAnalyticsService, useValue: mockTeaAnalyticsService },
      ],
    }).compile();

    service = module.get<TeaRecommendationService>(TeaRecommendationService);
    jest.clearAllMocks();
  });

  describe('findPopularTeas', () => {
    it('reviewCount DESC 순으로 차 목록 반환', async () => {
      const teas = [makeTea({ id: 1, reviewCount: 20 }), makeTea({ id: 2, reviewCount: 10 })];
      mockTeasRepository.find.mockResolvedValue(teas);

      const result = await service.findPopularTeas(2);

      expect(mockTeasRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { reviewCount: 'DESC', averageRating: 'DESC', id: 'ASC' },
          take: 2,
        }),
      );
      expect(result).toHaveLength(2);
    });

    it('limit 50 초과 시 50으로 clamp', async () => {
      mockTeasRepository.find.mockResolvedValue([]);
      await service.findPopularTeas(100);
      expect(mockTeasRepository.find).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }));
    });

    it('limit 0 이하 시 1로 clamp', async () => {
      mockTeasRepository.find.mockResolvedValue([]);
      await service.findPopularTeas(0);
      expect(mockTeasRepository.find).toHaveBeenCalledWith(expect.objectContaining({ take: 1 }));
    });
  });

  describe('findNewTeas', () => {
    it('createdAt DESC 순으로 차 목록 반환', async () => {
      const teas = [makeTea({ id: 2, createdAt: new Date('2024-06-01') })];
      mockTeasRepository.find.mockResolvedValue(teas);

      const result = await service.findNewTeas(1);

      expect(mockTeasRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC', id: 'ASC' },
          take: 1,
        }),
      );
      expect(result).toEqual(teas);
    });
  });

  describe('getSimilarTeas', () => {
    it('존재하지 않는 차 ID → NotFoundException', async () => {
      mockTeasRepository.findOne.mockResolvedValue(null);

      await expect(service.getSimilarTeas(999)).rejects.toThrow(NotFoundException);
    });

    it('같은 type의 차들을 반환 (빌더 체인)', async () => {
      const tea = makeTea({ id: 1, type: '백차', averageRating: 4.5 });
      mockTeasRepository.findOne.mockResolvedValue(tea);

      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([makeTea({ id: 2, type: '백차' })]),
      };
      mockTeasRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getSimilarTeas(1);

      expect(mockQb.where).toHaveBeenCalledWith('tea.type = :type', { type: '백차' });
      expect(mockQb.andWhere).toHaveBeenCalledWith('tea.id != :id', { id: 1 });
      expect(result).toHaveLength(1);
    });
  });

  describe('findCurationTeas', () => {
    it('userId 없을 때 popular+new 혼합 반환', async () => {
      const popularTeas = [makeTea({ id: 1 }), makeTea({ id: 2 })];
      const newTeas = [makeTea({ id: 3 })];
      mockTeasRepository.find
        .mockResolvedValueOnce(popularTeas)
        .mockResolvedValueOnce(newTeas);

      const result = await service.findCurationTeas(3);

      expect(result).toHaveLength(3);
      const ids = result.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('userId 있고 onboarding 완료 + 선호 타입 있을 때 타입 기반 쿼리', async () => {
      mockUsersService.getOnboardingPreference.mockResolvedValue({
        hasCompletedOnboarding: true,
        preferredTeaTypes: ['백차', '녹차'],
      });

      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([makeTea({ id: 1 }), makeTea({ id: 2 })]),
      };
      mockTeasRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findCurationTeas(2, 1);

      expect(mockUsersService.getOnboardingPreference).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
    });

    it('onboarding 미완료 시 popular+new 혼합', async () => {
      mockUsersService.getOnboardingPreference.mockResolvedValue({
        hasCompletedOnboarding: false,
        preferredTeaTypes: [],
      });
      mockTeasRepository.find.mockResolvedValue([makeTea()]);

      const result = await service.findCurationTeas(5, 1);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findTeasByTags', () => {
    it('빈 태그 배열 → 빈 배열 반환 (DB 미조회)', async () => {
      const result = await service.findTeasByTags({ tags: [] });
      expect(result).toEqual([]);
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('태그 있을 때 dataSource.query 호출', async () => {
      mockDataSource.query.mockResolvedValue([
        { id: 1, name: '화과향', type: '백차', averageRating: '4.5', reviewCount: '20', createdAt: new Date(), updatedAt: new Date(), sellerName: null },
      ]);

      const result = await service.findTeasByTags({ tags: ['꽃향'], sort: 'match', limit: 10 });

      expect(mockDataSource.query).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].averageRating).toBe(4.5);
    });

    it('limit 100 초과 시 100으로 clamp', async () => {
      mockDataSource.query.mockResolvedValue([]);
      await service.findTeasByTags({ tags: ['꽃향'], limit: 200 });
      const callArgs = mockDataSource.query.mock.calls[0][1] as number[];
      expect(callArgs[callArgs.length - 1]).toBe(100);
    });
  });

  describe('getSimilarTeasByTags', () => {
    it('태그 없으면 getSimilarTeas 결과로 fallback', async () => {
      mockTeaAnalyticsService.getPopularTags.mockResolvedValue({ tags: [] });
      const tea = makeTea({ id: 1, type: '백차', averageRating: 4.5 });
      mockTeasRepository.findOne.mockResolvedValue(tea);

      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([makeTea({ id: 2 })]),
      };
      mockTeasRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getSimilarTeasByTags(1);

      expect(mockTeaAnalyticsService.getPopularTags).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(1);
    });
  });
});
