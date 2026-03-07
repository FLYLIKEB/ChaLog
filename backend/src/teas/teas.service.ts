import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tea } from './entities/tea.entity';
import { CreateTeaDto } from './dto/create-tea.dto';
import { PopularTagDto, PopularTagsResponseDto } from './dto/popular-tag.dto';

@Injectable()
export class TeasService {
  constructor(
    @InjectRepository(Tea)
    private teasRepository: Repository<Tea>,
    @InjectDataSource()
    private dataSource: DataSource,
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

  async getPopularTags(teaId: number): Promise<PopularTagsResponseDto> {
    await this.assertTeaExists(teaId);

    const rows: { name: string; count: string }[] = await this.dataSource.query(
      `SELECT t.name, COUNT(nt.id) AS \`count\`
       FROM note_tags nt
       JOIN tags t ON t.id = nt.tagId
       JOIN notes n ON n.id = nt.noteId
       WHERE n.teaId = ? AND n.isPublic = 1
       GROUP BY t.id, t.name
       ORDER BY \`count\` DESC
       LIMIT 10`,
      [teaId],
    );

    const tags: PopularTagDto[] = rows.map((r) => ({
      name: r.name,
      count: Number(r.count),
    }));

    return { tags };
  }

  async getTopReviews(teaId: number, currentUserId?: number): Promise<any[]> {
    await this.assertTeaExists(teaId);

    const notes = await this.dataSource.query(
      `SELECT n.id, n.teaId, n.userId, n.schemaId, n.overallRating, n.isRatingIncluded,
              n.memo, n.images, n.isPublic, n.createdAt, n.updatedAt,
              u.name AS userName,
              tea.name AS teaName,
              (SELECT COUNT(*) FROM note_likes nl WHERE nl.noteId = n.id) AS likeCount,
              CASE
                WHEN ? IS NULL THEN 0
                ELSE EXISTS (
                  SELECT 1 FROM note_likes nl2
                  WHERE nl2.noteId = n.id AND nl2.userId = ?
                )
              END AS isLiked
       FROM notes n
       JOIN users u ON u.id = n.userId
       JOIN teas tea ON tea.id = n.teaId
       WHERE n.teaId = ? AND n.isPublic = 1
       ORDER BY likeCount DESC, n.createdAt DESC
       LIMIT 3`,
      [currentUserId ?? null, currentUserId ?? null, teaId],
    );

    return notes.map((note: any) => ({
      ...note,
      likeCount: Number(note.likeCount),
      isLiked: Boolean(Number(note.isLiked)),
      isBookmarked: false,
    }));
  }

  async getSimilarTeas(teaId: number): Promise<Tea[]> {
    const tea = await this.assertTeaExists(teaId);

    const rating = Number(tea.averageRating);
    const lower = Math.max(0, rating - 1);
    const upper = rating + 1;

    return this.teasRepository
      .createQueryBuilder('tea')
      .where('tea.type = :type', { type: tea.type })
      .andWhere('tea.id != :id', { id: teaId })
      .andWhere('tea.averageRating BETWEEN :lower AND :upper', { lower, upper })
      .orderBy('ABS(tea.averageRating - :rating)', 'ASC')
      .addOrderBy('tea.reviewCount', 'DESC')
      .addOrderBy('tea.id', 'ASC')
      .setParameter('rating', rating)
      .limit(4)
      .getMany();
  }

  private async assertTeaExists(teaId: number): Promise<Tea> {
    const tea = await this.teasRepository.findOne({ where: { id: teaId } });
    if (!tea) {
      throw new NotFoundException('차를 찾을 수 없습니다.');
    }
    return tea;
  }
}
