import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';
import { Note } from '../../notes/entities/note.entity';
import { Post } from '../../posts/entities/post.entity';
import { NoteReport } from '../../reports/entities/note-report.entity';
import { PostReport } from '../../reports/entities/post-report.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { UpdateUserDto } from '../../users/dto/update-user.dto';
import { FollowsService } from '../../follows/follows.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(NoteReport)
    private noteReportsRepository: Repository<NoteReport>,
    @InjectRepository(PostReport)
    private postReportsRepository: Repository<PostReport>,
    @InjectRepository(AuditLog)
    private auditLogsRepository: Repository<AuditLog>,
    @InjectDataSource()
    private dataSource: DataSource,
    private followsService: FollowsService,
    private usersService: UsersService,
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

  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'createdAt' | 'updatedAt';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.usersRepository.createQueryBuilder('user');

    if (params.search?.trim()) {
      const term = `%${params.search.trim()}%`;
      qb.andWhere('user.name LIKE :term', { term });
    }

    const sortBy = params.sortBy ?? 'createdAt';
    const sortOrder = params.sortOrder ?? 'DESC';
    this.validateSort(['createdAt', 'updatedAt'], sortBy, sortOrder);
    qb.orderBy(`user.${sortBy}`, sortOrder);

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const userIds = items.map((u) => u.id);
    const noteCounts =
      userIds.length > 0
        ? await this.notesRepository
            .createQueryBuilder('n')
            .select('n.userId', 'userId')
            .addSelect('COUNT(*)', 'count')
            .where('n.userId IN (:...ids)', { ids: userIds })
            .groupBy('n.userId')
            .getRawMany()
        : [];
    const postCounts =
      userIds.length > 0
        ? await this.postsRepository
            .createQueryBuilder('p')
            .select('p.userId', 'userId')
            .addSelect('COUNT(*)', 'count')
            .where('p.userId IN (:...ids)', { ids: userIds })
            .groupBy('p.userId')
            .getRawMany()
        : [];

    const noteMap = Object.fromEntries(noteCounts.map((r: any) => [r.userId, r.count]));
    const postMap = Object.fromEntries(postCounts.map((r: any) => [r.userId, r.count]));

    return {
      items: items.map((u) => ({
        id: u.id,
        name: u.name,
        profileImageUrl: u.profileImageUrl,
        bio: u.bio,
        createdAt: u.createdAt,
        bannedAt: u.bannedAt,
        role: u.role,
        noteCount: noteMap[u.id] ?? 0,
        postCount: postMap[u.id] ?? 0,
      })),
      total,
      page,
      limit,
    };
  }

  async getUserDetail(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');

    const [
      noteCount,
      postCount,
      followerCount,
      followingCount,
      recentNotes,
      recentPosts,
      reportsAsReporter,
      reportsAgainstUser,
    ] = await Promise.all([
      this.notesRepository.count({ where: { userId } }),
      this.postsRepository.count({ where: { userId } }),
      this.followsService.getFollowerCount(userId),
      this.followsService.getFollowingCount(userId),
      this.notesRepository.find({
        where: { userId },
        relations: ['tea'],
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.postsRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      Promise.all([
        this.noteReportsRepository.find({
          where: { reporterId: userId },
          relations: ['note', 'note.tea'],
          order: { createdAt: 'DESC' },
          take: 10,
        }),
        this.postReportsRepository.find({
          where: { reporterId: userId },
          relations: ['post'],
          order: { createdAt: 'DESC' },
          take: 10,
        }),
      ]).then(([noteRep, postRep]) => ({
        noteReports: noteRep.map((r) => ({
          id: r.id,
          noteId: r.noteId,
          reason: r.reason,
          status: r.status,
          createdAt: r.createdAt,
          note: r.note ? { id: r.note.id, memo: r.note.memo?.slice(0, 80), tea: r.note.tea?.name } : null,
        })),
        postReports: postRep.map((r) => ({
          id: r.id,
          postId: r.postId,
          reason: r.reason,
          status: r.status,
          createdAt: r.createdAt,
          post: r.post ? { id: r.post.id, title: r.post.title } : null,
        })),
      })),
      Promise.all([
        this.noteReportsRepository
          .createQueryBuilder('r')
          .innerJoin('r.note', 'n')
          .where('n.userId = :userId', { userId })
          .orderBy('r.createdAt', 'DESC')
          .take(10)
          .getMany(),
        this.postReportsRepository
          .createQueryBuilder('r')
          .innerJoin('r.post', 'p')
          .where('p.userId = :userId', { userId })
          .orderBy('r.createdAt', 'DESC')
          .take(10)
          .getMany(),
      ]).then(([noteRep, postRep]) => ({
        noteReports: noteRep.map((r) => ({
          id: r.id,
          noteId: r.noteId,
          reason: r.reason,
          status: r.status,
          createdAt: r.createdAt,
          reporterId: r.reporterId,
        })),
        postReports: postRep.map((r) => ({
          id: r.id,
          postId: r.postId,
          reason: r.reason,
          status: r.status,
          createdAt: r.createdAt,
          reporterId: r.reporterId,
        })),
      })),
    ]);

    const email = await this.usersService.getUserEmail(userId);

    return {
      id: user.id,
      name: user.name,
      profileImageUrl: user.profileImageUrl,
      bio: user.bio,
      instagramUrl: user.instagramUrl,
      blogUrl: user.blogUrl,
      createdAt: user.createdAt,
      bannedAt: user.bannedAt,
      role: user.role,
      email: email || null,
      noteCount,
      postCount,
      followerCount,
      followingCount,
      recentNotes: recentNotes.map((n) => ({
        id: n.id,
        memo: n.memo?.slice(0, 100),
        overallRating: n.overallRating,
        createdAt: n.createdAt,
        tea: n.tea ? { id: n.tea.id, name: n.tea.name } : null,
      })),
      recentPosts: recentPosts.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.content?.slice(0, 100),
        category: p.category,
        createdAt: p.createdAt,
      })),
      reportsAsReporter,
      reportsAgainstUser,
    };
  }

  async updateUser(targetUserId: number, dto: UpdateUserDto, adminId: number) {
    const user = await this.usersRepository.findOne({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    const keys = Object.keys(dto).filter((k) => dto[k as keyof UpdateUserDto] !== undefined);
    if (keys.length === 0) {
      throw new BadRequestException('수정할 항목을 하나 이상 입력해주세요.');
    }
    const orig: Record<string, unknown> = {
      name: user.name,
      profileImageUrl: user.profileImageUrl,
      bio: user.bio,
      instagramUrl: user.instagramUrl,
      blogUrl: user.blogUrl,
    };
    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        throw new BadRequestException('이름을 입력해주세요.');
      }
      user.name = trimmedName;
    }
    if (dto.profileImageUrl !== undefined) user.profileImageUrl = dto.profileImageUrl;
    if (dto.bio !== undefined) user.bio = dto.bio;
    if (dto.instagramUrl !== undefined) user.instagramUrl = dto.instagramUrl;
    if (dto.blogUrl !== undefined) user.blogUrl = dto.blogUrl;
    const hasChange = keys.some(
      (k) => String((user as unknown as Record<string, unknown>)[k] ?? '') !== String(orig[k] ?? ''),
    );
    if (!hasChange) return user;
    await this.usersRepository.save(user);
    await this.logAudit(adminId, AuditAction.USER_UPDATE, 'user', targetUserId, undefined, {
      updates: keys,
    });
    return user;
  }

  async suspendUser(userId: number, adminId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('운영자 계정은 정지할 수 없습니다.');
    }
    user.bannedAt = new Date();
    await this.usersRepository.save(user);
    await this.logAudit(adminId, AuditAction.USER_SUSPEND, 'user', userId);
    return { success: true };
  }

  async promoteUser(userId: number, adminId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (user.role === UserRole.ADMIN) return { success: true };
    user.role = UserRole.ADMIN;
    await this.usersRepository.save(user);
    await this.logAudit(adminId, AuditAction.USER_PROMOTE, 'user', userId);
    return { success: true };
  }

  async deleteUser(userId: number, adminId: number) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('운영자 계정은 삭제할 수 없습니다.');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Note, { userId });
      await manager.delete(NoteReport, { reporterId: userId });
      await manager.delete(PostReport, { reporterId: userId });
      await manager.delete(User, { id: userId });
    });

    await this.logAudit(adminId, AuditAction.USER_DELETE, 'user', userId);
    return { success: true };
  }
}
