import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Note } from '../notes/entities/note.entity';
import { Post } from '../posts/entities/post.entity';
import { NoteReport, ReportReason, ReportStatus } from '../reports/entities/note-report.entity';
import { PostReport } from '../reports/entities/post-report.entity';
import { Tea } from '../teas/entities/tea.entity';
import { Seller } from '../teas/entities/seller.entity';
import { Tag } from '../notes/entities/tag.entity';
import { Comment } from '../comments/entities/comment.entity';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { NotesService } from '../notes/notes.service';
import { PostsService } from '../posts/posts.service';
import { CommentsService } from '../comments/comments.service';
import { FollowsService } from '../follows/follows.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

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
    private notesService: NotesService,
    private postsService: PostsService,
    private commentsService: CommentsService,
    private followsService: FollowsService,
    private usersService: UsersService,
  ) {}

  async getDashboard() {
    const [userCount, noteCount, postCount, teaCount, pendingNoteReports, pendingPostReports] =
      await Promise.all([
        this.usersRepository.count(),
        this.notesRepository.count(),
        this.postsRepository.count(),
        this.teasRepository.count(),
        this.noteReportsRepository.count({ where: { status: ReportStatus.PENDING } }),
        this.postReportsRepository.count({ where: { status: ReportStatus.PENDING } }),
      ]);

    const recentNoteReports = await this.noteReportsRepository.find({
      where: { status: ReportStatus.PENDING },
      relations: ['note', 'note.tea', 'note.user', 'reporter'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    const recentPostReports = await this.postReportsRepository.find({
      where: { status: ReportStatus.PENDING },
      relations: ['post', 'post.user', 'reporter'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      stats: {
        userCount,
        noteCount,
        postCount,
        teaCount,
        pendingNoteReportCount: pendingNoteReports,
        pendingPostReportCount: pendingPostReports,
      },
      recentNoteReports: recentNoteReports.map((r) => ({
        id: r.id,
        noteId: r.noteId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
        reporter: r.reporter ? { id: r.reporter.id, name: r.reporter.name } : null,
        note: r.note
          ? {
              id: r.note.id,
              memo: r.note.memo?.slice(0, 100),
              tea: r.note.tea ? { name: r.note.tea.name } : null,
            }
          : null,
      })),
      recentPostReports: recentPostReports.map((r) => ({
        id: r.id,
        postId: r.postId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
        reporter: r.reporter ? { id: r.reporter.id, name: r.reporter.name } : null,
        post: r.post
          ? { id: r.post.id, title: r.post.title, content: r.post.content?.slice(0, 100) }
          : null,
      })),
    };
  }

  async getNoteReports(params: {
    page?: number;
    limit?: number;
    status?: ReportStatus;
    reason?: ReportReason;
    sortBy?: 'createdAt' | 'reportCount';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.noteReportsRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.note', 'note')
      .leftJoinAndSelect('note.tea', 'tea')
      .leftJoinAndSelect('note.user', 'user')
      .leftJoinAndSelect('report.reporter', 'reporter');

    if (params.status) {
      qb.andWhere('report.status = :status', { status: params.status });
    }
    if (params.reason) {
      qb.andWhere('report.reason = :reason', { reason: params.reason });
    }

    const sortBy = params.sortBy ?? 'createdAt';
    const sortOrder = params.sortOrder ?? 'DESC';
    qb.orderBy(`report.${sortBy}`, sortOrder);

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const noteIds = [...new Set(items.map((r) => r.noteId))];
    const reportCounts =
      noteIds.length > 0
        ? await this.noteReportsRepository
            .createQueryBuilder('r')
            .select('r.noteId', 'noteId')
            .addSelect('COUNT(*)', 'count')
            .where('r.noteId IN (:...ids)', { ids: noteIds })
            .groupBy('r.noteId')
            .getRawMany()
        : [];

    const countMap = Object.fromEntries(
      reportCounts.map((r: any) => [r.noteId, r.count]),
    );

    return {
      items: items.map((r) => ({
        id: r.id,
        noteId: r.noteId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
        reporter: r.reporter ? { id: r.reporter.id, name: r.reporter.name } : null,
        note: r.note
          ? {
              id: r.note.id,
              memo: r.note.memo,
              images: r.note.images,
              tea: r.note.tea ? { id: r.note.tea.id, name: r.note.tea.name } : null,
              user: r.note.user ? { id: r.note.user.id, name: r.note.user.name } : null,
            }
          : null,
        reportCount: countMap[r.noteId] ?? 1,
      })),
      total,
      page,
      limit,
    };
  }

  async getPostReports(params: {
    page?: number;
    limit?: number;
    status?: ReportStatus;
    reason?: ReportReason;
    sortBy?: 'createdAt' | 'reportCount';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.postReportsRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.post', 'post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('report.reporter', 'reporter');

    if (params.status) {
      qb.andWhere('report.status = :status', { status: params.status });
    }
    if (params.reason) {
      qb.andWhere('report.reason = :reason', { reason: params.reason });
    }

    const sortBy = params.sortBy ?? 'createdAt';
    const sortOrder = params.sortOrder ?? 'DESC';
    qb.orderBy(`report.${sortBy}`, sortOrder);

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const postIds = [...new Set(items.map((r) => r.postId))];
    const reportCounts =
      postIds.length > 0
        ? await this.postReportsRepository
            .createQueryBuilder('r')
            .select('r.postId', 'postId')
            .addSelect('COUNT(*)', 'count')
            .where('r.postId IN (:...ids)', { ids: postIds })
            .groupBy('r.postId')
            .getRawMany()
        : [];

    const countMap = Object.fromEntries(
      reportCounts.map((r: any) => [r.postId, r.count]),
    );

    return {
      items: items.map((r) => ({
        id: r.id,
        postId: r.postId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
        reporter: r.reporter ? { id: r.reporter.id, name: r.reporter.name } : null,
        post: r.post
          ? {
              id: r.post.id,
              title: r.post.title,
              content: r.post.content,
              category: r.post.category,
              user: r.post.user ? { id: r.post.user.id, name: r.post.user.name } : null,
            }
          : null,
        reportCount: countMap[r.postId] ?? 1,
      })),
      total,
      page,
      limit,
    };
  }

  async getNoteReportDetail(reportId: number) {
    const report = await this.noteReportsRepository.findOne({
      where: { id: reportId },
      relations: ['note', 'note.tea', 'note.user', 'reporter'],
    });
    if (!report) throw new NotFoundException('신고를 찾을 수 없습니다.');
    const reportCount = await this.noteReportsRepository.count({
      where: { noteId: report.noteId },
    });
    return {
      ...report,
      reportCount,
    };
  }

  async getPostReportDetail(reportId: number) {
    const report = await this.postReportsRepository.findOne({
      where: { id: reportId },
      relations: ['post', 'post.user', 'reporter'],
    });
    if (!report) throw new NotFoundException('신고를 찾을 수 없습니다.');
    const reportCount = await this.postReportsRepository.count({
      where: { postId: report.postId },
    });
    return {
      ...report,
      reportCount,
    };
  }

  async dismissNoteReport(reportId: number, adminId: number) {
    const report = await this.noteReportsRepository.findOne({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('신고를 찾을 수 없습니다.');
    report.status = ReportStatus.DISMISSED;
    await this.noteReportsRepository.save(report);
    await this.logAudit(adminId, AuditAction.REPORT_DISMISS, 'note_report', reportId);
    return { success: true };
  }

  async dismissPostReport(reportId: number, adminId: number) {
    const report = await this.postReportsRepository.findOne({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('신고를 찾을 수 없습니다.');
    report.status = ReportStatus.DISMISSED;
    await this.postReportsRepository.save(report);
    await this.logAudit(adminId, AuditAction.REPORT_DISMISS, 'post_report', reportId);
    return { success: true };
  }

  async actionNoteReport(reportId: number, adminId: number, reason?: string) {
    const report = await this.noteReportsRepository.findOne({
      where: { id: reportId },
      relations: ['note'],
    });
    if (!report) throw new NotFoundException('신고를 찾을 수 없습니다.');
    const noteId = report.noteId;
    await this.notesService.removeByAdmin(noteId);
    report.status = ReportStatus.ACTED;
    await this.noteReportsRepository.save(report);
    await this.noteReportsRepository.update(
      { noteId },
      { status: ReportStatus.ACTED },
    );
    await this.logAudit(adminId, AuditAction.REPORT_ACTION, 'note', noteId, reason, {
      reportId,
    });
    return { success: true };
  }

  async actionPostReport(reportId: number, adminId: number, reason?: string) {
    const report = await this.postReportsRepository.findOne({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('신고를 찾을 수 없습니다.');
    const postId = report.postId;
    await this.postsService.removeByAdmin(postId);
    report.status = ReportStatus.ACTED;
    await this.postReportsRepository.save(report);
    await this.postReportsRepository.update(
      { postId },
      { status: ReportStatus.ACTED },
    );
    await this.logAudit(adminId, AuditAction.REPORT_ACTION, 'post', postId, reason, {
      reportId,
    });
    return { success: true };
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

    const [noteCount, postCount, followerCount, followingCount] = await Promise.all([
      this.notesRepository.count({ where: { userId } }),
      this.postsRepository.count({ where: { userId } }),
      this.followsService.getFollowerCount(userId),
      this.followsService.getFollowingCount(userId),
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
    };
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
    user.role = UserRole.ADMIN;
    await this.usersRepository.save(user);
    await this.logAudit(adminId, AuditAction.USER_PROMOTE, 'user', userId);
    return { success: true };
  }

  async getPostComments(postId: number) {
    return this.commentsService.findByPost(postId);
  }

  async deleteComment(commentId: number, adminId: number) {
    await this.commentsService.removeByAdmin(commentId);
    await this.logAudit(adminId, AuditAction.COMMENT_DELETE, 'comment', commentId);
    return { success: true };
  }

  async getAuditLogs(params: { page?: number; limit?: number; adminId?: number }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.auditLogsRepository.createQueryBuilder('log');
    if (params.adminId) {
      qb.andWhere('log.adminId = :adminId', { adminId: params.adminId });
    }
    qb.orderBy('log.createdAt', 'DESC');
    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit };
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
}
