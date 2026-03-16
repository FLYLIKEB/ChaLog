import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = await this.usersService.findOne(request.user.userId);
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('이메일 인증이 필요합니다.');
    }
    return true;
  }
}
