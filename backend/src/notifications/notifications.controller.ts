import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { UserId } from '../auth/decorators/user-id.decorator';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * 인증된 사용자의 알림 목록을 페이지네이션으로 조회합니다.
   * @param userId - JWT에서 추출된 사용자 ID
   * @param page - 페이지 번호 (쿼리 파라미터)
   * @param limit - 페이지당 개수 (쿼리 파라미터, 1~100)
   */
  @Get()
  async findAll(
    @UserId() userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    if (Number.isNaN(pageNum) || pageNum < 1) {
      throw new BadRequestException('유효하지 않은 페이지 번호입니다.');
    }
    if (Number.isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('유효하지 않은 limit 값입니다.');
    }

    return this.notificationsService.findAllByUser(userId, pageNum, limitNum);
  }

  /**
   * 인증된 사용자의 미읽음 알림 개수를 반환합니다.
   * @param userId - JWT에서 추출된 사용자 ID
   */
  @Get('unread-count')
  async getUnreadCount(@UserId() userId: number) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  /**
   * 인증된 사용자의 모든 미읽음 알림을 읽음 처리합니다.
   * @param userId - JWT에서 추출된 사용자 ID
   */
  @Patch('read-all')
  async markAllAsRead(@UserId() userId: number) {
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  /**
   * 특정 알림을 읽음 처리합니다.
   * @param id - 알림 ID (경로 파라미터)
   * @param userId - JWT에서 추출된 사용자 ID
   */
  @Patch(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number, @UserId() userId: number) {
    await this.notificationsService.markAsRead(id, userId);
    return { success: true };
  }
}
