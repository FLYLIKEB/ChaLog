import { Controller, Post, Param, Body, UseGuards, Request, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

interface AuthenticatedRequest {
  user: { userId: number; email: string };
}

@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('notes/:id/report')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async reportNote(
    @Param('id', ParseIntPipe) noteId: number,
    @Body() dto: CreateReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const report = await this.reportsService.reportNote(noteId, req.user.userId, dto);
    return { id: report.id, message: '신고가 접수되었습니다.' };
  }

  @Post('posts/:id/report')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async reportPost(
    @Param('id', ParseIntPipe) postId: number,
    @Body() dto: CreateReportDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const report = await this.reportsService.reportPost(postId, req.user.userId, dto);
    return { id: report.id, message: '신고가 접수되었습니다.' };
  }
}
