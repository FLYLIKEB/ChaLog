import { Injectable, ConflictException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserOnboardingPreference } from './entities/user-onboarding-preference.entity';
import { UserNotificationSetting } from './entities/user-notification-setting.entity';
import {
  UserAuthentication,
  AuthProvider,
} from './entities/user-authentication.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import { FollowsService } from '../follows/follows.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import * as bcrypt from 'bcrypt';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserAuthentication)
    private authRepository: Repository<UserAuthentication>,
    @InjectRepository(UserOnboardingPreference)
    private onboardingPreferencesRepository: Repository<UserOnboardingPreference>,
    @InjectRepository(UserNotificationSetting)
    private notificationSettingRepository: Repository<UserNotificationSetting>,
    @InjectDataSource()
    private dataSource: DataSource,
    private followsService: FollowsService,
    private notificationsService: NotificationsService,
  ) {}

  async create(email: string, name: string, password: string): Promise<User> {
    // 트랜잭션으로 사용자와 인증 정보를 원자적으로 생성
    return await this.dataSource.transaction(async (manager) => {
      // 이메일로 이미 인증 정보가 있는지 확인
      const existingAuth = await manager.findOne(UserAuthentication, {
        where: { provider: AuthProvider.EMAIL, providerId: email },
      });
      if (existingAuth) {
        throw new ConflictException('이미 존재하는 이메일입니다.');
      }

      // 사용자 생성
      const user = manager.create(User, { name });
      const savedUser = await manager.save(User, user);

      const onboardingPreference = manager.create(UserOnboardingPreference, {
        userId: savedUser.id,
        preferredTeaTypes: [],
        preferredFlavorTags: [],
        hasCompletedOnboarding: false,
      });
      await manager.save(UserOnboardingPreference, onboardingPreference);

      // 인증 정보 생성
      const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      const auth = manager.create(UserAuthentication, {
        userId: savedUser.id,
        provider: AuthProvider.EMAIL,
        providerId: email,
        credential: hashedPassword,
      });
      await manager.save(UserAuthentication, auth);

      return savedUser;
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const auth = await this.authRepository.findOne({
      where: { provider: AuthProvider.EMAIL, providerId: email },
      relations: ['user'],
    });
    return auth?.user || null;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const auth = await this.authRepository.findOne({
      where: { provider: AuthProvider.EMAIL, providerId: email },
      relations: ['user'],
    });

    if (!auth || !auth.credential) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, auth.credential);
    if (!isPasswordValid) {
      return null;
    }

    return auth.user;
  }

  async findByKakaoId(kakaoId: string): Promise<User | null> {
    const auth = await this.authRepository.findOne({
      where: { provider: AuthProvider.KAKAO, providerId: kakaoId },
      relations: ['user'],
    });
    return auth?.user || null;
  }

  async createOrUpdateKakaoUser(
    kakaoId: string,
    email: string | null,
    name: string,
  ): Promise<User> {
    return this.createOrUpdateOAuthUser(AuthProvider.KAKAO, kakaoId, email, name);
  }

  async createOrUpdateGoogleUser(
    googleId: string,
    email: string | null,
    name: string,
  ): Promise<User> {
    return this.createOrUpdateOAuthUser(AuthProvider.GOOGLE, googleId, email, name);
  }

  private async createOrUpdateOAuthUser(
    provider: AuthProvider,
    providerId: string,
    email: string | null,
    name: string,
  ): Promise<User> {
    const existingAuth = await this.authRepository.findOne({
      where: { provider, providerId },
      relations: ['user'],
    });

    if (existingAuth) {
      const user = existingAuth.user;
      if (name && user.name !== name) {
        user.name = name;
        await this.usersRepository.save(user);
      }
      if (email) {
        await this.addEmailAuthIfNotExists(user.id, email);
      }
      return user;
    }

    return await this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, { name });
      const savedUser = await manager.save(User, user);

      await manager.save(
        UserOnboardingPreference,
        manager.create(UserOnboardingPreference, {
          userId: savedUser.id,
          preferredTeaTypes: [],
          preferredFlavorTags: [],
          hasCompletedOnboarding: false,
        }),
      );

      await manager.save(
        UserAuthentication,
        manager.create(UserAuthentication, {
          userId: savedUser.id,
          provider,
          providerId,
          credential: null,
        }),
      );

      if (email) {
        const existingEmailAuth = await manager.findOne(UserAuthentication, {
          where: { provider: AuthProvider.EMAIL, providerId: email },
        });
        if (!existingEmailAuth) {
          await manager.save(
            UserAuthentication,
            manager.create(UserAuthentication, {
              userId: savedUser.id,
              provider: AuthProvider.EMAIL,
              providerId: email,
              credential: null,
            }),
          );
        }
      }

      return savedUser;
    });
  }

  private async addEmailAuthIfNotExists(
    userId: number,
    email: string,
  ): Promise<void> {
    const existingEmailAuth = await this.authRepository.findOne({
      where: { provider: AuthProvider.EMAIL, providerId: email },
    });

    if (existingEmailAuth) {
      return;
    }

    await this.authRepository.save(
      this.authRepository.create({
        userId,
        provider: AuthProvider.EMAIL,
        providerId: email,
        credential: null,
      }),
    );
  }

  async getUserEmail(userId: number): Promise<string | null> {
    const auth = await this.authRepository.findOne({
      where: { userId, provider: AuthProvider.EMAIL },
    });
    return auth?.providerId || null;
  }

  async update(id: number, userId: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    // 본인 프로필만 수정 가능
    if (user.id !== userId) {
      throw new ForbiddenException('이 프로필을 수정할 권한이 없습니다.');
    }

    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name;
    }
    if (updateUserDto.profileImageUrl !== undefined) {
      user.profileImageUrl = updateUserDto.profileImageUrl;
    }
    if (updateUserDto.bio !== undefined) {
      user.bio = updateUserDto.bio;
    }
    if (updateUserDto.instagramUrl !== undefined) {
      user.instagramUrl = updateUserDto.instagramUrl;
    }
    if (updateUserDto.blogUrl !== undefined) {
      user.blogUrl = updateUserDto.blogUrl;
    }

    return await this.usersRepository.save(user);
  }

  async getOnboardingPreference(userId: number): Promise<UserOnboardingPreference> {
    const existing = await this.onboardingPreferencesRepository.findOne({ where: { userId } });
    if (existing) {
      return existing;
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const created = this.onboardingPreferencesRepository.create({
      userId,
      preferredTeaTypes: [],
      preferredFlavorTags: [],
      hasCompletedOnboarding: false,
    });
    return await this.onboardingPreferencesRepository.save(created);
  }

  async updateOnboardingPreference(
    userId: number,
    updateOnboardingDto: UpdateOnboardingDto,
  ): Promise<UserOnboardingPreference> {
    const preference = await this.getOnboardingPreference(userId);

    if (updateOnboardingDto.preferredTeaTypes !== undefined) {
      preference.preferredTeaTypes = updateOnboardingDto.preferredTeaTypes;
    }

    if (updateOnboardingDto.preferredFlavorTags !== undefined) {
      preference.preferredFlavorTags = updateOnboardingDto.preferredFlavorTags;
    }

    if (
      updateOnboardingDto.preferredTeaTypes !== undefined &&
      updateOnboardingDto.preferredFlavorTags !== undefined
    ) {
      preference.hasCompletedOnboarding = true;
    }

    return await this.onboardingPreferencesRepository.save(preference);
  }

  async hasCompletedOnboarding(userId: number): Promise<boolean> {
    const preference = await this.getOnboardingPreference(userId);
    return preference.hasCompletedOnboarding;
  }

  async getNotificationSetting(userId: number): Promise<UserNotificationSetting> {
    await this.notificationSettingRepository
      .createQueryBuilder()
      .insert()
      .values({ userId, isNotificationEnabled: true })
      .orIgnore()
      .execute();
    return this.notificationSettingRepository.findOne({ where: { userId } }) as Promise<UserNotificationSetting>;
  }

  async updateNotificationSetting(
    userId: number,
    dto: UpdateNotificationSettingDto,
  ): Promise<UserNotificationSetting> {
    const setting = await this.getNotificationSetting(userId);

    if (dto.isNotificationEnabled !== undefined) {
      setting.isNotificationEnabled = dto.isNotificationEnabled;
    }

    return await this.notificationSettingRepository.save(setting);
  }

  async toggleFollow(
    followerId: number,
    followingId: number,
  ): Promise<{ isFollowing: boolean }> {
    const result = await this.followsService.toggle(followerId, followingId);

    if (result.isFollowing) {
      this.notificationsService
        .create({
          userId: followingId,
          type: NotificationType.FOLLOW,
          actorId: followerId,
        })
        .catch((err) => this.logger.error('알림 생성 실패', err));
    }

    return result;
  }
}
