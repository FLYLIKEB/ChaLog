import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

/**
 * JWT 인증된 요청에서 사용자 ID를 추출하는 파라미터 데코레이터입니다.
 * JwtAuthGuard와 함께 사용해야 하며, request.user.userId를 파싱하여 number로 반환합니다.
 * @throws BadRequestException - userId가 없거나 유효하지 않은 경우
 */
export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest();
    const userId = parseInt(request.user?.userId, 10);
    if (Number.isNaN(userId)) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }
    return userId;
  },
);
