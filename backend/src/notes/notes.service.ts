import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './entities/note.entity';
import { Tag } from './entities/tag.entity';
import { NoteTag } from './entities/note-tag.entity';
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
    private teasService: TeasService,
    private s3Service: S3Service,
  ) {}

  async create(userId: number, createNoteDto: CreateNoteDto): Promise<Note> {
    // 차가 존재하는지 확인
    const tea = await this.teasService.findOne(createNoteDto.teaId);
    
    // tags 필드를 분리
    const { tags, ...noteData } = createNoteDto;
    
    const note = this.notesRepository.create({
      ...noteData,
      userId,
      teaId: tea.id,
    });

    const savedNote = await this.notesRepository.save(note);
    
    // 태그 처리
    if (tags && tags.length > 0) {
      await this.setNoteTags(savedNote.id, tags);
    }
    
    // 차의 평균 평점 업데이트
    await this.updateTeaRating(tea.id);

    // 태그를 포함한 노트 반환
    return this.findOne(savedNote.id, userId);
  }

  async findAll(userId?: number, isPublic?: boolean, teaId?: number): Promise<Note[]> {
    const queryBuilder = this.notesRepository
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.user', 'user')
      .leftJoinAndSelect('note.tea', 'tea')
      .leftJoinAndSelect('note.noteTags', 'noteTags')
      .leftJoinAndSelect('noteTags.tag', 'tag')
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

    return await queryBuilder.getMany();
  }

  async findOne(id: number, userId?: number): Promise<Note> {
    const note = await this.notesRepository.findOne({
      where: { id },
      relations: ['user', 'tea', 'noteTags', 'noteTags.tag'],
    });

    if (!note) {
      throw new NotFoundException('노트를 찾을 수 없습니다.');
    }

    // 비공개 노트는 작성자만 볼 수 있음
    if (!note.isPublic && note.userId !== userId) {
      throw new ForbiddenException('이 노트를 볼 권한이 없습니다.');
    }

    return note;
  }

  async update(id: number, userId: number, updateNoteDto: UpdateNoteDto): Promise<Note> {
    const note = await this.findOne(id, userId);

    if (note.userId !== userId) {
      throw new ForbiddenException('이 노트를 수정할 권한이 없습니다.');
    }

    // tags 필드를 분리
    const { tags, ...noteData } = updateNoteDto;

    Object.assign(note, noteData);
    const updatedNote = await this.notesRepository.save(note);

    // 태그 업데이트 (tags가 제공된 경우에만)
    if (tags !== undefined) {
      await this.setNoteTags(id, tags || []);
    }

    // 차의 평균 평점 업데이트
    await this.updateTeaRating(note.teaId);

    // 태그를 포함한 업데이트된 노트 반환
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

  private async updateTeaRating(teaId: number): Promise<void> {
    const notes = await this.notesRepository.find({
      where: { teaId },
    });

    if (notes.length === 0) {
      // 모든 노트가 삭제되었을 때 평점을 초기화
      await this.teasService.updateRating(teaId, 0, 0);
      return;
    }

    const averageRating =
      notes.reduce((sum, note) => sum + Number(note.rating), 0) / notes.length;

    await this.teasService.updateRating(teaId, averageRating, notes.length);
  }
}
