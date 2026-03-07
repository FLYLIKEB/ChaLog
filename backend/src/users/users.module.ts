import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserAuthentication } from './entities/user-authentication.entity';
import { UserOnboardingPreference } from './entities/user-onboarding-preference.entity';
import { UserNotificationSetting } from './entities/user-notification-setting.entity';
import { StorageModule } from '../common/storage/storage.module';
import { FollowsModule } from '../follows/follows.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserAuthentication, UserOnboardingPreference, UserNotificationSetting]),
    StorageModule,
    FollowsModule,
    NotificationsModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
