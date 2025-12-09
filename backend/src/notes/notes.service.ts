import { Injectable, NotFoundException, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, DataSource, QueryFailedError } from 'typeorm';
import { Note } from './entities/note.entity';
import { Tag } from './entities/tag.entity';
import { NoteTag } from './entities/note-tag.entity';
import { NoteLike } from './entities/note-like.entity';
import { NoteBookmark } from './entities/note-bookmark.entity';
import { RatingSchema } from './entities/rating-schema.entity';
import { RatingAxis } from './entities/rating-axis.entity';
import { NoteAxisValue } from './entities/note-axis-value.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { TeasService } from '../teas/teas.service';
import { S3Service } from '../common/storage/s3.service';

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
    @InjectRepository(RatingSchema)
    private ratingSchemaRepository: Repository<RatingSchema>,
    @InjectRepository(RatingAxis)
    private ratingAxisRepository: Repository<RatingAxis>,
    @InjectRepository(NoteAxisValue)
    private noteAxisValueRepository: Repository<NoteAxisValue>,
    @InjectDataSource()
    private dataSource: DataSource,
    private teasService: TeasService,
    private s3Service: S3Service,
  ) {}

  async create(userId: number, createNoteDto: CreateNoteDto): Promise<Note> {
    // 차가 존재하는지 확인
    const tea = await this.teasService.findOne(createNoteDto.teaId);
    
    // 스키마가 존재하는지 확인
    const schema = await this.ratingSchemaRepository.findOne({
      where: { id: createNoteDto.schemaId },
    });
    if (!schema) {
      throw new NotFoundException('평가 스키마를 찾을 수 없습니다.');
    }

    // tags와 axisValues 필드를 분리
    const { tags, axisValues, ...noteData } = createNoteDto;
    
    // isRatingIncluded 기본값 설정
    const isRatingIncluded = createNoteDto.isRatingIncluded !== undefined 
      ? createNoteDto.isRatingIncluded 
      : true;
    
    const note = this.notesRepository.create({
      ...noteData,
      userId,
      teaId: tea.id,
      isRatingIncluded,
    });

    const savedNote = await this.notesRepository.save(note);
    
    // 축 값 처리
    if (axisValues && axisValues.length > 0) {
      await this.setNoteAxisValues(savedNote.id, schema.id, axisValues);
    }
    
    // 태그 처리
    if (tags && tags.length > 0) {
      await this.setNoteTags(savedNote.id, tags);
    }
    
    // 차의 평균 평점 업데이트
    await this.updateTeaRating(tea.id);

    // 축 값와 태그를 포함한 노트 반환
    return this.findOne(savedNote.id, userId);
  }

  async findAll(userId?: number, isPublic?: boolean, teaId?: number, currentUserId?: number): Promise<any[]> {
    try {
      const queryBuilder = this.notesRepository
        .createQueryBuilder('note')
        .leftJoinAndSelect('note.user', 'user')
        .leftJoinAndSelect('note.tea', 'tea')
        .leftJoinAndSelect('note.schema', 'schema')
        .leftJoinAndSelect('note.noteTags', 'noteTags')
        .leftJoinAndSelect('noteTags.tag', 'tag')
        .leftJoinAndSelect('note.axisValues', 'axisValues')
        .leftJoinAndSelect('axisValues.axis', 'axis')
        .orderBy('note.createdAt', 'DESC');

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

      const notes = await queryBuilder.getMany();
      
      // 좋아요 및 북마크 정보 추가
      return await this.enrichNotesWithLikesAndBookmarks(notes, currentUserId);
    } catch (error) {
      this.logger.error(`Failed to findAll notes: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findOne(id: number, userId?: number): Promise<any> {
    const note = await this.notesRepository.findOne({
      where: { id },
      relations: ['user', 'tea', 'schema', 'noteTags', 'noteTags.tag', 'axisValues', 'axisValues.axis'],
    });

    if (!note) {
      throw new NotFoundException('노트를 찾을 수 없습니다.');
    }

    // 비공개 노트는 작성자만 볼 수 있음
    if (!note.isPublic && note.userId !== userId) {
      throw new ForbiddenException('이 노트를 볼 권한이 없습니다.');
    }

    // 좋아요 및 북마크 정보 추가
    const enrichedNotes = await this.enrichNotesWithLikesAndBookmarks([note], userId);
    return enrichedNotes[0];
  }

  async update(id: number, userId: number, updateNoteDto: UpdateNoteDto): Promise<Note> {
    const note = await this.findOne(id, userId);

    if (note.userId !== userId) {
      throw new ForbiddenException('이 노트를 수정할 권한이 없습니다.');
    }

    // schemaId 변경 시 스키마 존재 확인
    if (updateNoteDto.schemaId !== undefined) {
      const schema = await this.ratingSchemaRepository.findOne({
        where: { id: updateNoteDto.schemaId },
      });
      if (!schema) {
        throw new NotFoundException('평가 스키마를 찾을 수 없습니다.');
      }
    }

    // tags와 axisValues 필드를 분리
    const { tags, axisValues, ...noteData } = updateNoteDto;

    Object.assign(note, noteData);
    const updatedNote = await this.notesRepository.save(note);

    // 업데이트된 스키마 ID 확인 (변경되었을 수 있음)
    const finalSchemaId = updateNoteDto.schemaId !== undefined ? updateNoteDto.schemaId : note.schemaId;

    // 축 값 업데이트 (axisValues가 제공된 경우에만)
    if (axisValues !== undefined) {
      await this.setNoteAxisValues(id, finalSchemaId, axisValues);
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

  /**
   * 노트의 이미지 URL들에서 S3 key를 추출하여 삭제
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
        }
      } catch (error) {
        // 이미지 삭제 실패해도 노트 삭제는 계속 진행
        // (이미지가 이미 삭제되었거나 존재하지 않을 수 있음)
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
    return await this.dataSource.transaction(async (manager) => {
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
        try {
          const newLike = manager.create(NoteLike, { noteId, userId });
          await manager.save(NoteLike, newLike);
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
        return { liked: true, likeCount };
      }
    });
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
          return noteObj;
        });
      }

      // 좋아요 수 조회
      const likeCounts = await this.noteLikesRepository
        .createQueryBuilder('like')
        .select('like.noteId', 'noteId')
        .addSelect('COUNT(like.id)', 'count')
        .where('like.noteId IN (:...noteIds)', { noteIds })
        .groupBy('like.noteId')
        .getRawMany();

      const likeCountMap = new Map<number, number>();
      likeCounts.forEach((item) => {
        try {
          // TypeORM의 getRawMany()는 alias를 사용할 때 지정한 alias를 키로 사용
          // 하지만 때때로 다른 형식으로 반환될 수 있으므로 안전하게 처리
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

      // 현재 사용자의 좋아요 여부 조회
      let userLikes: NoteLike[] = [];
      if (currentUserId && noteIds.length > 0) {
        userLikes = await this.noteLikesRepository.find({
          where: { noteId: In(noteIds), userId: currentUserId },
        });
      }
      const userLikedNoteIds = new Set(userLikes.map((like) => like.noteId));

      // 현재 사용자의 북마크 여부 조회
      let userBookmarks: NoteBookmark[] = [];
      if (currentUserId && noteIds.length > 0) {
        userBookmarks = await this.noteBookmarksRepository.find({
          where: { noteId: In(noteIds), userId: currentUserId },
        });
      }
      const userBookmarkedNoteIds = new Set(userBookmarks.map((bookmark) => bookmark.noteId));

      // 노트에 좋아요 및 북마크 정보 추가
      return notes.map((note) => {
        const noteObj = note as any;
        noteObj.likeCount = likeCountMap.get(note.id) || 0;
        noteObj.isLiked = userLikedNoteIds.has(note.id);
        noteObj.isBookmarked = userBookmarkedNoteIds.has(note.id);
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
   */
  private async setNoteAxisValues(noteId: number, schemaId: number, axisValues: Array<{ axisId: number; value: number }>): Promise<void> {
    if (axisValues.length === 0) {
      // 빈 배열인 경우 기존 값만 삭제
      await this.noteAxisValueRepository.delete({ noteId });
      return;
    }

    // 검증: 축 ID 유효성 검증 및 스키마 일치 확인 (데이터 삭제 전에 수행)
    const axisIds = axisValues.map(av => av.axisId);
    const axes = await this.ratingAxisRepository.find({
      where: { id: In(axisIds) },
    });

    if (axes.length !== axisIds.length) {
      throw new BadRequestException('유효하지 않은 축 ID가 포함되어 있습니다.');
    }

    // 모든 축이 노트의 스키마에 속하는지 확인
    const invalidAxes = axes.filter(axis => axis.schemaId !== schemaId);
    if (invalidAxes.length > 0) {
      throw new BadRequestException('제공된 축 중 일부가 노트의 스키마에 속하지 않습니다.');
    }

    // 검증이 성공한 후에만 기존 축 값 삭제
    await this.noteAxisValueRepository.delete({ noteId });

    // NoteAxisValue 생성
    const noteAxisValues = axisValues.map(av =>
      this.noteAxisValueRepository.create({
        noteId,
        axisId: av.axisId,
        valueNumeric: av.value,
      })
    );

    await this.noteAxisValueRepository.save(noteAxisValues);
  }

  async getActiveSchemas(): Promise<RatingSchema[]> {
    return await this.ratingSchemaRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
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

  private async updateTeaRating(teaId: number): Promise<void> {
    const notes = await this.notesRepository.find({
      where: { teaId, isRatingIncluded: true },
    });

    if (notes.length === 0) {
      // 모든 노트가 삭제되었거나 포함되지 않았을 때 평점을 초기화
      await this.teasService.updateRating(teaId, 0, 0);
      return;
    }

    // overallRating이 있는 노트만 계산
    const notesWithRating = notes.filter(note => note.overallRating !== null);
    
    if (notesWithRating.length === 0) {
      await this.teasService.updateRating(teaId, 0, 0);
      return;
    }

    const averageRating =
      notesWithRating.reduce((sum, note) => sum + Number(note.overallRating), 0) / notesWithRating.length;

    await this.teasService.updateRating(teaId, averageRating, notesWithRating.length);
  }
}
