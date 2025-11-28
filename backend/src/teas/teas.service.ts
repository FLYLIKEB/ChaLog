import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tea } from './entities/tea.entity';
import { CreateTeaDto } from './dto/create-tea.dto';

@Injectable()
export class TeasService {
  constructor(
    @InjectRepository(Tea)
    private teasRepository: Repository<Tea>,
  ) {}

  async create(createTeaDto: CreateTeaDto): Promise<Tea> {
    const tea = this.teasRepository.create({
      ...createTeaDto,
      averageRating: 0,
      reviewCount: 0,
    });
    return await this.teasRepository.save(tea);
  }

  async findAll(): Promise<Tea[]> {
    return await this.teasRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Tea> {
    const tea = await this.teasRepository.findOne({
      where: { id },
      relations: ['notes'],
    });
    if (!tea) {
      throw new NotFoundException('차를 찾을 수 없습니다.');
    }
    return tea;
  }

  async search(query: string): Promise<Tea[]> {
    return await this.teasRepository
      .createQueryBuilder('tea')
      .where('tea.name LIKE :query', { query: `%${query}%` })
      .orWhere('tea.type LIKE :query', { query: `%${query}%` })
      .orWhere('tea.seller LIKE :query', { query: `%${query}%` })
      .orderBy('tea.createdAt', 'DESC')
      .getMany();
  }

  async updateRating(teaId: number, averageRating: number, reviewCount: number): Promise<void> {
    await this.teasRepository.update(teaId, {
      averageRating: Number(averageRating.toFixed(2)),
      reviewCount,
    });
  }
}
