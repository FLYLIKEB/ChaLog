import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

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
