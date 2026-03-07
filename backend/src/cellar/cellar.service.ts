import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
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

  async create(userId: number, dto: CreateCellarItemDto): Promise<CellarItem> {
    const tea = await this.teasService.findOne(dto.teaId);

    const item = this.cellarItemsRepository.create({
      userId,
      teaId: tea.id,
      quantity: dto.quantity ?? 0,
      unit: dto.unit ?? 'g',
      openedAt: dto.openedAt ? new Date(dto.openedAt) : null,
      remindAt: dto.remindAt ? new Date(dto.remindAt) : null,
      memo: dto.memo ?? null,
    });

    const saved = await this.cellarItemsRepository.save(item);
    return this.findOneOrFail(saved.id);
  }

  async findAll(userId: number): Promise<CellarItem[]> {
    return this.cellarItemsRepository.find({
      where: { userId },
      relations: ['tea'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: number, id: number): Promise<CellarItem> {
    const item = await this.findOneOrFail(id);
    if (item.userId !== userId) {
      throw new ForbiddenException('이 셀러 아이템에 접근할 권한이 없습니다.');
    }
    return item;
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateCellarItemDto,
  ): Promise<CellarItem> {
    const item = await this.findOneOrFail(id);
    if (item.userId !== userId) {
      throw new ForbiddenException('이 셀러 아이템을 수정할 권한이 없습니다.');
    }

    if (dto.teaId !== undefined && dto.teaId !== item.teaId) {
      await this.teasService.findOne(dto.teaId);
      item.teaId = dto.teaId;
    }
    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.unit !== undefined) item.unit = dto.unit;
    if (dto.openedAt !== undefined)
      item.openedAt = dto.openedAt ? new Date(dto.openedAt) : null;
    if (dto.remindAt !== undefined)
      item.remindAt = dto.remindAt ? new Date(dto.remindAt) : null;
    if (dto.memo !== undefined) item.memo = dto.memo ?? null;

    await this.cellarItemsRepository.save(item);
    return this.findOneOrFail(id);
  }

  async remove(userId: number, id: number): Promise<void> {
    const item = await this.findOneOrFail(id);
    if (item.userId !== userId) {
      throw new ForbiddenException('이 셀러 아이템을 삭제할 권한이 없습니다.');
    }
    await this.cellarItemsRepository.remove(item);
  }

  async findReminders(userId: number): Promise<CellarItem[]> {
    return this.cellarItemsRepository.find({
      where: {
        userId,
        remindAt: LessThanOrEqual(new Date()),
      },
      relations: ['tea'],
      order: { remindAt: 'ASC' },
    });
  }

  private async findOneOrFail(id: number): Promise<CellarItem> {
    const item = await this.cellarItemsRepository.findOne({
      where: { id },
      relations: ['tea'],
    });
    if (!item) {
      throw new NotFoundException(`셀러 아이템(id: ${id})을 찾을 수 없습니다.`);
    }
    return item;
  }
}
