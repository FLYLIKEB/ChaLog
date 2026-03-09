import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as os from 'os';
import { getRecentLogs } from '../common/error-log-buffer';
import { User, UserRole } from '../users/entities/user.entity';
import { Note } from '../notes/entities/note.entity';
import { Post } from '../posts/entities/post.entity';
import { NoteReport, ReportReason, ReportStatus } from '../reports/entities/note-report.entity';
import { PostReport } from '../reports/entities/post-report.entity';
import { Tea } from '../teas/entities/tea.entity';
import { Seller } from '../teas/entities/seller.entity';
import { Tag } from '../notes/entities/tag.entity';
import { Comment } from '../comments/entities/comment.entity';
import { NoteTag } from '../notes/entities/note-tag.entity';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { CreateTeaDto } from '../teas/dto/create-tea.dto';
import { CreateSellerDto } from '../teas/dto/create-seller.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { NotesService } from '../notes/notes.service';
import { PostsService } from '../posts/posts.service';
import { CommentsService } from '../comments/comments.service';
import { FollowsService } from '../follows/follows.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  private validateSort(allowedSortBy: readonly string[], sortBy: string, sortOrder: string) {
    if (!allowedSortBy.includes(sortBy)) {
      throw new BadRequestException('잘못된 정렬 기준입니다.');
    }
    if (sortOrder !== 'ASC' && sortOrder !== 'DESC') {
      throw new BadRequestException('잘못된 정렬 순서입니다.');
    }
  }

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
    @InjectDataSource()
    private dataSource: DataSource,
    private notesService: NotesService,
    private postsService: PostsService,
    private commentsService: CommentsService,
    private followsService: FollowsService,
    private usersService: UsersService,
  ) {}

  async getMetrics() {
    const formatMB = (bytes: number) =>
      Math.round((bytes / 1024 / 1024) * 100) / 100;

    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAvg = os.loadavg();

    let dbConnections = 0;
    try {
      const rows = await this.dataSource.query(
        "SHOW STATUS WHERE Variable_name = 'Threads_connected'",
      );
      const row = rows?.[0] as Record<string, unknown> | undefined;
      const val = row?.['Value'] ?? row?.['value'];
      dbConnections = val != null ? parseInt(String(val), 10) : 0;
    } catch {
      // DB 연결 실패 시 0 반환
    }

    return {
      memory: {
        rssMB: formatMB(memoryUsage.rss),
        heapUsedMB: formatMB(memoryUsage.heapUsed),
        heapTotalMB: formatMB(memoryUsage.heapTotal),
      },
      cpu: {
        processUser: cpuUsage.user,
        processSystem: cpuUsage.system,
        loadAvg: [loadAvg[0], loadAvg[1], loadAvg[2]],
      },
      database: {
        connections: dbConnections,
      },
      uptimeSeconds: Math.floor(process.uptime()),
      recentErrors: getRecentLogs(20, 'error'),
      recentLogs: getRecentLogs(50),
    };
  }

  getLogs(level?: 'error' | 'warn' | 'all', limit = 50) {
    const logs = getRecentLogs(
      limit,
      level === 'all' ? undefined : (level as 'error' | 'warn' | undefined),
    );
    const errorCount = logs.filter((l) => l.level === 'error').length;
    const warnCount = logs.filter((l) => l.level === 'warn').length;
    return { logs, errorCount, warnCount, totalCount: logs.length };
  }

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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [noteReportRows, postReportRows, recentSignupRows] = await Promise.all([
      this.dataSource.query(
        `SELECT DATE(createdAt) as date, COUNT(*) as count FROM note_reports WHERE createdAt >= ? GROUP BY DATE(createdAt) ORDER BY date ASC`,
        [sevenDaysAgo],
      ),
      this.dataSource.query(
        `SELECT DATE(createdAt) as date, COUNT(*) as count FROM post_reports WHERE createdAt >= ? GROUP BY DATE(createdAt) ORDER BY date ASC`,
        [sevenDaysAgo],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) as count FROM users WHERE createdAt >= ?`,
        [sevenDaysAgo],
      ),
    ]);

    const dateMap: Record<string, { noteReports: number; postReports: number }> = {};
    for (let d = 0; d < 7; d++) {
      const d2 = new Date(sevenDaysAgo);
      d2.setDate(d2.getDate() + d);
      const k = d2.toISOString().slice(0, 10);
      dateMap[k] = { noteReports: 0, postReports: 0 };
    }
    (noteReportRows as { date: Date; count: string }[]).forEach((r) => {
      const k = new Date(r.date).toISOString().slice(0, 10);
      if (!dateMap[k]) dateMap[k] = { noteReports: 0, postReports: 0 };
      dateMap[k].noteReports = Number(r.count);
    });
    (postReportRows as { date: Date; count: string }[]).forEach((r) => {
      const k = new Date(r.date).toISOString().slice(0, 10);
      if (!dateMap[k]) dateMap[k] = { noteReports: 0, postReports: 0 };
      dateMap[k].postReports = Number(r.count);
    });
    const reportTrendByDay = Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
    const recentSignupCount = Number((recentSignupRows as { count: string }[])[0]?.count ?? 0);

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
      reportTrendByDay,
      recentSignupCount,
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
    this.validateSort(['createdAt', 'reportCount'], sortBy, sortOrder);
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
    this.validateSort(['createdAt', 'reportCount'], sortBy, sortOrder);
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

    await this.noteReportsRepository.update(
      { noteId },
      { status: ReportStatus.ACTED },
    );
    await this.notesService.removeByAdmin(noteId);
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

    await this.postReportsRepository.update(
      { postId },
      { status: ReportStatus.ACTED },
    );
    await this.postsService.removeByAdmin(postId);
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

    const qb = this.teasRepository.createQueryBuilder('tea');
    if (params.search?.trim()) {
      const term = `%${params.search.trim()}%`;
      qb.andWhere(
        '(tea.name LIKE :term OR tea.type LIKE :term OR tea.seller LIKE :term)',
        { term },
      );
    }
    if (params.type?.trim()) {
      qb.andWhere('tea.type = :type', { type: params.type.trim() });
    }
    if (params.seller?.trim()) {
      qb.andWhere('tea.seller = :seller', { seller: params.seller.trim() });
    }
    const sortBy = params.sortBy ?? 'createdAt';
    const sortOrder = params.sortOrder ?? 'DESC';
    qb.orderBy(`tea.${sortBy}`, sortOrder);

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit };
  }

  async getTeaDetail(teaId: number) {
    const tea = await this.teasRepository.findOne({ where: { id: teaId } });
    if (!tea) throw new NotFoundException('차를 찾을 수 없습니다.');
    const noteCount = await this.notesRepository.count({ where: { teaId } });
    return { ...tea, noteCount };
  }

  async createTea(dto: CreateTeaDto, adminId: number) {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new BadRequestException('차 이름을 입력해주세요.');
    }
    const tea = this.teasRepository.create({
      ...dto,
      name: trimmedName,
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
    return saved;
  }

  async updateTea(teaId: number, dto: Record<string, unknown>, adminId: number) {
    const tea = await this.teasRepository.findOne({ where: { id: teaId } });
    if (!tea) throw new NotFoundException('차를 찾을 수 없습니다.');
    Object.assign(tea, dto);
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
    return tea;
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
            .select('t.seller', 'seller')
            .addSelect('COUNT(*)', 'count')
            .where('t.seller IN (:...names)', {
              names: items.map((s) => s.name).filter(Boolean),
            })
            .andWhere('t.seller IS NOT NULL')
            .andWhere('t.seller != :empty', { empty: '' })
            .groupBy('t.seller')
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
    const teaCount = await this.teasRepository.count({
      where: { seller: seller.name },
    });
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
    const teaCount = await this.teasRepository.count({
      where: { seller: seller.name },
    });
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

  async mergeTag(
    sourceTagId: number,
    targetTagId: number,
    adminId: number,
  ) {
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
