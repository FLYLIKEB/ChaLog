import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teaware } from './entities/teaware.entity';
import { CreateTeawareDto } from './dto/create-teaware.dto';
import { UpdateTeawareDto } from './dto/update-teaware.dto';

@Injectable()
export class TeawareService {
  constructor(
    @InjectRepository(Teaware)
    private teawareRepository: Repository<Teaware>,
  ) {}

  async create(userId: number, dto: CreateTeawareDto): Promise<Teaware> {
    const item = this.teawareRepository.create({
      userId,
      name: dto.name,
      category: dto.category,
      capacity: dto.capacity ?? null,
      material: dto.material ?? null,
      memo: dto.memo ?? null,
      isPinned: false,
    });
    const saved = await this.teawareRepository.save(item);
    return this.findOneOrFail(saved.id, userId);
  }

  async findAll(userId: number): Promise<Teaware[]> {
    return this.teawareRepository.find({
      where: { userId },
      order: { isPinned: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number, userId: number): Promise<Teaware> {
    return this.findOneOrFail(id, userId);
  }

  async update(id: number, userId: number, dto: UpdateTeawareDto): Promise<Teaware> {
    const item = await this.findOneOrFail(id, userId);

    if (dto.name !== undefined) item.name = dto.name;
    if (dto.category !== undefined) item.category = dto.category;
    if (dto.capacity !== undefined) item.capacity = dto.capacity ?? null;
    if (dto.material !== undefined) item.material = dto.material ?? null;
    if (dto.memo !== undefined) item.memo = dto.memo ?? null;

    await this.teawareRepository.save(item);
    return this.findOneOrFail(id, userId);
  }

  async remove(id: number, userId: number): Promise<void> {
    const item = await this.findOneOrFail(id, userId);
    await this.teawareRepository.remove(item);
  }

  async togglePin(id: number, userId: number): Promise<Teaware> {
    const item = await this.findOneOrFail(id, userId);
    item.isPinned = !item.isPinned;
    await this.teawareRepository.save(item);
    return this.findOneOrFail(id, userId);
  }

  private async findOneOrFail(id: number, userId: number): Promise<Teaware> {
    const item = await this.teawareRepository.findOne({
      where: { id, userId },
    });
    if (!item) {
      throw new NotFoundException(`다구(id: ${id})를 찾을 수 없습니다.`);
    }
    return item;
  }
}
