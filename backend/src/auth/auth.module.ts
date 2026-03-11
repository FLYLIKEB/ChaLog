import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserAuthentication } from '../users/entities/user-authentication.entity';
import { PasswordReset } from '../users/entities/password-reset.entity';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MailModule,
    TypeOrmModule.forFeature([UserAuthentication, PasswordReset]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        
        if (!jwtSecret || jwtSecret.trim().length === 0) {
          throw new Error('JWT_SECRET environment variable is required and must not be empty');
        }
        
        const jwtExpiresIn = configService.get<string>('JWT_EXPIRES_IN') || '7d';
        
        return {
          secret: jwtSecret,
          signOptions: {
            expiresIn: jwtExpiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
