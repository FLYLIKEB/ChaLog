import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TeasModule } from './teas/teas.module';
import { NotesModule } from './notes/notes.module';
import { CellarModule } from './cellar/cellar.module';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { ReportsModule } from './reports/reports.module';
import { TagsModule } from './tags/tags.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { TeaSessionsModule } from './tea-sessions/tea-sessions.module';
import { getTypeOrmConfig } from './database/typeorm.config';
import { HealthController } from './health/health.controller';
import { User } from './users/entities/user.entity';
import { HttpExceptionFilter } from './common/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        // 테스트 환경에서는 rate limiting 비활성화 (매우 높은 제한)
        const isTest = process.env.NODE_ENV === 'test';
        const isDevelopment = process.env.NODE_ENV !== 'production';
        return [
          {
            ttl: 60000, // 1분
            limit: isTest ? 10000 : (isDevelopment ? 300 : 200), // 개발 환경은 300회, 프로덕션은 200회
          },
        ];
      },
      inject: [ConfigService],
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 600000, // 10분 (밀리초)
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getTypeOrmConfig(configService),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User]),
    AuthModule,
    UsersModule,
    TeasModule,
    NotesModule,
    CellarModule,
    PostsModule,
    CommentsModule,
    ReportsModule,
    TagsModule,
    NotificationsModule,
    AdminModule,
    TeaSessionsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
