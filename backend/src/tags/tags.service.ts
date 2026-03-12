import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PaginationHelper } from '../common/utils/pagination.helper';
import { Tag } from '../notes/entities/tag.entity';
import { NoteTag } from '../notes/entities/note-tag.entity';
import { Note } from '../notes/entities/note.entity';
import { NoteLike } from '../notes/entities/note-like.entity';
import { NoteBookmark } from '../notes/entities/note-bookmark.entity';
import { TagFollow } from '../notes/entities/tag-follow.entity';
import { TagDetailDto, TagNoteDto, TagNoteListDto, PopularTagDto } from './dto/tag-detail.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
    @InjectRepository(NoteTag)
    private noteTagsRepository: Repository<NoteTag>,
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(NoteLike)
    private noteLikesRepository: Repository<NoteLike>,
    @InjectRepository(NoteBookmark)
    private noteBookmarksRepository: Repository<NoteBookmark>,
    @InjectRepository(TagFollow)
    private tagFollowsRepository: Repository<TagFollow>,
  ) {}

  async getTagDetail(name: string, currentUserId?: number): Promise<TagDetailDto> {
    const tag = await this.tagsRepository.findOne({ where: { name } });
    if (!tag) {
      throw new NotFoundException(`태그 '${name}'을 찾을 수 없습니다.`);
    }

    const noteCount = await this.noteTagsRepository
      .createQueryBuilder('nt')
      .innerJoin('nt.note', 'note')
      .where('nt.tagId = :tagId', { tagId: tag.id })
      .andWhere('note.isPublic = :isPublic', { isPublic: true })
      .getCount();

    const followerCount = await this.tagFollowsRepository.count({ where: { tagId: tag.id } });

    const isFollowing = currentUserId
      ? !!(await this.tagFollowsRepository.findOne({ where: { userId: currentUserId, tagId: tag.id } }))
      : false;

    return { name: tag.name, noteCount, isFollowing, followerCount };
  }

  async getNotesByTag(name: string, page: number, limit: number, currentUserId?: number): Promise<TagNoteListDto> {
    const tag = await this.tagsRepository.findOne({ where: { name } });
    if (!tag) {
      throw new NotFoundException(`태그 '${name}'을 찾을 수 없습니다.`);
    }

    const { take, skip } = PaginationHelper.normalize(page, limit);

    const [noteTags, total] = await this.noteTagsRepository
      .createQueryBuilder('nt')
      .innerJoinAndSelect('nt.note', 'note')
      .innerJoinAndSelect('note.user', 'user')
      .innerJoinAndSelect('note.tea', 'tea')
      .leftJoinAndSelect('note.noteTags', 'noteTags')
      .leftJoinAndSelect('noteTags.tag', 'tag')
      .where('nt.tagId = :tagId', { tagId: tag.id })
      .andWhere('note.isPublic = :isPublic', { isPublic: true })
      .orderBy('note.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    const notes = noteTags.map((nt) => nt.note);
    const noteIds = notes.map((n) => n.id);

    const likeCountMap = new Map<number, number>();
    const userLikedSet = new Set<number>();
    const userBookmarkedSet = new Set<number>();

    if (noteIds.length > 0) {
      const likeCounts = await this.noteLikesRepository
        .createQueryBuilder('l')
        .select('l.noteId', 'noteId')
        .addSelect('COUNT(l.id)', 'cnt')
        .where('l.noteId IN (:...noteIds)', { noteIds })
        .groupBy('l.noteId')
        .getRawMany();
      likeCounts.forEach((r) => likeCountMap.set(Number(r.noteId), Number(r.cnt)));

      if (currentUserId) {
        const userLikes = await this.noteLikesRepository.find({
          where: { noteId: In(noteIds), userId: currentUserId },
        });
        userLikes.forEach((l) => userLikedSet.add(l.noteId));

        const userBookmarks = await this.noteBookmarksRepository.find({
          where: { noteId: In(noteIds), userId: currentUserId },
        });
        userBookmarks.forEach((b) => userBookmarkedSet.add(b.noteId));
      }
    }

    const tagDetail = await this.getTagDetail(name, currentUserId);

    const noteDtos: TagNoteDto[] = notes.map((note) => ({
      id: note.id,
      teaId: note.teaId,
      teaName: (note as any).tea?.name ?? '',
      teaType: (note as any).tea?.type ?? null,
      teaImageUrl: (note as any).tea?.imageUrl ?? null,
      userId: note.userId,
      userName: (note as any).user?.name ?? '',
      userProfileImageUrl: (note as any).user?.profileImageUrl ?? null,
      overallRating: note.overallRating,
      memo: note.memo,
      tags: note.noteTags?.map((nt) => nt.tag?.name).filter(Boolean) ?? [],
      likeCount: likeCountMap.get(note.id) ?? 0,
      isLiked: userLikedSet.has(note.id),
      isBookmarked: userBookmarkedSet.has(note.id),
      createdAt: note.createdAt,
    }));

    return { tag: tagDetail, notes: noteDtos, total, page: page ?? 1, limit: take };
  }

  async getPopularTags(limit: number, currentUserId?: number): Promise<PopularTagDto[]> {
    const rows = await this.noteTagsRepository
      .createQueryBuilder('nt')
      .select('tag.name', 'name')
      .addSelect('COUNT(nt.id)', 'noteCount')
      .innerJoin('nt.tag', 'tag')
      .innerJoin('nt.note', 'note')
      .where('note.isPublic = :isPublic', { isPublic: true })
      .groupBy('tag.id')
      .orderBy('noteCount', 'DESC')
      .limit(limit)
      .getRawMany();

    return this.attachFollowingFlag(rows, currentUserId);
  }

  async getRecentTags(limit: number, currentUserId?: number): Promise<PopularTagDto[]> {
    const tags = await this.tagsRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });

    const noteCountRows = await this.noteTagsRepository
      .createQueryBuilder('nt')
      .select('nt.tagId', 'tagId')
      .addSelect('COUNT(nt.id)', 'noteCount')
      .innerJoin('nt.note', 'note')
      .where('note.isPublic = :isPublic', { isPublic: true })
      .andWhere('nt.tagId IN (:...tagIds)', { tagIds: tags.map((t) => t.id) })
      .groupBy('nt.tagId')
      .getRawMany();

    const countMap = new Map<number, number>();
    noteCountRows.forEach((r) => countMap.set(Number(r.tagId), Number(r.noteCount)));

    const rows = tags.map((t) => ({ name: t.name, noteCount: countMap.get(t.id) ?? 0 }));
    return this.attachFollowingFlag(rows, currentUserId);
  }

  async followTag(userId: number, name: string): Promise<void> {
    const tag = await this.tagsRepository.findOne({ where: { name } });
    if (!tag) {
      throw new NotFoundException(`태그 '${name}'을 찾을 수 없습니다.`);
    }

    const existing = await this.tagFollowsRepository.findOne({ where: { userId, tagId: tag.id } });
    if (existing) {
      throw new ConflictException('이미 팔로우한 태그입니다.');
    }

    const follow = this.tagFollowsRepository.create({ userId, tagId: tag.id });
    await this.tagFollowsRepository.save(follow);
  }

  async unfollowTag(userId: number, name: string): Promise<void> {
    const tag = await this.tagsRepository.findOne({ where: { name } });
    if (!tag) {
      throw new NotFoundException(`태그 '${name}'을 찾을 수 없습니다.`);
    }

    const follow = await this.tagFollowsRepository.findOne({ where: { userId, tagId: tag.id } });
    if (!follow) {
      throw new NotFoundException('팔로우하지 않은 태그입니다.');
    }

    await this.tagFollowsRepository.remove(follow);
  }

  async getFollowedTags(userId: number): Promise<PopularTagDto[]> {
    const follows = await this.tagFollowsRepository.find({
      where: { userId },
      relations: ['tag'],
      order: { createdAt: 'DESC' },
    });

    const tagIds = follows.map((f) => f.tagId);
    if (tagIds.length === 0) return [];

    const noteCountRows = await this.noteTagsRepository
      .createQueryBuilder('nt')
      .select('nt.tagId', 'tagId')
      .addSelect('COUNT(nt.id)', 'noteCount')
      .innerJoin('nt.note', 'note')
      .where('note.isPublic = :isPublic', { isPublic: true })
      .andWhere('nt.tagId IN (:...tagIds)', { tagIds })
      .groupBy('nt.tagId')
      .getRawMany();

    const countMap = new Map<number, number>();
    noteCountRows.forEach((r) => countMap.set(Number(r.tagId), Number(r.noteCount)));

    return follows.map((f) => ({
      name: f.tag.name,
      noteCount: countMap.get(f.tagId) ?? 0,
      isFollowing: true,
    }));
  }

  private async attachFollowingFlag(rows: Array<{ name: string; noteCount: number | string }>, currentUserId?: number): Promise<PopularTagDto[]> {
    if (!currentUserId || rows.length === 0) {
      return rows.map((r) => ({ name: r.name, noteCount: Number(r.noteCount), isFollowing: false }));
    }

    const tagNames = rows.map((r) => r.name);
    const tags = await this.tagsRepository.find({ where: { name: In(tagNames) } });
    const tagIdMap = new Map(tags.map((t) => [t.name, t.id]));

    const tagIds = tags.map((t) => t.id);
    if (tagIds.length === 0) {
      return rows.map((r) => ({ name: r.name, noteCount: Number(r.noteCount), isFollowing: false }));
    }

    const follows = await this.tagFollowsRepository.find({
      where: { userId: currentUserId, tagId: In(tagIds) },
    });
    const followedTagIds = new Set(follows.map((f) => f.tagId));

    return rows.map((r) => ({
      name: r.name,
      noteCount: Number(r.noteCount),
      isFollowing: followedTagIds.has(tagIdMap.get(r.name) ?? -1),
    }));
  }
}
