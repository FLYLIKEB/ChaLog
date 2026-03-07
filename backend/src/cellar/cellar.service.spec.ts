import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CellarService } from './cellar.service';
import { CellarItem } from './entities/cellar-item.entity';
import { TeasService } from '../teas/teas.service';

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
    name: '테스트 차',
    type: '녹차',
  };

  const mockUser1CellarItem = (overrides: Partial<CellarItem> = {}): CellarItem =>
    ({
      id: 1,
      userId: 10,
      teaId: 1,
      tea: mockTea as any,
      quantity: 50,
      unit: 'g',
      openedAt: null,
      remindAt: null,
      memo: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    } as CellarItem);

  beforeEach(async () => {
    jest.clearAllMocks();

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
    cellarItemsRepository = module.get<Repository<CellarItem>>(
      getRepositoryToken(CellarItem),
    );
    teasService = module.get<TeasService>(TeasService);
  });

  it('서비스가 정의되어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('셀러 아이템을 생성해야 한다', async () => {
      const userId = 10;
      const dto = { teaId: 1, quantity: 100, unit: 'g' as const };
      const createdItem = mockUser1CellarItem({ quantity: 100 });

      mockTeasService.findOne.mockResolvedValue(mockTea);
      mockCellarItemsRepository.create.mockReturnValue(createdItem);
      mockCellarItemsRepository.save.mockResolvedValue(createdItem);
      mockCellarItemsRepository.findOne.mockResolvedValue(createdItem);

      const result = await service.create(userId, dto);

      expect(mockTeasService.findOne).toHaveBeenCalledWith(dto.teaId);
      expect(mockCellarItemsRepository.create).toHaveBeenCalled();
      expect(mockCellarItemsRepository.save).toHaveBeenCalled();
      expect(result).toEqual(createdItem);
    });

    it('존재하지 않는 teaId로 생성 시 NotFoundException을 던져야 한다', async () => {
      mockTeasService.findOne.mockRejectedValue(
        new NotFoundException('차를 찾을 수 없습니다.'),
      );

      await expect(
        service.create(10, { teaId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('openedAt과 remindAt을 Date로 변환해야 한다', async () => {
      const userId = 10;
      const dto = {
        teaId: 1,
        openedAt: '2024-03-01',
        remindAt: '2024-04-01T09:00:00.000Z',
      };
      const createdItem = mockUser1CellarItem({
        openedAt: new Date('2024-03-01'),
        remindAt: new Date('2024-04-01T09:00:00.000Z'),
      });

      mockTeasService.findOne.mockResolvedValue(mockTea);
      mockCellarItemsRepository.create.mockReturnValue(createdItem);
      mockCellarItemsRepository.save.mockResolvedValue(createdItem);
      mockCellarItemsRepository.findOne.mockResolvedValue(createdItem);

      await service.create(userId, dto);

      expect(mockCellarItemsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          openedAt: new Date('2024-03-01'),
          remindAt: new Date('2024-04-01T09:00:00.000Z'),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('해당 사용자의 셀러 아이템 목록을 반환해야 한다', async () => {
      const userId = 10;
      const items = [mockUser1CellarItem(), mockUser1CellarItem({ id: 2 })];
      mockCellarItemsRepository.find.mockResolvedValue(items);

      const result = await service.findAll(userId);

      expect(mockCellarItemsRepository.find).toHaveBeenCalledWith({
        where: { userId },
        relations: ['tea'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(items);
    });

    it('아이템이 없으면 빈 배열을 반환해야 한다', async () => {
      mockCellarItemsRepository.find.mockResolvedValue([]);

      const result = await service.findAll(999);
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('자신의 셀러 아이템을 조회해야 한다', async () => {
      const item = mockUser1CellarItem();
      mockCellarItemsRepository.findOne.mockResolvedValue(item);

      const result = await service.findOne(10, 1);
      expect(result).toEqual(item);
    });

    it('존재하지 않는 아이템 조회 시 NotFoundException을 던져야 한다', async () => {
      mockCellarItemsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(10, 999)).rejects.toThrow(NotFoundException);
    });

    it('다른 사용자의 아이템 접근 시 ForbiddenException을 던져야 한다', async () => {
      const item = mockUser1CellarItem({ userId: 10 });
      mockCellarItemsRepository.findOne.mockResolvedValue(item);

      await expect(service.findOne(99, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('셀러 아이템을 수정해야 한다', async () => {
      const original = mockUser1CellarItem({ quantity: 50 });
      const updated = mockUser1CellarItem({ quantity: 30 });

      mockCellarItemsRepository.findOne
        .mockResolvedValueOnce(original)
        .mockResolvedValueOnce(updated);
      mockCellarItemsRepository.save.mockResolvedValue(updated);

      const result = await service.update(10, 1, { quantity: 30 });
      expect(result.quantity).toBe(30);
    });

    it('다른 사용자의 아이템 수정 시 ForbiddenException을 던져야 한다', async () => {
      const item = mockUser1CellarItem({ userId: 10 });
      mockCellarItemsRepository.findOne.mockResolvedValue(item);

      await expect(service.update(99, 1, { quantity: 10 })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('존재하지 않는 아이템 수정 시 NotFoundException을 던져야 한다', async () => {
      mockCellarItemsRepository.findOne.mockResolvedValue(null);

      await expect(service.update(10, 999, { quantity: 10 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('teaId 변경 시 teasService로 차 존재 확인을 해야 한다', async () => {
      const original = mockUser1CellarItem({ teaId: 1 });
      const updated = mockUser1CellarItem({ teaId: 2 });
      const newTea = { id: 2, name: '새 차', type: '홍차' };

      mockCellarItemsRepository.findOne
        .mockResolvedValueOnce(original)
        .mockResolvedValueOnce(updated);
      mockCellarItemsRepository.save.mockResolvedValue(updated);
      mockTeasService.findOne.mockResolvedValue(newTea);

      await service.update(10, 1, { teaId: 2 });

      expect(mockTeasService.findOne).toHaveBeenCalledWith(2);
    });
  });

  describe('remove', () => {
    it('셀러 아이템을 삭제해야 한다', async () => {
      const item = mockUser1CellarItem();
      mockCellarItemsRepository.findOne.mockResolvedValue(item);
      mockCellarItemsRepository.remove.mockResolvedValue(undefined);

      await service.remove(10, 1);

      expect(mockCellarItemsRepository.remove).toHaveBeenCalledWith(item);
    });

    it('다른 사용자의 아이템 삭제 시 ForbiddenException을 던져야 한다', async () => {
      const item = mockUser1CellarItem({ userId: 10 });
      mockCellarItemsRepository.findOne.mockResolvedValue(item);

      await expect(service.remove(99, 1)).rejects.toThrow(ForbiddenException);
    });

    it('존재하지 않는 아이템 삭제 시 NotFoundException을 던져야 한다', async () => {
      mockCellarItemsRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(10, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findReminders', () => {
    it('remindAt이 현재 시각 이전인 아이템만 반환해야 한다', async () => {
      const pastDate = new Date('2020-01-01');
      const item = mockUser1CellarItem({ remindAt: pastDate });
      mockCellarItemsRepository.find.mockResolvedValue([item]);

      const result = await service.findReminders(10);

      expect(mockCellarItemsRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 10 }),
          relations: ['tea'],
          order: { remindAt: 'ASC' },
        }),
      );
      expect(result).toEqual([item]);
    });

    it('리마인더 아이템이 없으면 빈 배열을 반환해야 한다', async () => {
      mockCellarItemsRepository.find.mockResolvedValue([]);

      const result = await service.findReminders(10);
      expect(result).toEqual([]);
    });
  });
});
