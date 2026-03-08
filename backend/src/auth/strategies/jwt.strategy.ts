import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    
    if (!jwtSecret || jwtSecret.trim().length === 0) {
      console.error('FATAL: JWT_SECRET environment variable is required and must not be empty');
      process.exit(1);
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    const userId = payload.sub;
    const user = await this.usersService.findOne(userId);
    if (user?.bannedAt) {
      throw new UnauthorizedException('정지된 계정입니다.');
    }
    return { userId, email: payload.email };
  }
}

