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

  /**
   * 새 알림을 생성합니다.
   * 수신자와 행위자가 동일하거나, 수신자의 알림 설정이 off인 경우 생성하지 않습니다.
   * @param dto - 알림 생성 DTO (userId, type, actorId, targetId)
   */
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

  /**
   * 사용자의 알림 목록을 페이지네이션으로 조회합니다.
   * @param userId - 조회할 사용자 ID
   * @param page - 페이지 번호 (기본값 1)
   * @param limit - 페이지당 개수 (기본값 20, 최대 100)
   * @returns 알림 목록과 전체 개수
   */
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

  /**
   * 사용자의 미읽음 알림 개수를 반환합니다.
   * @param userId - 조회할 사용자 ID
   * @returns 미읽음 알림 개수
   */
  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationsRepository.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * 특정 알림을 읽음 처리합니다.
   * @param id - 알림 ID
   * @param userId - 요청 사용자 ID (본인 알림만 읽음 처리 가능)
   * @throws NotFoundException - 알림이 없거나 본인 알림이 아닌 경우
   */
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

  /**
   * 사용자의 모든 미읽음 알림을 읽음 처리합니다.
   * @param userId - 요청 사용자 ID
   */
  async markAllAsRead(userId: number): Promise<void> {
    await this.notificationsRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }
}
