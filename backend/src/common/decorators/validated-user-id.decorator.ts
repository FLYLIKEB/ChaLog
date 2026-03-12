import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const ValidatedUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const req = ctx.switchToHttp().getRequest();
    if (!req.user?.userId) throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    const userId = parseInt(req.user.userId, 10);
    if (Number.isNaN(userId)) throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    return userId;
  },
);
