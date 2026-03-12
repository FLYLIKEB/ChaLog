import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as os from 'os';
import { getRecentLogs } from '../../common/error-log-buffer';
import { User } from '../../users/entities/user.entity';
import { Note } from '../../notes/entities/note.entity';
import { Post } from '../../posts/entities/post.entity';
import { NoteReport, ReportStatus } from '../../reports/entities/note-report.entity';
import { PostReport } from '../../reports/entities/post-report.entity';
import { Tea } from '../../teas/entities/tea.entity';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

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
    @InjectRepository(AuditLog)
    private auditLogsRepository: Repository<AuditLog>,
    @InjectDataSource()
    private dataSource: DataSource,
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
    } catch (err) {
      this.logger.warn(`DB 연결 수 조회 실패, 0 반환: ${err instanceof Error ? err.message : String(err)}`);
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
}
