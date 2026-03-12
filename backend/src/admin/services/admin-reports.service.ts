import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoteReport, ReportReason, ReportStatus } from '../../reports/entities/note-report.entity';
import { PostReport } from '../../reports/entities/post-report.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { NotesService } from '../../notes/notes.service';
import { PostsService } from '../../posts/posts.service';

@Injectable()
export class AdminReportsService {
  constructor(
    @InjectRepository(NoteReport)
    private noteReportsRepository: Repository<NoteReport>,
    @InjectRepository(PostReport)
    private postReportsRepository: Repository<PostReport>,
    @InjectRepository(AuditLog)
    private auditLogsRepository: Repository<AuditLog>,
    private notesService: NotesService,
    private postsService: PostsService,
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
      reportCounts.map((r: { noteId: number; count: string }) => [r.noteId, r.count]),
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
      reportCounts.map((r: { postId: number; count: string }) => [r.postId, r.count]),
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
}
