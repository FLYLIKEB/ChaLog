import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CellarService } from './cellar.service';
import { CellarItem } from './entities/cellar-item.entity';
import { TeasService } from '../teas/teas.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('CellarService', () => {
  let service: CellarService;
  let cellarItemsRepository: Repository<CellarItem>;
  let teasService: TeasService;

  const mockCellarItemsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  const mockTeasService = {
    findOne: jest.fn(),
  };

  const mockTea = {
    id: 1,
    name: '운남 보이차',
    type: '보이차',
    averageRating: 4.5,
    reviewCount: 10,
  };

  const mockCellarItem: CellarItem = {
    id: 1,
    userId: 1,
    teaId: 1,
    tea: mockTea as any,
    user: { id: 1, name: '테스트 사용자' } as any,
    quantity: 100,
    unit: 'g',
    openedAt: null,
    remindAt: null,
    memo: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CellarService,
        {
          provide: getRepositoryToken(CellarItem),
          useValue: mockCellarItemsRepository,
        },
        {
          provide: TeasService,
          useValue: mockTeasService,
        },
      ],
    }).compile();

    service = module.get<CellarService>(CellarService);
    cellarItemsRepository = module.get<Repository<CellarItem>>(getRepositoryToken(CellarItem));
    teasService = module.get<TeasService>(TeasService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('셀러 아이템을 생성한다', async () => {
      mockTeasService.findOne.mockResolvedValue(mockTea);
      mockCellarItemsRepository.create.mockReturnValue(mockCellarItem);
      mockCellarItemsRepository.save.mockResolvedValue(mockCellarItem);
      mockCellarItemsRepository.findOne.mockResolvedValue(mockCellarItem);

      const result = await service.create(1, {
        teaId: 1,
        quantity: 100,
        unit: 'g',
      });

      expect(mockTeasService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockCellarItem);
    });

    it('존재하지 않는 teaId로 생성 시 NotFoundException을 던진다', async () => {
      mockTeasService.findOne.mockRejectedValue(new NotFoundException('차를 찾을 수 없습니다.'));

      await expect(service.create(1, { teaId: 999 })).rejects.toThrow(NotFoundException);
    });

    it('quantity와 unit 기본값이 적용된다', async () => {
      mockTeasService.findOne.mockResolvedValue(mockTea);
      mockCellarItemsRepository.create.mockReturnValue({ ...mockCellarItem, quantity: 0, unit: 'g' });
      mockCellarItemsRepository.save.mockResolvedValue({ ...mockCellarItem, quantity: 0, unit: 'g' });
      mockCellarItemsRepository.findOne.mockResolvedValue({ ...mockCellarItem, quantity: 0, unit: 'g' });

      await service.create(1, { teaId: 1 });

      expect(mockCellarItemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 0,
          unit: 'g',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('사용자의 모든 셀러 아이템을 반환한다', async () => {
      mockCellarItemsRepository.find.mockResolvedValue([mockCellarItem]);

      const result = await service.findAll(1);

      expect(mockCellarItemsRepository.find).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: ['tea'],
        order: { remindAt: 'ASC', createdAt: 'DESC' },
      });
      expect(result).toEqual([mockCellarItem]);
    });

    it('빈 목록을 반환한다', async () => {
      mockCellarItemsRepository.find.mockResolvedValue([]);
      const result = await service.findAll(1);
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('아이템을 반환한다', async () => {
      mockCellarItemsRepository.findOne.mockResolvedValue(mockCellarItem);
      const result = await service.findOne(1, 1);
      expect(result).toEqual(mockCellarItem);
    });

    it('존재하지 않는 아이템은 NotFoundException을 던진다', async () => {
      mockCellarItemsRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 아이템 접근 시 ForbiddenException을 던진다', async () => {
      mockCellarItemsRepository.findOne.mockResolvedValue({ ...mockCellarItem, userId: 2 });
      await expect(service.findOne(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('아이템을 수정한다', async () => {
      const updatedItem = { ...mockCellarItem, quantity: 50, memo: '반쯤 마심' };
      mockCellarItemsRepository.findOne
        .mockResolvedValueOnce(mockCellarItem)
        .mockResolvedValueOnce(updatedItem);
      mockCellarItemsRepository.save.mockResolvedValue(updatedItem);

      const result = await service.update(1, 1, { quantity: 50, memo: '반쯤 마심' });

      expect(mockCellarItemsRepository.save).toHaveBeenCalled();
      expect(result.quantity).toBe(50);
      expect(result.memo).toBe('반쯤 마심');
    });

    it('다른 사용자의 아이템 수정 시 ForbiddenException을 던진다', async () => {
      mockCellarItemsRepository.findOne.mockResolvedValue({ ...mockCellarItem, userId: 2 });
      await expect(service.update(1, 1, { quantity: 50 })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('아이템을 삭제한다', async () => {
      mockCellarItemsRepository.findOne.mockResolvedValue(mockCellarItem);
      mockCellarItemsRepository.remove.mockResolvedValue(mockCellarItem);

      await service.remove(1, 1);

      expect(mockCellarItemsRepository.remove).toHaveBeenCalledWith(mockCellarItem);
    });

    it('존재하지 않는 아이템 삭제 시 NotFoundException을 던진다', async () => {
      mockCellarItemsRepository.findOne.mockResolvedValue(null);
      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 아이템 삭제 시 ForbiddenException을 던진다', async () => {
      mockCellarItemsRepository.findOne.mockResolvedValue({ ...mockCellarItem, userId: 2 });
      await expect(service.remove(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findReminders', () => {
    it('오늘까지 도래한 리마인더 아이템을 반환한다', async () => {
      const reminderItem = { ...mockCellarItem, remindAt: new Date('2024-01-01') };
      mockCellarItemsRepository.find.mockResolvedValue([reminderItem]);

      const result = await service.findReminders(1);

      expect(mockCellarItemsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 1 }),
          relations: ['tea'],
          order: { remindAt: 'ASC' },
        }),
      );
      expect(result).toEqual([reminderItem]);
    });

    it('리마인더가 없으면 빈 배열을 반환한다', async () => {
      mockCellarItemsRepository.find.mockResolvedValue([]);
      const result = await service.findReminders(1);
      expect(result).toEqual([]);
    });
  });
});
