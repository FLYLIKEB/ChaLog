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

  @Get('unread-count')
  async getUnreadCount(@UserId() userId: number) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Patch('read-all')
  async markAllAsRead(@UserId() userId: number) {
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number, @UserId() userId: number) {
    await this.notificationsService.markAsRead(id, userId);
    return { success: true };
  }
}
