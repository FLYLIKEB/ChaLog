import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { parse } from 'csv-parse/sync';
import { Note } from '../../notes/entities/note.entity';
import { Post } from '../../posts/entities/post.entity';
import { Tea } from '../../teas/entities/tea.entity';
import { Seller } from '../../teas/entities/seller.entity';
import { Tag } from '../../notes/entities/tag.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { NoteTag } from '../../notes/entities/note-tag.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { CreateTeaDto } from '../../teas/dto/create-tea.dto';
import { CreateSellerDto } from '../../teas/dto/create-seller.dto';
import { CreateTagDto } from '../dto/create-tag.dto';
import { NotesService } from '../../notes/notes.service';
import { PostsService } from '../../posts/posts.service';
import { CommentsService } from '../../comments/comments.service';
import { TeasService } from '../../teas/teas.service';

@Injectable()
export class AdminContentService {
  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(Tea)
    private teasRepository: Repository<Tea>,
    @InjectRepository(Seller)
    private sellersRepository: Repository<Seller>,
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(AuditLog)
    private auditLogsRepository: Repository<AuditLog>,
    @InjectDataSource()
    private dataSource: DataSource,
    private notesService: NotesService,
    private postsService: PostsService,
    private commentsService: CommentsService,
    private teasService: TeasService,
  ) {}

  private validateSort(allowedSortBy: readonly string[], sortBy: string, sortOrder: string) {
    if (!allowedSortBy.includes(sortBy)) {
      throw new BadRequestException('잘못된 정렬 기준입니다.');
    }
    if (sortOrder !== 'ASC' && sortOrder !== 'DESC') {
      throw new BadRequestException('잘못된 정렬 순서입니다.');
    }
  }

  private async logAudit(
    adminId: number,
    action: AuditAction,
    targetType: string,
    targetId: number,
    reason?: string,
    metadata?: Record<string, unknown>,
  ) {
    const log = this.auditLogsRepository.create({
      adminId,
      action,
      targetType,
      targetId,
      reason: reason || null,
      metadata: metadata || null,
    });
    await this.auditLogsRepository.save(log);
  }

  async getNotes(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'createdAt' | 'updatedAt';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.notesRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.tea', 'tea')
      .leftJoinAndSelect('note.user', 'user');

    if (params.search?.trim()) {
      const term = `%${params.search.trim()}%`;
      qb.andWhere(
        '(note.memo LIKE :term OR tea.name LIKE :term OR user.name LIKE :term)',
        { term },
      );
    }

    const sortBy = params.sortBy ?? 'createdAt';
    const sortOrder = params.sortOrder ?? 'DESC';
    this.validateSort(['createdAt', 'updatedAt'], sortBy, sortOrder);
    qb.orderBy(`note.${sortBy}`, sortOrder);

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      items: items.map((n) => ({
        id: n.id,
        memo: n.memo,
        images: n.images,
        overallRating: n.overallRating,
        createdAt: n.createdAt,
        tea: n.tea ? { id: n.tea.id, name: n.tea.name } : null,
        user: n.user ? { id: n.user.id, name: n.user.name } : null,
      })),
      total,
      page,
      limit,
    };
  }

  async getNoteDetail(noteId: number) {
    const note = await this.notesRepository.findOne({
      where: { id: noteId },
      relations: ['tea', 'user', 'noteTags', 'noteTags.tag'],
    });
    if (!note) throw new NotFoundException('차록을 찾을 수 없습니다.');
    return note;
  }

  async deleteNote(noteId: number, adminId: number) {
    await this.notesService.removeByAdmin(noteId);
    await this.logAudit(adminId, AuditAction.NOTE_DELETE, 'note', noteId);
    return { success: true };
  }

  async getPosts(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'createdAt' | 'viewCount';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user');

    if (params.search?.trim()) {
      const term = `%${params.search.trim()}%`;
      qb.andWhere('(post.title LIKE :term OR post.content LIKE :term OR user.name LIKE :term)', {
        term,
      });
    }

    const sortBy = params.sortBy ?? 'createdAt';
    const sortOrder = params.sortOrder ?? 'DESC';
    this.validateSort(['createdAt', 'viewCount'], sortBy, sortOrder);
    qb.orderBy(`post.${sortBy}`, sortOrder);

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      items: items.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        category: p.category,
        viewCount: p.viewCount,
        createdAt: p.createdAt,
        user: p.user ? { id: p.user.id, name: p.user.name } : null,
      })),
      total,
      page,
      limit,
    };
  }

  async getPostDetail(postId: number) {
    const post = await this.postsRepository.findOne({
      where: { id: postId },
      relations: ['user'],
    });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    const commentCount = await this.commentsRepository.count({ where: { postId } });
    return { ...post, commentCount };
  }

  async deletePost(postId: number, adminId: number) {
    await this.postsService.removeByAdmin(postId);
    await this.logAudit(adminId, AuditAction.POST_DELETE, 'post', postId);
    return { success: true };
  }

  async togglePostPin(postId: number, adminId: number) {
    const post = await this.postsRepository.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    post.isPinned = !post.isPinned;
    await this.postsRepository.save(post);
    await this.logAudit(adminId, AuditAction.POST_UPDATE, 'post', postId, undefined, {
      isPinned: post.isPinned,
    });
    return { isPinned: post.isPinned };
  }

  async getPostComments(postId: number) {
    return this.commentsService.findByPost(postId);
  }

  async deleteComment(commentId: number, adminId: number) {
    await this.commentsService.removeByAdmin(commentId);
    await this.logAudit(adminId, AuditAction.COMMENT_DELETE, 'comment', commentId);
    return { success: true };
  }

  async getTeas(params: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    seller?: string;
    sortBy?: 'createdAt' | 'reviewCount' | 'averageRating';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.teasRepository
      .createQueryBuilder('tea')
      .leftJoinAndSelect('tea.seller', 'seller');
    if (params.search?.trim()) {
      const term = `%${params.search.trim()}%`;
      qb.andWhere(
        '(tea.name LIKE :term OR tea.type LIKE :term OR seller.name LIKE :term)',
        { term },
      );
    }
    if (params.type?.trim()) {
      qb.andWhere('tea.type = :type', { type: params.type.trim() });
    }
    if (params.seller?.trim()) {
      qb.andWhere('seller.name = :seller', { seller: params.seller.trim() });
    }
    const sortBy = params.sortBy ?? 'createdAt';
    const sortOrder = params.sortOrder ?? 'DESC';
    qb.orderBy(`tea.${sortBy}`, sortOrder);

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const mappedItems = items.map((t) => ({
      ...t,
      seller: t.seller?.name ?? null,
    }));
    return { items: mappedItems, total, page, limit };
  }

  async getTeaDetail(teaId: number) {
    const tea = await this.teasRepository.findOne({
      where: { id: teaId },
      relations: ['seller'],
    });
    if (!tea) throw new NotFoundException('차를 찾을 수 없습니다.');
    const noteCount = await this.notesRepository.count({ where: { teaId } });
    return {
      ...tea,
      seller: tea.seller?.name ?? null,
      noteCount,
    };
  }

  async createTea(dto: CreateTeaDto, adminId: number) {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new BadRequestException('차 이름을 입력해주세요.');
    }
    let sellerId: number | null = null;
    if (dto.sellerId != null) {
      sellerId = dto.sellerId;
    } else if (dto.seller?.trim()) {
      const resolved = await this.teasService.createSeller({
        name: dto.seller.trim(),
      });
      sellerId = resolved.id;
    }
    const tea = this.teasRepository.create({
      name: trimmedName,
      year: dto.year,
      type: dto.type,
      seller: sellerId != null ? ({ id: sellerId } as Seller) : null,
      origin: dto.origin,
      price: dto.price,
      averageRating: 0,
      reviewCount: 0,
    });
    let saved: Tea;
    try {
      saved = await this.teasRepository.save(tea);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          '이름·연도·셀러가 동일한 차가 이미 등록되어 있습니다.',
        );
      }
      throw err;
    }
    await this.logAudit(adminId, AuditAction.TEA_CREATE, 'tea', saved.id, undefined, {
      name: saved.name,
      type: saved.type,
    });
    const withSeller = await this.teasRepository.findOne({
      where: { id: saved.id },
      relations: ['seller'],
    });
    return withSeller
      ? { ...withSeller, seller: withSeller.seller?.name ?? null }
      : saved;
  }

  async updateTea(teaId: number, dto: Record<string, unknown>, adminId: number) {
    const tea = await this.teasRepository.findOne({ where: { id: teaId } });
    if (!tea) throw new NotFoundException('차를 찾을 수 없습니다.');
    const { sellerId, seller, ...rest } = dto;
    Object.assign(tea, rest);
    if ('sellerId' in dto) {
      tea.seller =
        dto.sellerId != null
          ? ({ id: dto.sellerId as number } as Seller)
          : null;
    } else if ('seller' in dto) {
      if (typeof dto.seller === 'string' && dto.seller.trim()) {
        const resolved = await this.teasService.createSeller({
          name: dto.seller.trim(),
        });
        tea.seller = resolved;
      } else {
        tea.seller = null;
      }
    }
    try {
      await this.teasRepository.save(tea);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException(
          '이름·연도·셀러가 동일한 차가 이미 등록되어 있습니다.',
        );
      }
      throw err;
    }
    await this.logAudit(adminId, AuditAction.TEA_UPDATE, 'tea', teaId, undefined, {
      updates: Object.keys(dto),
    });
    const withSeller = await this.teasRepository.findOne({
      where: { id: teaId },
      relations: ['seller'],
    });
    return withSeller
      ? { ...withSeller, seller: withSeller.seller?.name ?? null }
      : tea;
  }

  async deleteTea(teaId: number, adminId: number) {
    const tea = await this.teasRepository.findOne({ where: { id: teaId } });
    if (!tea) throw new NotFoundException('차를 찾을 수 없습니다.');
    const noteCount = await this.notesRepository.count({ where: { teaId } });
    if (noteCount > 0) {
      throw new BadRequestException(
        `이 차에 연결된 차록이 ${noteCount}건 있어 삭제할 수 없습니다.`,
      );
    }
    await this.teasRepository.remove(tea);
    await this.logAudit(adminId, AuditAction.TEA_DELETE, 'tea', teaId);
    return { success: true };
  }

  async getSellers(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'createdAt' | 'name';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.sellersRepository.createQueryBuilder('seller');
    if (params.search?.trim()) {
      const term = `%${params.search.trim()}%`;
      qb.andWhere('seller.name LIKE :term', { term });
    }
    const sortBy = params.sortBy ?? 'name';
    const sortOrder = params.sortOrder ?? 'ASC';
    qb.orderBy(`seller.${sortBy}`, sortOrder);

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const teaCounts =
      items.length > 0
        ? await this.teasRepository
            .createQueryBuilder('t')
            .innerJoin('t.seller', 's')
            .select('s.name', 'seller')
            .addSelect('COUNT(*)', 'count')
            .where('s.name IN (:...names)', {
              names: items.map((s) => s.name).filter(Boolean),
            })
            .groupBy('s.id')
            .getRawMany()
        : [];
    const teaMap = Object.fromEntries(
      teaCounts.map((r: { seller: string; count: string }) => [r.seller, Number(r.count)]),
    );

    return {
      items: items.map((s) => ({
        ...s,
        teaCount: teaMap[s.name] ?? 0,
      })),
      total,
      page,
      limit,
    };
  }

  async getSellerDetail(sellerId: number) {
    const seller = await this.sellersRepository.findOne({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('찻집을 찾을 수 없습니다.');
    const teaCount = await this.teasRepository
      .createQueryBuilder('t')
      .innerJoin('t.seller', 's')
      .where('s.id = :sellerId', { sellerId: seller.id })
      .getCount();
    return { ...seller, teaCount };
  }

  async createSeller(dto: CreateSellerDto, adminId: number) {
    const trimmed = dto.name.trim();
    if (!trimmed) {
      throw new BadRequestException('찻집 이름을 입력해주세요.');
    }
    const existing = await this.sellersRepository.findOne({ where: { name: trimmed } });
    if (existing) {
      throw new BadRequestException('이미 같은 이름의 찻집이 있습니다.');
    }
    const seller = this.sellersRepository.create({
      name: trimmed,
      address: dto.address?.trim() || null,
      mapUrl: dto.mapUrl?.trim() || null,
      websiteUrl: dto.websiteUrl?.trim() || null,
      phone: dto.phone?.trim() || null,
      description: dto.description?.trim() || null,
      businessHours: dto.businessHours?.trim() || null,
    });
    let saved;
    try {
      saved = await this.sellersRepository.save(seller);
    } catch (err: unknown) {
      const msg = String((err as { message?: string })?.message ?? '');
      if (msg.includes('Duplicate') || msg.includes('unique') || msg.includes('UNIQUE')) {
        throw new BadRequestException('이미 같은 이름의 찻집이 있습니다.');
      }
      throw err;
    }
    await this.logAudit(adminId, AuditAction.SELLER_CREATE, 'seller', saved.id, undefined, {
      name: saved.name,
    });
    return saved;
  }

  async updateSeller(sellerId: number, dto: Record<string, unknown>, adminId: number) {
    const seller = await this.sellersRepository.findOne({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('찻집을 찾을 수 없습니다.');
    Object.assign(seller, dto);
    await this.sellersRepository.save(seller);
    await this.logAudit(adminId, AuditAction.SELLER_UPDATE, 'seller', sellerId, undefined, {
      updates: Object.keys(dto),
    });
    return seller;
  }

  async deleteSeller(sellerId: number, adminId: number) {
    const seller = await this.sellersRepository.findOne({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('찻집을 찾을 수 없습니다.');
    const teaCount = await this.teasRepository
      .createQueryBuilder('t')
      .innerJoin('t.seller', 's')
      .where('s.id = :sellerId', { sellerId: seller.id })
      .getCount();
    if (teaCount > 0) {
      throw new BadRequestException(
        `이 찻집을 판매처로 사용하는 차가 ${teaCount}건 있어 삭제할 수 없습니다.`,
      );
    }
    await this.sellersRepository.remove(seller);
    await this.logAudit(adminId, AuditAction.SELLER_DELETE, 'seller', sellerId);
    return { success: true };
  }

  async getTags(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'createdAt' | 'name' | 'usageCount';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.tagsRepository.createQueryBuilder('tag');
    if (params.search?.trim()) {
      const term = `%${params.search.trim()}%`;
      qb.andWhere('tag.name LIKE :term', { term });
    }

    const sortBy = params.sortBy ?? 'usageCount';
    const sortOrder = params.sortOrder ?? 'DESC';
    if (sortBy === 'usageCount') {
      qb.leftJoin('tag.noteTags', 'nt')
        .addSelect('COUNT(nt.id)', 'usageCount')
        .groupBy('tag.id')
        .orderBy('usageCount', sortOrder)
        .addOrderBy('tag.name', 'ASC');
    } else {
      qb.orderBy(`tag.${sortBy}`, sortOrder);
    }

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const usageMap: Record<number, number> = {};
    if (items.length > 0) {
      const ids = items.map((t) => t.id);
      const placeholders = ids.map(() => '?').join(',');
      const rows = await this.dataSource.query(
        `SELECT tagId, COUNT(*) as c FROM note_tags WHERE tagId IN (${placeholders}) GROUP BY tagId`,
        ids,
      );
      rows.forEach((r: { tagId: number; c: string }) => {
        usageMap[r.tagId] = Number(r.c);
      });
    }

    return {
      items: items.map((t) => ({ ...t, usageCount: usageMap[t.id] ?? 0 })),
      total,
      page,
      limit,
    };
  }

  async getTagDetail(tagId: number) {
    const tag = await this.tagsRepository.findOne({ where: { id: tagId } });
    if (!tag) throw new NotFoundException('태그를 찾을 수 없습니다.');
    const usageCount = await this.dataSource
      .getRepository(NoteTag)
      .count({ where: { tagId } });
    return { ...tag, usageCount };
  }

  async createTag(dto: CreateTagDto, adminId: number) {
    const trimmed = dto.name.trim();
    if (!trimmed) {
      throw new BadRequestException('태그 이름을 입력해주세요.');
    }
    const existing = await this.tagsRepository.findOne({ where: { name: trimmed } });
    if (existing) {
      throw new BadRequestException('이미 같은 이름의 태그가 있습니다.');
    }
    const tag = this.tagsRepository.create({ name: trimmed });
    let saved;
    try {
      saved = await this.tagsRepository.save(tag);
    } catch (err: unknown) {
      const msg = String((err as { message?: string })?.message ?? '');
      if (msg.includes('Duplicate') || msg.includes('unique') || msg.includes('UNIQUE')) {
        throw new BadRequestException('이미 같은 이름의 태그가 있습니다.');
      }
      throw err;
    }
    await this.logAudit(adminId, AuditAction.TAG_CREATE, 'tag', saved.id, undefined, {
      name: saved.name,
    });
    return saved;
  }

  async updateTag(tagId: number, dto: { name: string }, adminId: number) {
    const tag = await this.tagsRepository.findOne({ where: { id: tagId } });
    if (!tag) throw new NotFoundException('태그를 찾을 수 없습니다.');
    const trimmed = dto.name?.trim();
    if (!trimmed) throw new BadRequestException('태그 이름을 입력해주세요.');
    const existing = await this.tagsRepository.findOne({ where: { name: trimmed } });
    if (existing && existing.id !== tagId) {
      throw new BadRequestException('이미 존재하는 태그 이름입니다.');
    }
    tag.name = trimmed;
    await this.tagsRepository.save(tag);
    await this.logAudit(adminId, AuditAction.TAG_UPDATE, 'tag', tagId, undefined, {
      newName: trimmed,
    });
    return tag;
  }

  async deleteTag(tagId: number, adminId: number) {
    const tag = await this.tagsRepository.findOne({ where: { id: tagId } });
    if (!tag) throw new NotFoundException('태그를 찾을 수 없습니다.');
    await this.tagsRepository.remove(tag);
    await this.logAudit(adminId, AuditAction.TAG_DELETE, 'tag', tagId);
    return { success: true };
  }

  async mergeTag(sourceTagId: number, targetTagId: number, adminId: number) {
    if (sourceTagId === targetTagId) {
      throw new BadRequestException('같은 태그로 병합할 수 없습니다.');
    }
    const [source, target] = await Promise.all([
      this.tagsRepository.findOne({ where: { id: sourceTagId } }),
      this.tagsRepository.findOne({ where: { id: targetTagId } }),
    ]);
    if (!source) throw new NotFoundException('병합할 태그를 찾을 수 없습니다.');
    if (!target) throw new NotFoundException('병합 대상 태그를 찾을 수 없습니다.');

    const noteTagRepo = this.dataSource.getRepository(NoteTag);
    const noteTags = await noteTagRepo.find({ where: { tagId: sourceTagId } });

    for (const nt of noteTags) {
      const existing = await noteTagRepo.findOne({
        where: { noteId: nt.noteId, tagId: targetTagId },
      });
      if (!existing) {
        nt.tagId = targetTagId;
        await noteTagRepo.save(nt);
      } else {
        await noteTagRepo.remove(nt);
      }
    }
    await this.tagsRepository.remove(source);
    await this.logAudit(adminId, AuditAction.TAG_MERGE, 'tag', sourceTagId, undefined, {
      targetTagId,
    });
    return { success: true };
  }

  async bulkUploadTeas(fileBuffer: Buffer): Promise<{
    total: number;
    success: number;
    skipped: number;
    errors: { row: number; message: string }[];
  }> {
    let rows: Record<string, string>[];
    try {
      rows = parse(fileBuffer, { columns: true, skip_empty_lines: true, trim: true });
    } catch {
      throw new BadRequestException('CSV 파일 파싱에 실패했습니다. 형식을 확인해주세요.');
    }

    const errors: { row: number; message: string }[] = [];
    const toInsert: Partial<Tea>[] = [];

    type ValidRow = { row: Record<string, string>; rowNum: number; name: string; type: string };
    const validRows: ValidRow[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const name = row['name']?.trim();
      const type = row['type']?.trim();
      if (!name) { errors.push({ row: rowNum, message: 'name 필드가 비어있습니다.' }); continue; }
      if (!type) { errors.push({ row: rowNum, message: 'type 필드가 비어있습니다.' }); continue; }
      validRows.push({ row, rowNum, name, type });
    }

    const existingTeas = validRows.length > 0
      ? await this.teasRepository.findBy({ name: In(validRows.map((r) => r.name)) })
      : [];
    const existingKeys = new Set(existingTeas.map((t) => `${t.name}||${t.type}`));

    for (const { row, name, type } of validRows) {
      if (existingKeys.has(`${name}||${type}`)) { continue; }

      const price = row['price'] ? parseInt(row['price'], 10) : undefined;
      const weight = row['weight'] ? parseInt(row['weight'], 10) : undefined;
      toInsert.push({
        name,
        type,
        origin: row['origin']?.trim() || undefined,
        price: !isNaN(price as number) ? price : undefined,
        weight: !isNaN(weight as number) ? weight : undefined,
        averageRating: 0,
        reviewCount: 0,
      });
    }

    if (toInsert.length > 0) {
      await this.teasRepository.save(toInsert.map((t) => this.teasRepository.create(t)));
    }

    const skipped = rows.length - errors.length - toInsert.length;
    return { total: rows.length, success: toInsert.length, skipped, errors };
  }
}
