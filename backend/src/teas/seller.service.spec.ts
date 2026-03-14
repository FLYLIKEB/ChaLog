import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { SellerService } from './seller.service';
import { Seller } from './entities/seller.entity';
import { Tea } from './entities/tea.entity';

const mockSellerRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

const mockTeasRepository = {
  find: jest.fn(),
};

const mockDataSource = {
  query: jest.fn(),
};

const makeSeller = (overrides: Partial<Seller> = {}): Seller =>
  ({
    id: 1,
    name: '이도다원',
    address: null,
    mapUrl: null,
    websiteUrl: null,
    phone: null,
    description: null,
    businessHours: null,
    ...overrides,
  }) as Seller;

describe('SellerService', () => {
  let service: SellerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellerService,
        { provide: getRepositoryToken(Seller), useValue: mockSellerRepository },
        { provide: getRepositoryToken(Tea), useValue: mockTeasRepository },
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<SellerService>(SellerService);
    jest.clearAllMocks();
  });

  describe('createSeller', () => {
    it('빈 이름 → Error throw', async () => {
      await expect(service.createSeller({ name: '   ' })).rejects.toThrow('찻집 이름을 입력해주세요.');
    });

    it('이미 존재하는 이름(추가 필드 없음) → 기존 seller 반환', async () => {
      const existing = makeSeller();
      mockSellerRepository.findOne.mockResolvedValue(existing);

      const result = await service.createSeller({ name: '이도다원' });

      expect(mockSellerRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual(existing);
    });

    it('이미 존재하는 이름 + 추가 필드 → 업데이트 후 반환', async () => {
      const existing = makeSeller();
      mockSellerRepository.findOne.mockResolvedValue(existing);
      mockSellerRepository.save.mockResolvedValue({ ...existing, address: '서울시 종로구' });

      const result = await service.createSeller({ name: '이도다원', address: '서울시 종로구' });

      expect(mockSellerRepository.save).toHaveBeenCalled();
      expect(result.address).toBe('서울시 종로구');
    });

    it('신규 이름 → seller 생성 후 반환', async () => {
      mockSellerRepository.findOne.mockResolvedValue(null);
      const newSeller = makeSeller({ id: 2, name: '차향다원' });
      mockSellerRepository.create.mockReturnValue(newSeller);
      mockSellerRepository.save.mockResolvedValue(newSeller);

      const result = await service.createSeller({ name: '차향다원' });

      expect(mockSellerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: '차향다원' }),
      );
      expect(result.name).toBe('차향다원');
    });

    it('중복 키 에러(ER_DUP_ENTRY) 시 기존 seller 반환', async () => {
      mockSellerRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeSeller());
      mockSellerRepository.create.mockReturnValue(makeSeller());
      const dupError = Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
      mockSellerRepository.save.mockRejectedValue(dupError);

      const result = await service.createSeller({ name: '이도다원' });

      expect(result).toEqual(makeSeller());
    });
  });

  describe('findSellerByName', () => {
    it('이름으로 seller 조회', async () => {
      const seller = makeSeller();
      mockSellerRepository.findOne.mockResolvedValue(seller);

      const result = await service.findSellerByName('이도다원');

      expect(mockSellerRepository.findOne).toHaveBeenCalledWith({ where: { name: '이도다원' } });
      expect(result).toEqual(seller);
    });

    it('존재하지 않으면 null 반환', async () => {
      mockSellerRepository.findOne.mockResolvedValue(null);
      const result = await service.findSellerByName('없는다원');
      expect(result).toBeNull();
    });
  });

  describe('updateSeller', () => {
    it('존재하지 않는 seller → null 반환', async () => {
      mockSellerRepository.findOne.mockResolvedValue(null);
      const result = await service.updateSeller('없는다원', { address: '서울' });
      expect(result).toBeNull();
    });

    it('존재하는 seller → 필드 업데이트 후 반환', async () => {
      const seller = makeSeller();
      mockSellerRepository.findOne.mockResolvedValue(seller);
      mockSellerRepository.save.mockResolvedValue({ ...seller, address: '서울시 강남구' });

      const result = await service.updateSeller('이도다원', { address: '서울시 강남구' });

      expect(mockSellerRepository.save).toHaveBeenCalled();
      expect(result?.address).toBe('서울시 강남구');
    });

    it('빈 문자열 address → null 저장', async () => {
      const seller = makeSeller({ address: '기존주소' });
      mockSellerRepository.findOne.mockResolvedValue(seller);
      mockSellerRepository.save.mockResolvedValue({ ...seller, address: null });

      const result = await service.updateSeller('이도다원', { address: '' });

      expect(result?.address).toBeNull();
    });
  });

  describe('findSellers', () => {
    it('차와 연결된 seller 목록 반환', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ name: '이도다원', teaCount: '5' }])
        .mockResolvedValueOnce([{ name: '이도다원' }, { name: '차향다원' }]);

      const result = await service.findSellers();

      expect(result[0].name).toBe('이도다원');
      expect(result[0].teaCount).toBe(5);
      expect(result.some((s) => s.name === '차향다원')).toBe(true);
    });

    it('sellers 테이블 조회 실패 시 fromTeas만 반환', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ name: '이도다원', teaCount: '3' }])
        .mockRejectedValueOnce(new Error('DB error'));

      const result = await service.findSellers();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('이도다원');
    });
  });

  describe('findSellersByQuery', () => {
    it('쿼리로 seller 검색', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ name: '이도다원', teaCount: '5' }])
        .mockResolvedValueOnce([{ name: '이도다원' }]);

      const result = await service.findSellersByQuery('이도');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('이도다원');
    });

    it('결과 최대 20개 제한', async () => {
      const rows = Array.from({ length: 25 }, (_, i) => ({ name: `다원${i}`, teaCount: '1' }));
      mockDataSource.query.mockResolvedValueOnce(rows).mockResolvedValueOnce([]);

      const result = await service.findSellersByQuery('다원');

      expect(result.length).toBeLessThanOrEqual(20);
    });
  });

  describe('findBySeller', () => {
    it('존재하지 않는 seller → 빈 배열 반환', async () => {
      mockSellerRepository.findOne.mockResolvedValue(null);
      const result = await service.findBySeller('없는다원');
      expect(result).toEqual([]);
    });

    it('존재하는 seller → 해당 seller의 차 목록 반환', async () => {
      const seller = makeSeller();
      mockSellerRepository.findOne.mockResolvedValue(seller);
      const teas = [{ id: 1, name: '화과향', seller } as Tea];
      mockTeasRepository.find.mockResolvedValue(teas);

      const result = await service.findBySeller('이도다원');

      expect(mockTeasRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { seller: { id: seller.id } } }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
