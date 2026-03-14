import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource, QueryFailedError } from 'typeorm';
import { Note } from './entities/note.entity';
import { Tag } from './entities/tag.entity';
import { NoteTag } from './entities/note-tag.entity';
import { NoteLike } from './entities/note-like.entity';
import { NoteBookmark } from './entities/note-bookmark.entity';
import { TagFollow } from './entities/tag-follow.entity';
import { RatingSchema } from './entities/rating-schema.entity';
import { RatingAxis } from './entities/rating-axis.entity';
import { NoteAxisValue } from './entities/note-axis-value.entity';
import { NoteSchema } from './entities/note-schema.entity';
import { UserSchemaPin } from './entities/user-schema-pin.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { CreateRatingSchemaDto } from './dto/create-rating-schema.dto';
import { TeasService } from '../teas/teas.service';
import { S3Service } from '../common/storage/s3.service';
import { DEFAULT_RATING_SCHEMA, DEFAULT_RATING_AXES } from './constants/default-rating-schema';
import { FollowsService } from '../follows/follows.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
    @InjectRepository(NoteTag)
    private noteTagsRepository: Repository<NoteTag>,
    @InjectRepository(NoteLike)
    private noteLikesRepository: Repository<NoteLike>,
    @InjectRepository(NoteBookmark)
    private noteBookmarksRepository: Repository<NoteBookmark>,
    @InjectRepository(TagFollow)
    private tagFollowsRepository: Repository<TagFollow>,
    @InjectRepository(RatingSchema)
    private ratingSchemaRepository: Repository<RatingSchema>,
    @InjectRepository(RatingAxis)
    private ratingAxisRepository: Repository<RatingAxis>,
    @InjectRepository(NoteAxisValue)
    private noteAxisValueRepository: Repository<NoteAxisValue>,
    @InjectRepository(NoteSchema)
    private noteSchemaRepository: Repository<NoteSchema>,
    @InjectRepository(UserSchemaPin)
    private userSchemaPinRepository: Repository<UserSchemaPin>,
    @InjectDataSource()
    private dataSource: DataSource,
    private teasService: TeasService,
    private s3Service: S3Service,
    private followsService: FollowsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: number, createNoteDto: CreateNoteDto): Promise<Note> {
    // 차가 존재하는지 확인
    const tea = await this.teasService.findOne(createNoteDto.teaId);

    // schemaIds 또는 schemaId로 스키마 목록 결정
    const schemaIds = (createNoteDto.schemaIds?.length ?? 0) > 0
      ? [...new Set(createNoteDto.schemaIds!)]
      : createNoteDto.schemaId != null
        ? [createNoteDto.schemaId]
        : [];

    if (schemaIds.length === 0) {
      throw new BadRequestException('최소 1개의 평가 스키마를 선택해주세요.');
    }

    // 모든 스키마 존재 확인
    const schemas = await this.ratingSchemaRepository.find({
      where: { id: In(schemaIds) },
    });
    if (schemas.length !== schemaIds.length) {
      throw new NotFoundException('평가 스키마를 찾을 수 없습니다.');
    }

    const primarySchemaId = schemaIds[0];

    // tags와 axisValues 필드를 분리
    const { tags, axisValues, schemaId: _schemaId, schemaIds: _schemaIds, ...noteData } = createNoteDto;

    // isRatingIncluded 기본값 설정
    const isRatingIncluded = createNoteDto.isRatingIncluded !== undefined
      ? createNoteDto.isRatingIncluded
      : true;

    const note = this.notesRepository.create({
      ...noteData,
      teaId: tea.id,
      schemaId: primarySchemaId,
      userId,
      isRatingIncluded,
    });

    const savedNote = await this.notesRepository.save(note);

    // note_schemas에 모든 스키마 저장
    await this.noteSchemaRepository.save(
      schemaIds.map((schemaId) =>
        this.noteSchemaRepository.create({ noteId: savedNote.id, schemaId }),
      ),
    );

    // 축 값 처리
    if (axisValues && axisValues.length > 0) {
      await this.setNoteAxisValues(savedNote.id, schemaIds, axisValues);
    }

    // 태그 처리
    if (tags && tags.length > 0) {
      await this.setNoteTags(savedNote.id, tags);
    }

    // 차의 평균 평점 업데이트
    await this.updateTeaRating(tea.id);

    return this.findOne(savedNote.id, userId);
  }

  async findAll(userId?: number, isPublic?: boolean, teaId?: number, currentUserId?: number, bookmarked?: boolean, feed?: string, sort: 'latest' | 'rating' = 'latest', page?: number, limit?: number): Promise<any[] | { data: any[]; total: number; page: number; limit: number }> {
    try {
      if (feed === 'following') {
        return await this.findFollowingFeed(currentUserId);
      }

      if (feed === 'tags') {
        return await this.findTagsFeed(currentUserId);
      }

      if (bookmarked) {
        return await this.findBookmarkedFeed(currentUserId);
      }

      return await this.findPaginatedFeed(userId, isPublic, teaId, currentUserId, sort, page, limit);
    } catch (error) {
      this.logger.error(`Failed to findAll notes: ${error.message}`, error.stack);
      throw error;
    }
  }

  private buildListQueryBuilder() {
    return this.notesRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.user', 'user')
      .leftJoinAndSelect('note.tea', 'tea');
  }

  private async findFollowingFeed(currentUserId?: number): Promise<any[]> {
    if (!currentUserId) {
      throw new BadRequestException('팔로잉 피드를 조회하려면 로그인이 필요합니다.');
    }

    const followingIds = await this.followsService.getFollowingIds(currentUserId);

    if (followingIds.length === 0) {
      return [];
    }

    const notes = await this.buildListQueryBuilder()
      .where('note.userId IN (:...followingIds)', { followingIds })
      .andWhere('note.isPublic = :isPublic', { isPublic: true })
      .orderBy('note.createdAt', 'DESC')
      .getMany();

    return this.enrichNotesWithLikesAndBookmarks(notes, currentUserId);
  }

  private async findTagsFeed(currentUserId?: number): Promise<any[]> {
    if (!currentUserId) {
      throw new BadRequestException('태그 피드를 조회하려면 로그인이 필요합니다.');
    }

    const tagFollows = await this.tagFollowsRepository.find({
      where: { userId: currentUserId },
      select: ['tagId'],
    });

    if (tagFollows.length === 0) {
      return [];
    }

    const tagIds = tagFollows.map((tf) => tf.tagId);

    const notes = await this.buildListQueryBuilder()
      .innerJoin('note.noteTags', 'followedNoteTag')
      .where('followedNoteTag.tagId IN (:...tagIds)', { tagIds })
      .andWhere('note.isPublic = :isPublic', { isPublic: true })
      .orderBy('note.createdAt', 'DESC')
      .getMany();

    return this.enrichNotesWithLikesAndBookmarks(notes, currentUserId);
  }

  private async findBookmarkedFeed(currentUserId?: number): Promise<any[]> {
    if (!currentUserId) {
      throw new BadRequestException('북마크한 노트를 조회하려면 로그인이 필요합니다.');
    }

    const bookmarkedNotes = await this.noteBookmarksRepository
      .createQueryBuilder('bookmark')
      .select('bookmark.noteId', 'noteId')
      .addSelect('bookmark.createdAt', 'createdAt')
      .where('bookmark.userId = :userId', { userId: currentUserId })
      .orderBy('bookmark.createdAt', 'DESC')
      .getRawMany();

    const bookmarkedNoteIds = bookmarkedNotes.map(b => b.noteId);

    if (bookmarkedNoteIds.length === 0) {
      return [];
    }

    const notes = await this.buildListQueryBuilder()
      .where('note.id IN (:...noteIds)', { noteIds: bookmarkedNoteIds })
      .getMany();

    const bookmarkMap = new Map(
      bookmarkedNotes.map(b => [b.noteId, new Date(b.createdAt).getTime()])
    );
    const sortedNotes = notes.sort((a, b) => {
      const bookmarkTimeA = bookmarkMap.get(a.id) || 0;
      const bookmarkTimeB = bookmarkMap.get(b.id) || 0;
      return bookmarkTimeB - bookmarkTimeA;
    });

    return this.enrichNotesWithLikesAndBookmarks(sortedNotes, currentUserId);
  }

  private async findPaginatedFeed(userId?: number, isPublic?: boolean, teaId?: number, currentUserId?: number, sort: 'latest' | 'rating' = 'latest', page?: number, limit?: number): Promise<any[] | { data: any[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.buildListQueryBuilder();

    if (sort === 'rating') {
      queryBuilder
        .orderBy('note.overallRating IS NULL', 'ASC')
        .addOrderBy('note.overallRating', 'DESC')
        .addOrderBy('note.createdAt', 'DESC');
    } else {
      queryBuilder.orderBy('note.createdAt', 'DESC');
    }

    const conditions: string[] = [];
    const params: Record<string, any> = {};

    if (userId) {
      conditions.push('note.userId = :userId');
      params.userId = userId;
    }

    if (isPublic !== undefined) {
      conditions.push('note.isPublic = :isPublic');
      params.isPublic = isPublic;
    }

    if (teaId) {
      conditions.push('note.teaId = :teaId');
      params.teaId = teaId;
    }

    if (conditions.length > 0) {
      queryBuilder.where(conditions.join(' AND '), params);
    }

    if (page != null && limit != null) {
      const [notes, total] = await queryBuilder
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
      const data = await this.enrichNotesWithLikesAndBookmarks(notes, currentUserId);
      return { data, total, page, limit };
    }

    const notes = await queryBuilder.getMany();
    return this.enrichNotesWithLikesAndBookmarks(notes, currentUserId);
  }

  async findOne(id: number, userId?: number): Promise<any> {
    const note = await this.notesRepository.findOne({
      where: { id },
      relations: ['user', 'tea', 'schema', 'noteSchemas', 'noteSchemas.schema', 'noteTags', 'noteTags.tag', 'axisValues', 'axisValues.axis'],
    });

    if (!note) {
      throw new NotFoundException('노트를 찾을 수 없습니다.');
    }

    if (!note.isPublic && note.userId !== userId) {
      throw new ForbiddenException('이 노트를 볼 권한이 없습니다.');
    }

    const enrichedNotes = await this.enrichNotesWithLikesAndBookmarks([note], userId);
    const result = enrichedNotes[0];
    // schemaIds, schemas: note_schemas에서 추출 (없으면 [schemaId]/schema로 하위 호환)
    const noteSchemas = (note as any).noteSchemas;
    if (noteSchemas?.length > 0) {
      result.schemaIds = noteSchemas.map((ns: NoteSchema) => ns.schemaId).sort((a: number, b: number) => a - b);
      result.schemas = noteSchemas
        .map((ns: NoteSchema) => (ns as any).schema)
        .filter(Boolean)
        .sort((a: { id: number }, b: { id: number }) => a.id - b.id);
    } else if (note.schemaId != null) {
      result.schemaIds = [note.schemaId];
      result.schemas = note.schema ? [note.schema] : [];
    } else {
      result.schemaIds = [];
      result.schemas = [];
    }
    return result;
  }

  async update(id: number, userId: number, updateNoteDto: UpdateNoteDto): Promise<Note> {
    // noteSchemas를 로드하지 않음 → notesRepository.save 시 cascade로 중복 저장되어 UQ_note_schemas 위반 방지
    const note = await this.notesRepository.findOne({
      where: { id },
      relations: ['user', 'tea', 'schema', 'noteTags', 'noteTags.tag', 'axisValues', 'axisValues.axis'],
    });
    if (!note) {
      throw new NotFoundException('노트를 찾을 수 없습니다.');
    }
    if (!note.isPublic && note.userId !== userId) {
      throw new ForbiddenException('이 노트를 볼 권한이 없습니다.');
    }
    if (note.userId !== userId) {
      throw new ForbiddenException('이 노트를 수정할 권한이 없습니다.');
    }

    // schemaIds 또는 schemaId 변경 시 스키마 존재 확인 (중복 제거하여 UQ_note_schemas 위반 방지)
    const rawSchemaIds = (updateNoteDto as any).schemaIds ?? (updateNoteDto.schemaId !== undefined ? [updateNoteDto.schemaId] : null);
    const updateSchemaIds = rawSchemaIds != null ? [...new Set(rawSchemaIds)] : null;
    if (updateSchemaIds != null && updateSchemaIds.length > 0) {
      const schemas = await this.ratingSchemaRepository.find({ where: { id: In(updateSchemaIds) } });
      if (schemas.length !== updateSchemaIds.length) {
        throw new NotFoundException('평가 스키마를 찾을 수 없습니다.');
      }
    }

    // tags와 axisValues 필드를 분리
    const { tags, axisValues, schemaId: _schemaId, schemaIds: _schemaIds, ...noteData } = updateNoteDto as any;

    // 이미지 변경 시 제거된 이미지 S3에서 삭제
    if (noteData.images !== undefined && note.images && note.images.length > 0) {
      const newUrls = new Set(noteData.images);
      const removedUrls = note.images.filter((url) => !newUrls.has(url));
      if (removedUrls.length > 0) {
        await this.deleteNoteImages(removedUrls);
      }
    }

    if (updateSchemaIds != null && updateSchemaIds.length > 0) {
      noteData.schemaId = updateSchemaIds[0];
      await this.noteSchemaRepository.delete({ noteId: id });
      await this.noteSchemaRepository.save(
        updateSchemaIds.map((schemaId: number) =>
          this.noteSchemaRepository.create({ noteId: id, schemaId }),
        ),
      );
    }

    Object.assign(note, noteData);
    const updatedNote = await this.notesRepository.save(note);

    const finalSchemaIds = updateSchemaIds ?? (note as any).schemaIds ?? (note.schemaId != null ? [note.schemaId] : []);

    if (axisValues !== undefined) {
      await this.setNoteAxisValues(id, finalSchemaIds, axisValues);
    }

    // 태그 업데이트 (tags가 제공된 경우에만)
    if (tags !== undefined) {
      await this.setNoteTags(id, tags || []);
    }

    // 차의 평균 평점 업데이트
    await this.updateTeaRating(note.teaId);

    // 축 값와 태그를 포함한 업데이트된 노트 반환
    return this.findOne(id, userId);
  }

  async remove(id: number, userId: number): Promise<void> {
    // 삭제를 위해서는 relations 없이도 조회 가능해야 함
    const note = await this.notesRepository.findOne({
      where: { id },
    });

    if (!note) {
      throw new NotFoundException('노트를 찾을 수 없습니다.');
    }

    if (note.userId !== userId) {
      throw new ForbiddenException('이 노트를 삭제할 권한이 없습니다.');
    }

    // S3에 저장된 이미지 파일들 삭제
    if (note.images && note.images.length > 0) {
      await this.deleteNoteImages(note.images);
    }

    const teaId = note.teaId;
    await this.notesRepository.remove(note);

    // 차의 평균 평점 업데이트
    await this.updateTeaRating(teaId);
  }

  /** 운영자 강제 삭제 (소유권 검사 없음) */
  async removeByAdmin(id: number): Promise<void> {
    const note = await this.notesRepository.findOne({ where: { id } });
    if (!note) {
      throw new NotFoundException('노트를 찾을 수 없습니다.');
    }
    if (note.images && note.images.length > 0) {
      await this.deleteNoteImages(note.images);
    }
    const teaId = note.teaId;
    await this.notesRepository.remove(note);
    await this.updateTeaRating(teaId);
  }

  /**
   * 노트의 이미지 URL들에서 S3 key를 추출하여 삭제 (원본 + 썸네일)
   */
  private async deleteNoteImages(imageUrls: string[]): Promise<void> {
    if (!imageUrls || imageUrls.length === 0) {
      return;
    }

    const deletePromises = imageUrls.map(async (url) => {
      try {
        const key = this.extractS3KeyFromUrl(url);
        if (key) {
          await this.s3Service.deleteFile(key);
          this.logger.log(`S3 이미지 삭제 성공: ${key}`);
          const thumbnailKey = this.s3Service.getThumbnailKey(key);
          try {
            await this.s3Service.deleteFile(thumbnailKey);
            this.logger.log(`S3 썸네일 삭제 성공: ${thumbnailKey}`);
          } catch (err) {
            this.logger.warn(`S3 썸네일 삭제 실패 (레거시 노트일 수 있음): ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      } catch (error) {
        // 이미지 삭제 실패해도 노트 삭제는 계속 진행
        this.logger.warn(`S3 이미지 삭제 실패 (URL: ${url}): ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    await Promise.allSettled(deletePromises);
  }

  /**
   * S3 URL에서 key 추출
   * 지원 형식:
   * - https://bucket-name.s3.region.amazonaws.com/key
   * - http://endpoint/bucket-name/key (커스텀 엔드포인트)
   */
  private extractS3KeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      // 커스텀 엔드포인트 형식: http://endpoint/bucket-name/key
      // pathParts[0] = bucket-name, pathParts[1...] = key
      if (pathParts.length >= 2) {
        // bucket-name을 제외한 나머지가 key
        return pathParts.slice(1).join('/');
      }
      
      // 표준 S3 URL 형식: https://bucket-name.s3.region.amazonaws.com/key
      // pathname이 /key 형식 (pathParts[0] = key)
      if (pathParts.length === 1) {
        return pathParts[0];
      }
      
      // 빈 경로인 경우
      if (pathParts.length === 0) {
        return null;
      }
      
      return null;
    } catch (error) {
      this.logger.warn(`URL 파싱 실패 (${url}): ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * 노트의 태그를 설정합니다.
   * 기존 태그를 삭제하고 새로운 태그를 추가합니다.
   */
  private async setNoteTags(noteId: number, tagNames: string[]): Promise<void> {
    // 기존 태그 연결 삭제
    await this.noteTagsRepository.delete({ noteId });

    if (tagNames.length === 0) {
      return;
    }

    // 태그 이름을 정규화 (공백 제거, 중복 제거)
    const normalizedTagNames = Array.from(
      new Set(tagNames.map(name => name.trim()).filter(name => name.length > 0))
    );

    // 태그 생성 또는 조회
    const tags: Tag[] = [];
    for (const tagName of normalizedTagNames) {
      let tag = await this.tagsRepository.findOne({
        where: { name: tagName },
      });

      if (!tag) {
        // 태그가 없으면 생성
        tag = this.tagsRepository.create({ name: tagName });
        tag = await this.tagsRepository.save(tag);
      }

      tags.push(tag);
    }

    // NoteTag 연결 생성
    const noteTags = tags.map(tag =>
      this.noteTagsRepository.create({
        noteId,
        tagId: tag.id,
      })
    );

    await this.noteTagsRepository.save(noteTags);
  }

  async toggleLike(noteId: number, userId: number): Promise<{ liked: boolean; likeCount: number }> {
    // 트랜잭션으로 race condition 방지
    const result = await this.dataSource.transaction(async (manager) => {
      // 노트 존재 확인 및 권한 확인
      const note = await manager.findOne(Note, { where: { id: noteId } });
      if (!note) {
        throw new NotFoundException('노트를 찾을 수 없습니다.');
      }

      // 비공개 노트는 작성자만 좋아요 가능
      if (!note.isPublic && note.userId !== userId) {
        throw new ForbiddenException('이 노트에 좋아요할 권한이 없습니다.');
      }

      // 이미 좋아요를 눌렀는지 확인 (트랜잭션 내에서)
      const existingLike = await manager.findOne(NoteLike, {
        where: { noteId, userId },
      });

      if (existingLike) {
        // 좋아요 취소
        await manager.remove(NoteLike, existingLike);
        const likeCount = await manager.count(NoteLike, { where: { noteId } });
        return { liked: false, likeCount };
      } else {
        // 좋아요 추가 - unique constraint 에러 처리
        let createdLike = false;
        try {
          const newLike = manager.create(NoteLike, { noteId, userId });
          await manager.save(NoteLike, newLike);
          createdLike = true;
        } catch (error) {
          // 동시 요청으로 인한 unique constraint 에러 처리
          if (error instanceof QueryFailedError && (error as any).code === 'ER_DUP_ENTRY') {
            // 이미 좋아요가 추가된 상태로 처리
            this.logger.warn(`Duplicate like detected for noteId: ${noteId}, userId: ${userId}`);
          } else {
            throw error;
          }
        }

        // 트랜잭션 내에서 최신 likeCount 조회
        const likeCount = await manager.count(NoteLike, { where: { noteId } });

        return { liked: true, likeCount, createdLike, ownerId: note.userId };
      }
    });

    // 트랜잭션 커밋 후, 실제 신규 insert된 경우에만 알림 생성
    if (result.liked && result.createdLike && result.ownerId !== undefined) {
      void this.notificationsService
        .create({
          userId: result.ownerId,
          type: NotificationType.NOTE_LIKE,
          actorId: userId,
          targetId: noteId,
        })
        .catch((err) => this.logger.error('알림 생성 실패', err));
    }

    return { liked: result.liked, likeCount: result.likeCount };
  }

  async getLikeCount(noteId: number): Promise<number> {
    return await this.noteLikesRepository.count({ where: { noteId } });
  }

  async isLikedByUser(noteId: number, userId?: number): Promise<boolean> {
    if (!userId) {
      return false;
    }
    const like = await this.noteLikesRepository.findOne({
      where: { noteId, userId },
    });
    return !!like;
  }

  async toggleBookmark(noteId: number, userId: number): Promise<{ bookmarked: boolean }> {
    // 트랜잭션으로 race condition 방지
    return await this.dataSource.transaction(async (manager) => {
      // 노트 존재 확인 및 권한 확인
      const note = await manager.findOne(Note, { where: { id: noteId } });
      if (!note) {
        throw new NotFoundException('노트를 찾을 수 없습니다.');
      }

      // 비공개 노트는 작성자만 북마크 가능
      if (!note.isPublic && note.userId !== userId) {
        throw new ForbiddenException('이 노트를 북마크할 권한이 없습니다.');
      }

      // 이미 북마크를 했는지 확인 (트랜잭션 내에서)
      const existingBookmark = await manager.findOne(NoteBookmark, {
        where: { noteId, userId },
      });

      if (existingBookmark) {
        // 북마크 해제
        await manager.remove(NoteBookmark, existingBookmark);
        return { bookmarked: false };
      } else {
        // 북마크 추가 - unique constraint 에러 처리
        try {
          const newBookmark = manager.create(NoteBookmark, { noteId, userId });
          await manager.save(NoteBookmark, newBookmark);
        } catch (error) {
          // 동시 요청으로 인한 unique constraint 에러 처리
          if (error instanceof QueryFailedError && (error as any).code === 'ER_DUP_ENTRY') {
            // 이미 북마크가 추가된 상태로 처리
            this.logger.warn(`Duplicate bookmark detected for noteId: ${noteId}, userId: ${userId}`);
          } else {
            throw error;
          }
        }
        
        return { bookmarked: true };
      }
    });
  }

  async isBookmarkedByUser(noteId: number, userId?: number): Promise<boolean> {
    if (!userId) {
      return false;
    }
    const bookmark = await this.noteBookmarksRepository.findOne({
      where: { noteId, userId },
    });
    return !!bookmark;
  }

  private async enrichNotesWithLikesAndBookmarks(notes: Note[], currentUserId?: number): Promise<any[]> {
    try {
      if (notes.length === 0) {
        return [];
      }

      const noteIds = notes.map((note) => note.id).filter((id) => id != null);
      
      if (noteIds.length === 0) {
        this.logger.warn('enrichNotesWithLikesAndBookmarks: No valid note IDs found');
        return notes.map((note) => {
          const noteObj = note as any;
          noteObj.likeCount = 0;
          noteObj.isLiked = false;
          noteObj.isBookmarked = false;
          noteObj.schemaIds = (noteObj.noteSchemas?.length ?? 0) > 0
            ? noteObj.noteSchemas.map((ns: NoteSchema) => ns.schemaId).sort((a: number, b: number) => a - b)
            : note.schemaId != null ? [note.schemaId] : [];
          return noteObj;
        });
      }

      // 좋아요 수, 사용자 좋아요/북마크 여부를 병렬로 조회
      const [likeCounts, userLikes, userBookmarks] = await Promise.all([
        this.noteLikesRepository
          .createQueryBuilder('like')
          .select('like.noteId', 'noteId')
          .addSelect('COUNT(like.id)', 'count')
          .where('like.noteId IN (:...noteIds)', { noteIds })
          .groupBy('like.noteId')
          .getRawMany(),
        currentUserId && noteIds.length > 0
          ? this.noteLikesRepository.find({
              where: { noteId: In(noteIds), userId: currentUserId },
            })
          : Promise.resolve([] as NoteLike[]),
        currentUserId && noteIds.length > 0
          ? this.noteBookmarksRepository.find({
              where: { noteId: In(noteIds), userId: currentUserId },
            })
          : Promise.resolve([] as NoteBookmark[]),
      ]);

      const likeCountMap = new Map<number, number>();
      likeCounts.forEach((item) => {
        try {
          const noteId = item.noteId ?? item.like_noteId ?? item.note_id;
          const count = item.count ?? item.COUNT_like_id;

          if (noteId !== undefined && count !== undefined) {
            const parsedCount = typeof count === 'string' ? parseInt(count, 10) : Number(count);
            const parsedNoteId = typeof noteId === 'string' ? parseInt(noteId, 10) : Number(noteId);
            if (!isNaN(parsedCount) && !isNaN(parsedNoteId)) {
              likeCountMap.set(parsedNoteId, parsedCount);
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to process like count item: ${JSON.stringify(item)}`, error);
        }
      });

      const userLikedNoteIds = new Set(userLikes.map((like) => like.noteId));
      const userBookmarkedNoteIds = new Set(userBookmarks.map((bookmark) => bookmark.noteId));

      // 노트에 좋아요, 북마크, schemaIds 추가
      return notes.map((note) => {
        const noteObj = note as any;
        noteObj.likeCount = likeCountMap.get(note.id) || 0;
        noteObj.isLiked = userLikedNoteIds.has(note.id);
        noteObj.isBookmarked = userBookmarkedNoteIds.has(note.id);
        noteObj.schemaIds = (noteObj.noteSchemas?.length ?? 0) > 0
          ? noteObj.noteSchemas.map((ns: NoteSchema) => ns.schemaId).sort((a: number, b: number) => a - b)
          : note.schemaId != null ? [note.schemaId] : [];
        return noteObj;
      });
    } catch (error) {
      this.logger.error(
        `Failed to enrich notes with likes and bookmarks: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      this.logger.error(`Error details: ${JSON.stringify({
        notesCount: notes.length,
        noteIds: notes.map(n => n.id),
        currentUserId,
      })}`);
      throw error;
    }
  }

  /**
   * 노트의 축 값을 설정합니다.
   * 기존 축 값을 삭제하고 새로운 축 값을 추가합니다.
   * 검증은 데이터 삭제 전에 수행되어 일관성을 보장합니다.
   * schemaIds: 노트에 연결된 스키마 ID 목록 (축이 이 중 하나에 속해야 함)
   */
  private async setNoteAxisValues(noteId: number, schemaIds: number | number[], axisValues: Array<{ axisId: number; value: number }>): Promise<void> {
    const schemaIdSet = new Set(Array.isArray(schemaIds) ? schemaIds : [schemaIds]);

    if (axisValues.length === 0) {
      await this.noteAxisValueRepository.delete({ noteId });
      return;
    }

    const axisIds = axisValues.map(av => av.axisId);
    const axes = await this.ratingAxisRepository.find({
      where: { id: In(axisIds) },
    });

    if (axes.length !== axisIds.length) {
      throw new BadRequestException('유효하지 않은 축 ID가 포함되어 있습니다.');
    }

    const invalidAxes = axes.filter(axis => !schemaIdSet.has(axis.schemaId));
    if (invalidAxes.length > 0) {
      throw new BadRequestException('제공된 축 중 일부가 노트의 스키마에 속하지 않습니다.');
    }

    await this.noteAxisValueRepository.delete({ noteId });

    const noteAxisValues = axisValues.map(av =>
      this.noteAxisValueRepository.create({
        noteId,
        axisId: av.axisId,
        valueNumeric: av.value,
      })
    );

    await this.noteAxisValueRepository.save(noteAxisValues);
  }

  async createSchema(userId: number, dto: CreateRatingSchemaDto): Promise<RatingSchema> {
    const code = `CUSTOM_${userId}_${Date.now()}`;
    const version = '1.0.0';

    const schema = this.ratingSchemaRepository.create({
      code,
      version,
      nameKo: dto.nameKo,
      nameEn: dto.nameEn ?? dto.nameKo,
      descriptionKo: dto.descriptionKo ?? null,
      descriptionEn: dto.descriptionEn ?? null,
      overallMinValue: 1,
      overallMaxValue: 5,
      overallStep: 0.5,
      isActive: true,
    });

    const savedSchema = await this.ratingSchemaRepository.save(schema);

    const axes = dto.axes.map((axis, index) =>
      this.ratingAxisRepository.create({
        schemaId: savedSchema.id,
        code: axis.nameKo.replace(/\s/g, '_').toUpperCase().slice(0, 50) || `AXIS_${index + 1}`,
        nameKo: axis.nameKo,
        nameEn: axis.nameEn,
        descriptionKo: axis.descriptionKo?.trim() || null,
        descriptionEn: axis.descriptionEn?.trim() || null,
        minValue: axis.minValue ?? 1,
        maxValue: axis.maxValue ?? 5,
        stepValue: axis.stepValue ?? 1,
        displayOrder: axis.displayOrder ?? index,
        isRequired: false,
      }),
    );

    await this.ratingAxisRepository.save(axes);
    return savedSchema;
  }

  async getActiveSchemas(userId?: number): Promise<{ schemas: RatingSchema[]; pinnedSchemaIds: number[] }> {
    const activeSchemas = await this.ratingSchemaRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });

    // 활성 스키마가 없으면 기본 스키마 생성
    if (activeSchemas.length === 0) {
      this.logger.warn('No active schema found. Creating default schema...');
      
      const defaultSchema = this.ratingSchemaRepository.create(DEFAULT_RATING_SCHEMA);
      const savedSchema = await this.ratingSchemaRepository.save(defaultSchema);
      
      const defaultAxes = DEFAULT_RATING_AXES.map(axis => ({
        ...axis,
        schemaId: savedSchema.id,
      }));

      await this.ratingAxisRepository.save(
        defaultAxes.map(axis => this.ratingAxisRepository.create(axis))
      );

      this.logger.log('Default schema created successfully');
      
      return {
        schemas: [savedSchema],
        pinnedSchemaIds: [],
      };
    }

    let pinnedSchemaIds: number[] = [];
    if (userId) {
      const pins = await this.userSchemaPinRepository.find({
        where: { userId },
        select: ['schemaId'],
      });
      pinnedSchemaIds = pins.map(p => p.schemaId);
    }

    return { schemas: activeSchemas, pinnedSchemaIds };
  }

  async toggleSchemaPin(userId: number, schemaId: number): Promise<{ pinned: boolean }> {
    const schema = await this.ratingSchemaRepository.findOne({ where: { id: schemaId } });
    if (!schema) {
      throw new NotFoundException('평가 스키마를 찾을 수 없습니다.');
    }

    const existing = await this.userSchemaPinRepository.findOne({
      where: { userId, schemaId },
    });

    if (existing) {
      await this.userSchemaPinRepository.remove(existing);
      return { pinned: false };
    }

    await this.userSchemaPinRepository.save(
      this.userSchemaPinRepository.create({ userId, schemaId }),
    );
    return { pinned: true };
  }

  async getSchemaAxes(schemaId: number): Promise<RatingAxis[]> {
    const schema = await this.ratingSchemaRepository.findOne({
      where: { id: schemaId },
    });
    if (!schema) {
      throw new NotFoundException('평가 스키마를 찾을 수 없습니다.');
    }
    return await this.ratingAxisRepository.find({
      where: { schemaId },
      order: { displayOrder: 'ASC' },
    });
  }

  async getCalendarData(userId: number, year: number, month: number): Promise<{ dates: string[]; streak: { current: number; longest: number } }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const rows = await this.notesRepository
      .createQueryBuilder('note')
      .select('DATE(note.createdAt)', 'date')
      .where('note.userId = :userId', { userId })
      .andWhere('note.createdAt >= :startDate', { startDate })
      .andWhere('note.createdAt <= :endDate', { endDate })
      .groupBy('DATE(note.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string }>();

    const dates = rows.map((r) => r.date);
    const streak = await this.calculateStreak(userId);

    return { dates, streak };
  }

  async calculateStreak(userId: number): Promise<{ current: number; longest: number }> {
    const rows = await this.notesRepository
      .createQueryBuilder('note')
      .select('DATE(note.createdAt)', 'date')
      .where('note.userId = :userId', { userId })
      .groupBy('DATE(note.createdAt)')
      .orderBy('date', 'DESC')
      .getRawMany<{ date: string }>();

    if (rows.length === 0) {
      return { current: 0, longest: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let current = 0;
    let longest = 0;
    let streak = 0;
    let prevDate: Date | null = null;

    for (const row of rows) {
      const d = new Date(row.date);
      d.setHours(0, 0, 0, 0);

      if (prevDate === null) {
        const diffFromToday = Math.round((today.getTime() - d.getTime()) / 86400000);
        if (diffFromToday <= 1) {
          streak = 1;
          current = 1;
        } else {
          streak = 1;
        }
      } else {
        const diff = Math.round((prevDate.getTime() - d.getTime()) / 86400000);
        if (diff === 1) {
          streak += 1;
          if (current > 0) {
            current = streak;
          }
        } else {
          if (streak > longest) {
            longest = streak;
          }
          streak = 1;
        }
      }

      prevDate = d;
    }

    if (streak > longest) {
      longest = streak;
    }

    return { current, longest };
  }

  private async updateTeaRating(teaId: number): Promise<void> {
    const result = await this.notesRepository
      .createQueryBuilder('note')
      .select('AVG(note.overallRating)', 'avg')
      .addSelect('COUNT(note.id)', 'count')
      .where('note.teaId = :teaId', { teaId })
      .andWhere('note.isRatingIncluded = :included', { included: true })
      .andWhere('note.overallRating IS NOT NULL')
      .getRawOne<{ avg: string | null; count: string }>();

    const count = parseInt(result?.count ?? '0', 10);
    if (count === 0) {
      await this.teasService.updateRating(teaId, 0, 0);
      return;
    }

    const averageRating = parseFloat(result?.avg ?? '0');
    await this.teasService.updateRating(teaId, averageRating, count);
  }
}