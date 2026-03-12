import { Injectable } from '@nestjs/common';
import { ReportReason, ReportStatus } from '../reports/entities/note-report.entity';
import { CreateTeaDto } from '../teas/dto/create-tea.dto';
import { CreateSellerDto } from '../teas/dto/create-seller.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { AdminUsersService } from './services/admin-users.service';
import { AdminReportsService } from './services/admin-reports.service';
import { AdminContentService } from './services/admin-content.service';
import { AdminAnalyticsService } from './services/admin-analytics.service';

@Injectable()
export class AdminService {
  constructor(
    private adminUsersService: AdminUsersService,
    private adminReportsService: AdminReportsService,
    private adminContentService: AdminContentService,
    private adminAnalyticsService: AdminAnalyticsService,
  ) {}

  getMetrics() {
    return this.adminAnalyticsService.getMetrics();
  }

  getLogs(level?: 'error' | 'warn' | 'all', limit = 50) {
    return this.adminAnalyticsService.getLogs(level, limit);
  }

  getDashboard() {
    return this.adminAnalyticsService.getDashboard();
  }

  getAuditLogs(params: { page?: number; limit?: number; adminId?: number }) {
    return this.adminAnalyticsService.getAuditLogs(params);
  }

  getNoteReports(params: {
    page?: number;
    limit?: number;
    status?: ReportStatus;
    reason?: ReportReason;
    sortBy?: 'createdAt' | 'reportCount';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    return this.adminReportsService.getNoteReports(params);
  }

  getPostReports(params: {
    page?: number;
    limit?: number;
    status?: ReportStatus;
    reason?: ReportReason;
    sortBy?: 'createdAt' | 'reportCount';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    return this.adminReportsService.getPostReports(params);
  }

  getNoteReportDetail(reportId: number) {
    return this.adminReportsService.getNoteReportDetail(reportId);
  }

  getPostReportDetail(reportId: number) {
    return this.adminReportsService.getPostReportDetail(reportId);
  }

  dismissNoteReport(reportId: number, adminId: number) {
    return this.adminReportsService.dismissNoteReport(reportId, adminId);
  }

  dismissPostReport(reportId: number, adminId: number) {
    return this.adminReportsService.dismissPostReport(reportId, adminId);
  }

  actionNoteReport(reportId: number, adminId: number, reason?: string) {
    return this.adminReportsService.actionNoteReport(reportId, adminId, reason);
  }

  actionPostReport(reportId: number, adminId: number, reason?: string) {
    return this.adminReportsService.actionPostReport(reportId, adminId, reason);
  }

  getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'createdAt' | 'updatedAt';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    return this.adminUsersService.getUsers(params);
  }

  getUserDetail(userId: number) {
    return this.adminUsersService.getUserDetail(userId);
  }

  updateUser(targetUserId: number, dto: UpdateUserDto, adminId: number) {
    return this.adminUsersService.updateUser(targetUserId, dto, adminId);
  }

  suspendUser(userId: number, adminId: number) {
    return this.adminUsersService.suspendUser(userId, adminId);
  }

  promoteUser(userId: number, adminId: number) {
    return this.adminUsersService.promoteUser(userId, adminId);
  }

  deleteUser(userId: number, adminId: number) {
    return this.adminUsersService.deleteUser(userId, adminId);
  }

  getNotes(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'createdAt' | 'updatedAt';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    return this.adminContentService.getNotes(params);
  }

  getNoteDetail(noteId: number) {
    return this.adminContentService.getNoteDetail(noteId);
  }

  deleteNote(noteId: number, adminId: number) {
    return this.adminContentService.deleteNote(noteId, adminId);
  }

  getPosts(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'createdAt' | 'viewCount';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    return this.adminContentService.getPosts(params);
  }

  getPostDetail(postId: number) {
    return this.adminContentService.getPostDetail(postId);
  }

  deletePost(postId: number, adminId: number) {
    return this.adminContentService.deletePost(postId, adminId);
  }

  togglePostPin(postId: number, adminId: number) {
    return this.adminContentService.togglePostPin(postId, adminId);
  }

  getPostComments(postId: number) {
    return this.adminContentService.getPostComments(postId);
  }

  deleteComment(commentId: number, adminId: number) {
    return this.adminContentService.deleteComment(commentId, adminId);
  }

  getTeas(params: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    seller?: string;
    sortBy?: 'createdAt' | 'reviewCount' | 'averageRating';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    return this.adminContentService.getTeas(params);
  }

  getTeaDetail(teaId: number) {
    return this.adminContentService.getTeaDetail(teaId);
  }

  createTea(dto: CreateTeaDto, adminId: number) {
    return this.adminContentService.createTea(dto, adminId);
  }

  updateTea(teaId: number, dto: Record<string, unknown>, adminId: number) {
    return this.adminContentService.updateTea(teaId, dto, adminId);
  }

  deleteTea(teaId: number, adminId: number) {
    return this.adminContentService.deleteTea(teaId, adminId);
  }

  getSellers(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'createdAt' | 'name';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    return this.adminContentService.getSellers(params);
  }

  getSellerDetail(sellerId: number) {
    return this.adminContentService.getSellerDetail(sellerId);
  }

  createSeller(dto: CreateSellerDto, adminId: number) {
    return this.adminContentService.createSeller(dto, adminId);
  }

  updateSeller(sellerId: number, dto: Record<string, unknown>, adminId: number) {
    return this.adminContentService.updateSeller(sellerId, dto, adminId);
  }

  deleteSeller(sellerId: number, adminId: number) {
    return this.adminContentService.deleteSeller(sellerId, adminId);
  }

  getTags(params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'createdAt' | 'name' | 'usageCount';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    return this.adminContentService.getTags(params);
  }

  getTagDetail(tagId: number) {
    return this.adminContentService.getTagDetail(tagId);
  }

  createTag(dto: CreateTagDto, adminId: number) {
    return this.adminContentService.createTag(dto, adminId);
  }

  updateTag(tagId: number, dto: { name: string }, adminId: number) {
    return this.adminContentService.updateTag(tagId, dto, adminId);
  }

  deleteTag(tagId: number, adminId: number) {
    return this.adminContentService.deleteTag(tagId, adminId);
  }

  mergeTag(sourceTagId: number, targetTagId: number, adminId: number) {
    return this.adminContentService.mergeTag(sourceTagId, targetTagId, adminId);
  }

  bulkUploadTeas(fileBuffer: Buffer) {
    return this.adminContentService.bulkUploadTeas(fileBuffer);
  }
}
