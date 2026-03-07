import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { UserNotificationSetting } from '../users/entities/user-notification-setting.entity';

export interface CreateNotificationDto {
  userId: number;
  type: NotificationType;
  actorId: number;
  targetId?: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(UserNotificationSetting)
    private notificationSettingRepository: Repository<UserNotificationSetting>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<void> {
    if (dto.userId === dto.actorId) {
      return;
    }

    try {
      const setting = await this.notificationSettingRepository.findOne({
        where: { userId: dto.userId },
      });
      if (setting && !setting.isNotificationEnabled) {
        return;
      }

      const notification = this.notificationsRepository.create({
        userId: dto.userId,
        type: dto.type,
        actorId: dto.actorId,
        targetId: dto.targetId ?? null,
        isRead: false,
      });
      await this.notificationsRepository.save(notification);
    } catch (error) {
      this.logger.error(`알림 생성 실패: ${error.message}`, error.stack);
    }
  }

  async findAllByUser(
    userId: number,
    page = 1,
    limit = 20,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));

    const [notifications, total] = await this.notificationsRepository.findAndCount({
      where: { userId },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return { notifications, total };
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationsRepository.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: number, userId: number): Promise<void> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }
    notification.isRead = true;
    await this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationsRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }
}
