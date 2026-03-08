import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../users/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('인증이 필요합니다.');
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'role', 'bannedAt'],
    });

    if (!user) {
      throw new ForbiddenException('운영자 권한이 필요합니다.');
    }

    if (user.bannedAt) {
      throw new ForbiddenException('정지된 계정입니다.');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('운영자 권한이 필요합니다.');
    }

    return true;
  }
}
