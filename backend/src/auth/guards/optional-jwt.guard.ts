import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

/**
 * 선택적 JWT 인증 가드
 * 토큰이 있으면 검증하고, 없으면 통과시킵니다.
 * 인증 실패 시에도 요청을 계속 진행합니다.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // 인증 실패 시에도 요청을 계속 진행하도록 오버라이드
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const result = super.canActivate(context);
    
    // Promise인 경우
    if (result instanceof Promise) {
      return result.catch(() => {
        // 인증 실패 시에도 요청을 계속 진행
        return true;
      });
    }
    
    // Observable인 경우
    if (result instanceof Observable) {
      return result.pipe(
        catchError(() => {
          // 인증 실패 시에도 요청을 계속 진행
          return of(true);
        })
      );
    }
    
    // boolean인 경우 그대로 반환
    return result;
  }

  // handleRequest를 오버라이드하여 인증 실패 시에도 req.user를 설정하지 않음
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // 에러가 있거나 사용자가 없으면 undefined를 반환 (req.user는 undefined가 됨)
    if (err || !user) {
      return undefined;
    }
    return user;
  }
}

