import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { NotesService } from '../notes/notes.service';
import { User, UserRole } from '../users/entities/user.entity';
import { AuthProvider, UserAuthentication } from '../users/entities/user-authentication.entity';
import { PasswordReset } from '../users/entities/password-reset.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { NoteReport } from '../reports/entities/note-report.entity';
import { PostReport } from '../reports/entities/post-report.entity';
import { MailService } from '../mail/mail.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private notesService: NotesService,
    private jwtService: JwtService,
    @InjectRepository(UserAuthentication)
    private userAuthRepository: Repository<UserAuthentication>,
    @InjectRepository(PasswordReset)
    private passwordResetRepository: Repository<PasswordReset>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectDataSource()
    private dataSource: DataSource,
    private mailService: MailService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    return await this.usersService.validateUser(email, password);
  }

  async getMe(userId: number) {
    const user = await this.usersService.findOne(userId);
    const email = await this.usersService.getUserEmail(user.id);
    return {
      id: user.id,
      email: email || null,
      name: user.name,
      role: user.role,
    };
  }

  async login(user: User) {
    const email = await this.usersService.getUserEmail(user.id);

    const payload = {
      email: email || null,
      sub: user.id,
    };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = await this.generateRefreshTokenValue(user.id);
    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: email || null,
        name: user.name,
        role: user.role,
      },
    };
  }

  private async generateRefreshTokenValue(userId: number): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(raw).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일
    await this.refreshTokenRepository.save({ userId, tokenHash, expiresAt, isRevoked: false });
    return raw;
  }

  async validateAndRotateRefreshToken(rawToken: string): Promise<{ access_token: string; refresh_token: string; userId: number }> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const stored = await this.refreshTokenRepository.findOne({ where: { tokenHash } });
    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }
    stored.isRevoked = true;
    await this.refreshTokenRepository.save(stored);

    const email = await this.usersService.getUserEmail(stored.userId);
    const access_token = this.jwtService.sign({ email: email || null, sub: stored.userId });
    const refresh_token = await this.generateRefreshTokenValue(stored.userId);
    return { access_token, refresh_token, userId: stored.userId };
  }

  async revokeAllRefreshTokens(userId: number): Promise<void> {
    await this.refreshTokenRepository.update({ userId, isRevoked: false }, { isRevoked: true });
  }

  async register(email: string, name: string, password: string) {
    const user = await this.usersService.create(email, name, password);
    return this.login(user);
  }

  async loginWithKakao(accessToken: string) {
    try {
      const kakaoUserInfo = await this.getKakaoUserInfo(accessToken);

      if (!kakaoUserInfo || !kakaoUserInfo.id) {
        throw new UnauthorizedException('카카오 사용자 정보를 가져올 수 없습니다.');
      }

      const user = await this.usersService.createOrUpdateKakaoUser(
        String(kakaoUserInfo.id),
        kakaoUserInfo.kakao_account?.email || null,
        kakaoUserInfo.kakao_account?.profile?.nickname || '카카오 사용자',
      );

      return this.login(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('카카오 로그인에 실패했습니다.');
    }
  }

  async loginWithGoogle(accessToken: string) {
    try {
      const googleUserInfo = await this.getGoogleUserInfo(accessToken);

      if (!googleUserInfo || !googleUserInfo.id) {
        throw new UnauthorizedException('구글 사용자 정보를 가져올 수 없습니다.');
      }

      const user = await this.usersService.createOrUpdateGoogleUser(
        googleUserInfo.id,
        googleUserInfo.email || null,
        googleUserInfo.name || '구글 사용자',
      );

      return this.login(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('구글 로그인에 실패했습니다.');
    }
  }

  private async getKakaoUserInfo(accessToken: string): Promise<{
    id: number;
    kakao_account?: {
      email?: string;
      profile?: {
        nickname?: string;
      };
    };
  }> {
    try {
      const response = await axios.get('https://kapi.kakao.com/v2/user/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          property_keys: JSON.stringify(['kakao_account.email', 'kakao_account.profile']),
        },
      });
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { msg?: string } } };
      const errorMessage =
        err?.response?.data?.msg || '카카오 사용자 정보 조회에 실패했습니다.';
      throw new UnauthorizedException(errorMessage);
    }
  }

  private async getGoogleUserInfo(accessToken: string): Promise<{
    id: string;
    email?: string;
    name?: string;
  }> {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage =
        err?.response?.data?.error?.message || '구글 사용자 정보 조회에 실패했습니다.';
      throw new UnauthorizedException(errorMessage);
    }
  }

  async linkKakao(userId: number, accessToken: string): Promise<void> {
    const kakaoUserInfo = await this.getKakaoUserInfo(accessToken);
    if (!kakaoUserInfo || !kakaoUserInfo.id) {
      throw new UnauthorizedException('카카오 사용자 정보를 가져올 수 없습니다.');
    }
    await this.usersService.linkOAuthAccount(
      userId,
      AuthProvider.KAKAO,
      String(kakaoUserInfo.id),
      kakaoUserInfo.kakao_account?.email || null,
    );
  }

  async linkGoogle(userId: number, accessToken: string): Promise<void> {
    const googleUserInfo = await this.getGoogleUserInfo(accessToken);
    if (!googleUserInfo || !googleUserInfo.id) {
      throw new UnauthorizedException('구글 사용자 정보를 가져올 수 없습니다.');
    }
    await this.usersService.linkOAuthAccount(
      userId,
      AuthProvider.GOOGLE,
      googleUserInfo.id,
      googleUserInfo.email || null,
    );
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return;

    const auth = await this.userAuthRepository.findOne({
      where: { userId: user.id, provider: AuthProvider.EMAIL },
    });
    if (!auth) return;

    await this.passwordResetRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30분

    await this.passwordResetRepository.save({
      userId: user.id,
      tokenHash,
      expiresAt,
      usedAt: null,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    await this.mailService.sendPasswordResetEmail(email, resetUrl);
  }

  async findEmail(name: string): Promise<{ maskedEmail: string | null }> {
    const user = await this.usersService.findByName(name);
    if (!user) return { maskedEmail: null };

    const auth = await this.userAuthRepository.findOne({
      where: { userId: user.id, provider: AuthProvider.EMAIL },
    });
    if (!auth) return { maskedEmail: null };

    const email = auth.providerId;
    const [local, domain] = email.split('@');
    const masked = local.length <= 2
      ? local[0] + '***'
      : local.slice(0, 2) + '***';
    return { maskedEmail: `${masked}@${domain}` };
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    }

    const auth = await this.userAuthRepository.findOne({
      where: { userId, provider: AuthProvider.EMAIL },
    });
    if (!auth || !auth.credential) {
      throw new BadRequestException('이메일 비밀번호 계정이 없습니다. 소셜 로그인 전용 계정입니다.');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, auth.credential);
    if (!isMatch) {
      throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다.');
    }

    auth.credential = await bcrypt.hash(dto.newPassword, 10);
    await this.userAuthRepository.save(auth);
    await this.revokeAllRefreshTokens(userId);

    return { message: '비밀번호가 변경되었습니다. 다시 로그인해주세요.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const reset = await this.passwordResetRepository.findOne({
      where: { tokenHash },
    });

    if (!reset) throw new BadRequestException('유효하지 않은 재설정 링크입니다.');
    if (reset.usedAt) throw new BadRequestException('이미 사용된 재설정 링크입니다.');
    if (reset.expiresAt < new Date()) throw new BadRequestException('만료된 재설정 링크입니다.');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userAuthRepository.update(
      { userId: reset.userId, provider: AuthProvider.EMAIL },
      { credential: hashed },
    );
    await this.passwordResetRepository.update({ id: reset.id }, { usedAt: new Date() });
  }

  async withdraw(userId: number, dto: WithdrawDto): Promise<{ message: string }> {
    const user = await this.usersService.findOne(userId);

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('운영자 계정은 탈퇴할 수 없습니다.');
    }

    const emailAuth = await this.userAuthRepository.findOne({
      where: { userId, provider: AuthProvider.EMAIL },
    });

    if (emailAuth) {
      if (!dto.password) {
        throw new UnauthorizedException('비밀번호를 입력해주세요.');
      }
      if (!emailAuth.credential) {
        throw new UnauthorizedException('비밀번호가 설정되지 않은 계정입니다.');
      }
      const isMatch = await bcrypt.compare(dto.password, emailAuth.credential);
      if (!isMatch) {
        throw new UnauthorizedException('비밀번호가 올바르지 않습니다.');
      }
    } else {
      if (dto.confirmText !== '탈퇴합니다') {
        throw new BadRequestException('"탈퇴합니다"를 정확히 입력해주세요.');
      }
    }

    await this.revokeAllRefreshTokens(userId);

    const userNotes = await this.dataSource.query(
      'SELECT id FROM notes WHERE userId = ?',
      [userId],
    );
    for (const note of userNotes) {
      await this.notesService.removeByAdmin(note.id);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(NoteReport, { reporterId: userId });
      await manager.delete(PostReport, { reporterId: userId });
      await manager.delete(User, { id: userId });
    });

    return { message: '회원탈퇴가 완료되었습니다.' };
  }
}
