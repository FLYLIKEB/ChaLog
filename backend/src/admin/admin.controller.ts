import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { UserId } from '../auth/decorators/user-id.decorator';
import { ReportActionDto } from './dto/report-action.dto';
import { UpdateTeaDto } from './dto/update-tea.dto';
import { UpdateSellerDto } from '../teas/dto/update-seller.dto';
import { MergeTagDto } from './dto/merge-tag.dto';
import { CreateTeaDto } from '../teas/dto/create-tea.dto';
import { CreateSellerDto } from '../teas/dto/create-seller.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { ReportStatus, ReportReason } from '../reports/entities/note-report.entity';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('metrics')
  getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get('logs')
  getLogs(
    @Query('level') level?: 'error' | 'warn' | 'all',
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.adminService.getLogs(level ?? 'all', limit ?? 50);
  }

  @Get('reports/notes')
  getNoteReports(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: ReportStatus,
    @Query('reason') reason?: ReportReason,
    @Query('sortBy') sortBy?: 'createdAt' | 'reportCount',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.adminService.getNoteReports({
      page,
      limit,
      status,
      reason,
      sortBy,
      sortOrder,
    });
  }

  @Get('reports/posts')
  getPostReports(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: ReportStatus,
    @Query('reason') reason?: ReportReason,
    @Query('sortBy') sortBy?: 'createdAt' | 'reportCount',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.adminService.getPostReports({
      page,
      limit,
      status,
      reason,
      sortBy,
      sortOrder,
    });
  }

  @Get('reports/notes/:id')
  getNoteReportDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getNoteReportDetail(id);
  }

  @Get('reports/posts/:id')
  getPostReportDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getPostReportDetail(id);
  }

  @Post('reports/notes/:id/dismiss')
  dismissNoteReport(
    @Param('id', ParseIntPipe) id: number,
    @UserId() adminId: number,
  ) {
    return this.adminService.dismissNoteReport(id, adminId);
  }

  @Post('reports/posts/:id/dismiss')
  dismissPostReport(
    @Param('id', ParseIntPipe) id: number,
    @UserId() adminId: number,
  ) {
    return this.adminService.dismissPostReport(id, adminId);
  }

  @Post('reports/notes/:id/action')
  actionNoteReport(
    @Param('id', ParseIntPipe) id: number,
    @UserId() adminId: number,
    @Body() dto: ReportActionDto,
  ) {
    return this.adminService.actionNoteReport(id, adminId, dto.reason);
  }

  @Post('reports/posts/:id/action')
  actionPostReport(
    @Param('id', ParseIntPipe) id: number,
    @UserId() adminId: number,
    @Body() dto: ReportActionDto,
  ) {
    return this.adminService.actionPostReport(id, adminId, dto.reason);
  }

  @Get('users')
  getUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'updatedAt',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.adminService.getUsers({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get('users/:id')
  getUserDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @UserId() adminId: number,
  ) {
    return this.adminService.updateUser(id, dto, adminId);
  }

  @Post('users/:id/suspend')
  suspendUser(
    @Param('id', ParseIntPipe) id: number,
    @UserId() adminId: number,
  ) {
    return this.adminService.suspendUser(id, adminId);
  }

  @Delete('users/:id')
  deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @UserId() adminId: number,
  ) {
    return this.adminService.deleteUser(id, adminId);
  }

  @Post('users/:id/promote')
  promoteUser(
    @Param('id', ParseIntPipe) id: number,
    @UserId() adminId: number,
  ) {
    return this.adminService.promoteUser(id, adminId);
  }

  @Get('notes')
  getNotes(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'updatedAt',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.adminService.getNotes({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get('notes/:id')
  getNoteDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getNoteDetail(id);
  }

  @Delete('notes/:id')
  deleteNote(
    @Param('id', ParseIntPipe) id: number,
    @UserId() adminId: number,
  ) {
    return this.adminService.deleteNote(id, adminId);
  }

  @Get('posts')
  getPosts(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'viewCount',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.adminService.getPosts({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get('posts/:id')
  getPostDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getPostDetail(id);
  }

  @Patch('posts/:id/pin')
  togglePostPin(
    @Param('id', ParseIntPipe) id: number,
    @UserId() adminId: number,
  ) {
    return this.adminService.togglePostPin(id, adminId);
  }

  @Delete('posts/:id')
  deletePost(
    @Param('id', ParseIntPipe) id: number,
    @UserId() adminId: number,
  ) {
    return this.adminService.deletePost(id, adminId);
  }

  @Get('posts/:id/comments')
  getPostComments(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getPostComments(id);
  }

  @Delete('comments/:id')
  deleteComment(
    @Param('id', ParseIntPipe) id: number,
    @UserId() adminId: number,
  ) {
    return this.adminService.deleteComment(id, adminId);
  }

  @Get('audit-log')
  getAuditLogs(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('adminId', new ParseIntPipe({ optional: true })) adminId?: number,
  ) {
    return this.adminService.getAuditLogs({ page, limit, adminId });
  }

  @Get('teas')
  getTeas(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('seller') seller?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'reviewCount' | 'averageRating',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.adminService.getTeas({
      page,
      limit,
      search,
      type,
      seller,
      sortBy,
      sortOrder,
    });
  }

  @Get('teas/:id')
  getTeaDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getTeaDetail(id);
  }

  @Post('teas')
  createTea(@Body() dto: CreateTeaDto, @UserId() adminId: number) {
    return this.adminService.createTea(dto, adminId);
  }

  @Patch('teas/:id')
  updateTea(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeaDto,
    @UserId() adminId: number,
  ) {
    return this.adminService.updateTea(id, dto as Record<string, unknown>, adminId);
  }

  @Delete('teas/:id')
  deleteTea(@Param('id', ParseIntPipe) id: number, @UserId() adminId: number) {
    return this.adminService.deleteTea(id, adminId);
  }

  @Get('sellers')
  getSellers(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'name',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.adminService.getSellers({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get('sellers/:id')
  getSellerDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getSellerDetail(id);
  }

  @Post('sellers')
  createSeller(@Body() dto: CreateSellerDto, @UserId() adminId: number) {
    return this.adminService.createSeller(dto, adminId);
  }

  @Patch('sellers/:id')
  updateSeller(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSellerDto,
    @UserId() adminId: number,
  ) {
    return this.adminService.updateSeller(id, dto as Record<string, unknown>, adminId);
  }

  @Delete('sellers/:id')
  deleteSeller(@Param('id', ParseIntPipe) id: number, @UserId() adminId: number) {
    return this.adminService.deleteSeller(id, adminId);
  }

  @Get('tags')
  getTags(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'name' | 'usageCount',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.adminService.getTags({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get('tags/:id')
  getTagDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getTagDetail(id);
  }

  @Post('tags')
  createTag(@Body() dto: CreateTagDto, @UserId() adminId: number) {
    return this.adminService.createTag(dto, adminId);
  }

  @Patch('tags/:id')
  updateTag(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { name: string },
    @UserId() adminId: number,
  ) {
    return this.adminService.updateTag(id, dto, adminId);
  }

  @Delete('tags/:id')
  deleteTag(@Param('id', ParseIntPipe) id: number, @UserId() adminId: number) {
    return this.adminService.deleteTag(id, adminId);
  }

  @Post('tags/:id/merge')
  mergeTag(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MergeTagDto,
    @UserId() adminId: number,
  ) {
    return this.adminService.mergeTag(id, dto.targetTagId, adminId);
  }
}
