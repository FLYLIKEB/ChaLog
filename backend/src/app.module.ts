import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TeasModule } from './teas/teas.module';
import { NotesModule } from './notes/notes.module';
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
        return [
          {
            ttl: 60000, // 1분
            limit: isTest ? 10000 : 10, // 테스트 환경에서는 10000회, 프로덕션에서는 10회
          },
        ];
      },
      inject: [ConfigService],
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
