import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { CellarItem } from './entities/cellar-item.entity';
import { CreateCellarItemDto } from './dto/create-cellar-item.dto';
import { UpdateCellarItemDto } from './dto/update-cellar-item.dto';
import { TeasService } from '../teas/teas.service';

@Injectable()
export class CellarService {
  private readonly logger = new Logger(CellarService.name);

  constructor(
    @InjectRepository(CellarItem)
    private cellarItemsRepository: Repository<CellarItem>,
    private teasService: TeasService,
  ) {}

  async create(userId: number, createCellarItemDto: CreateCellarItemDto): Promise<CellarItem> {
    await this.teasService.findOne(createCellarItemDto.teaId);

    const item = this.cellarItemsRepository.create({
      userId,
      teaId: createCellarItemDto.teaId,
      quantity: createCellarItemDto.quantity ?? 0,
      unit: createCellarItemDto.unit ?? 'g',
      openedAt: createCellarItemDto.openedAt ? new Date(createCellarItemDto.openedAt) : null,
      remindAt: createCellarItemDto.remindAt ? new Date(createCellarItemDto.remindAt) : null,
      memo: createCellarItemDto.memo ?? null,
    });

    const saved = await this.cellarItemsRepository.save(item);
    return this.findOne(userId, saved.id);
  }

  async findAll(userId: number): Promise<CellarItem[]> {
    return this.cellarItemsRepository.find({
      where: { userId },
      relations: ['tea'],
      order: { remindAt: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(userId: number, id: number): Promise<CellarItem> {
    const item = await this.cellarItemsRepository.findOne({
      where: { id },
      relations: ['tea'],
    });

    if (!item) {
      throw new NotFoundException('셀러 아이템을 찾을 수 없습니다.');
    }

    if (item.userId !== userId) {
      throw new ForbiddenException('이 아이템에 접근할 권한이 없습니다.');
    }

    return item;
  }

  async update(userId: number, id: number, updateCellarItemDto: UpdateCellarItemDto): Promise<CellarItem> {
    const item = await this.findOne(userId, id);

    if (updateCellarItemDto.quantity !== undefined) item.quantity = updateCellarItemDto.quantity;
    if (updateCellarItemDto.unit !== undefined) item.unit = updateCellarItemDto.unit;
    if (updateCellarItemDto.openedAt !== undefined) {
      item.openedAt = updateCellarItemDto.openedAt ? new Date(updateCellarItemDto.openedAt) : null;
    }
    if (updateCellarItemDto.remindAt !== undefined) {
      item.remindAt = updateCellarItemDto.remindAt ? new Date(updateCellarItemDto.remindAt) : null;
    }
    if (updateCellarItemDto.memo !== undefined) item.memo = updateCellarItemDto.memo ?? null;

    await this.cellarItemsRepository.save(item);
    return this.findOne(userId, id);
  }

  async remove(userId: number, id: number): Promise<void> {
    const item = await this.cellarItemsRepository.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException('셀러 아이템을 찾을 수 없습니다.');
    }

    if (item.userId !== userId) {
      throw new ForbiddenException('이 아이템을 삭제할 권한이 없습니다.');
    }

    await this.cellarItemsRepository.remove(item);
  }

  async findReminders(userId: number): Promise<CellarItem[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return this.cellarItemsRepository.find({
      where: {
        userId,
        remindAt: LessThanOrEqual(today),
      },
      relations: ['tea'],
      order: { remindAt: 'ASC' },
    });
  }
}
