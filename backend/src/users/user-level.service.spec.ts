import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { UserLevelService } from './user-level.service';

const mockDataSource = {
  query: jest.fn(),
};

describe('UserLevelService', () => {
  let service: UserLevelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserLevelService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<UserLevelService>(UserLevelService);
    jest.clearAllMocks();
  });

  function setupQueryMocks(noteCount: number, postCount: number, cellarCount: number, teaTypeCount: number) {
    mockDataSource.query
      .mockResolvedValueOnce([{ cnt: String(noteCount) }])
      .mockResolvedValueOnce([{ cnt: String(postCount) }])
      .mockResolvedValueOnce([{ cnt: String(cellarCount) }])
      .mockResolvedValueOnce([{ cnt: String(teaTypeCount) }]);
  }

  describe('getUserLevel', () => {
    it('차록 0개 → noteLevel 1(입문), nextThreshold 5', async () => {
      setupQueryMocks(0, 0, 0, 0);
      const result = await service.getUserLevel(1);
      expect(result.noteLevel.level).toBe(1);
      expect(result.noteLevel.name).toBe('입문');
      expect(result.noteLevel.nextThreshold).toBe(5);
      expect(result.noteLevel.count).toBe(0);
    });

    it('차록 5개 → noteLevel 2(수련)', async () => {
      setupQueryMocks(5, 0, 0, 0);
      const result = await service.getUserLevel(1);
      expect(result.noteLevel.level).toBe(2);
      expect(result.noteLevel.name).toBe('수련');
    });

    it('차록 20개 → noteLevel 3(숙련)', async () => {
      setupQueryMocks(20, 0, 0, 0);
      const result = await service.getUserLevel(1);
      expect(result.noteLevel.level).toBe(3);
      expect(result.noteLevel.name).toBe('숙련');
    });

    it('차록 50개 → noteLevel 4(마스터), nextThreshold null', async () => {
      setupQueryMocks(50, 0, 0, 0);
      const result = await service.getUserLevel(1);
      expect(result.noteLevel.level).toBe(4);
      expect(result.noteLevel.name).toBe('마스터');
      expect(result.noteLevel.nextThreshold).toBeNull();
    });

    it('게시글 0개 → postLevel 1(새싹)', async () => {
      setupQueryMocks(0, 0, 0, 0);
      const result = await service.getUserLevel(1);
      expect(result.postLevel.level).toBe(1);
      expect(result.postLevel.name).toBe('새싹');
    });

    it('게시글 5개 → postLevel 2(이웃)', async () => {
      setupQueryMocks(0, 5, 0, 0);
      const result = await service.getUserLevel(1);
      expect(result.postLevel.level).toBe(2);
      expect(result.postLevel.name).toBe('이웃');
    });

    it('게시글 20개 → postLevel 3(단골)', async () => {
      setupQueryMocks(0, 20, 0, 0);
      const result = await service.getUserLevel(1);
      expect(result.postLevel.level).toBe(3);
      expect(result.postLevel.name).toBe('단골');
    });

    it('게시글 50개 → postLevel 4(터줏대감)', async () => {
      setupQueryMocks(0, 50, 0, 0);
      const result = await service.getUserLevel(1);
      expect(result.postLevel.level).toBe(4);
      expect(result.postLevel.name).toBe('터줏대감');
    });

    it('찻장 0개 → cellarLevel 1(비어있음)', async () => {
      setupQueryMocks(0, 0, 0, 0);
      const result = await service.getUserLevel(1);
      expect(result.cellarLevel.level).toBe(1);
      expect(result.cellarLevel.name).toBe('비어있음');
    });

    it('찻장 15개 → cellarLevel 3(수집가)', async () => {
      setupQueryMocks(0, 0, 15, 0);
      const result = await service.getUserLevel(1);
      expect(result.cellarLevel.level).toBe(3);
      expect(result.cellarLevel.name).toBe('수집가');
    });
  });

  describe('badges (computeBadges)', () => {
    it('차록 1개 이상 → 첫 차록 배지', async () => {
      setupQueryMocks(1, 0, 0, 0);
      const result = await service.getUserLevel(1);
      expect(result.badges.some((b) => b.id === 'first_note')).toBe(true);
    });

    it('차록 0개 → 첫 차록 배지 없음', async () => {
      setupQueryMocks(0, 0, 0, 0);
      const result = await service.getUserLevel(1);
      expect(result.badges.some((b) => b.id === 'first_note')).toBe(false);
    });

    it('차록 10개 → note_10 배지', async () => {
      setupQueryMocks(10, 0, 0, 0);
      const result = await service.getUserLevel(1);
      expect(result.badges.some((b) => b.id === 'note_10')).toBe(true);
    });

    it('차록 50개 → note_50 배지', async () => {
      setupQueryMocks(50, 0, 0, 0);
      const result = await service.getUserLevel(1);
      expect(result.badges.some((b) => b.id === 'note_50')).toBe(true);
    });

    it('게시글 1개 → first_post 배지', async () => {
      setupQueryMocks(0, 1, 0, 0);
      const result = await service.getUserLevel(1);
      expect(result.badges.some((b) => b.id === 'first_post')).toBe(true);
    });

    it('찻장 10개 → cellar_10 배지', async () => {
      setupQueryMocks(0, 0, 10, 0);
      const result = await service.getUserLevel(1);
      expect(result.badges.some((b) => b.id === 'cellar_10')).toBe(true);
    });

    it('차 종류 5가지 → variety_5 배지', async () => {
      setupQueryMocks(0, 0, 0, 5);
      const result = await service.getUserLevel(1);
      expect(result.badges.some((b) => b.id === 'variety_5')).toBe(true);
    });

    it('모든 조건 미충족 → 빈 배지 배열', async () => {
      setupQueryMocks(0, 0, 0, 0);
      const result = await service.getUserLevel(1);
      expect(result.badges).toHaveLength(0);
    });
  });
});
