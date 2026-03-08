import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT 인증 가드
 * 토큰 만료/무효 시 401 UnauthorizedException 반환 (500 대신)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (err) {
      throw new UnauthorizedException('로그인이 필요합니다. 다시 로그인해주세요.');
    }
    if (info) {
      // jwt expired, invalid token 등
      const isExpired = info.name === 'TokenExpiredError';
      throw new UnauthorizedException(
        isExpired
          ? '로그인 세션이 만료되었습니다. 다시 로그인해주세요.'
          : '로그인이 필요합니다. 다시 로그인해주세요.',
      );
    }
    if (!user) {
      throw new UnauthorizedException('로그인이 필요합니다. 다시 로그인해주세요.');
    }
    return user;
  }
}
