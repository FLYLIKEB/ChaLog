import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { AuthProvider, UserAuthentication } from '../users/entities/user-authentication.entity';
import { PasswordReset } from '../users/entities/password-reset.entity';
import { MailService } from '../mail/mail.service';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(UserAuthentication)
    private userAuthRepository: Repository<UserAuthentication>,
    @InjectRepository(PasswordReset)
    private passwordResetRepository: Repository<PasswordReset>,
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
    // 이메일 인증 정보 가져오기 (없을 수도 있음)
    const email = await this.usersService.getUserEmail(user.id);

    const payload = {
      email: email || null,
      sub: user.id,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: email || null,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(email: string, name: string, password: string) {
    const user = await this.usersService.create(email, name, password);
    return this.login(user);
  }

  async loginWithKakao(accessToken: string) {
    try {
      // 카카오 사용자 정보 조회
      const kakaoUserInfo = await this.getKakaoUserInfo(accessToken);
      
      if (!kakaoUserInfo || !kakaoUserInfo.id) {
        throw new UnauthorizedException('카카오 사용자 정보를 가져올 수 없습니다.');
      }

      // 카카오 ID로 사용자 찾기 또는 생성
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
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.msg || '카카오 사용자 정보 조회에 실패했습니다.';
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
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error?.message || '구글 사용자 정보 조회에 실패했습니다.';
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

    // 기존 미사용 토큰 무효화
    await this.passwordResetRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    // 새 토큰 생성 (32바이트 랜덤 -> SHA-256 해시)
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
}
