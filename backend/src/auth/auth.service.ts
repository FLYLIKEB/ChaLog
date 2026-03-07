import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import axios from 'axios';
import * as jwksRsa from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    return await this.usersService.validateUser(email, password);
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

  async loginWithApple(idToken: string, name?: string) {
    try {
      const appleUserInfo = await this.verifyAppleIdToken(idToken);

      if (!appleUserInfo || !appleUserInfo.sub) {
        throw new UnauthorizedException('애플 사용자 정보를 가져올 수 없습니다.');
      }

      const user = await this.usersService.createOrUpdateAppleUser(
        appleUserInfo.sub,
        appleUserInfo.email || null,
        name || '애플 사용자',
      );

      return this.login(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('애플 로그인에 실패했습니다.');
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
      const response = await axios.get(
        `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`,
      );
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error?.message || '구글 사용자 정보 조회에 실패했습니다.';
      throw new UnauthorizedException(errorMessage);
    }
  }

  private async verifyAppleIdToken(idToken: string): Promise<{
    sub: string;
    email?: string;
  }> {
    const client = jwksRsa({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000,
    });

    const getKey = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
      client.getSigningKey(header.kid, (err, key) => {
        if (err) {
          callback(err);
          return;
        }
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
      });
    };

    return new Promise((resolve, reject) => {
      jwt.verify(
        idToken,
        getKey,
        {
          algorithms: ['RS256'],
          issuer: 'https://appleid.apple.com',
          audience: this.configService.get<string>('APPLE_CLIENT_ID'),
        },
        (err, decoded) => {
          if (err) {
            reject(new UnauthorizedException('애플 토큰 검증에 실패했습니다.'));
            return;
          }
          resolve(decoded as { sub: string; email?: string });
        },
      );
    });
  }
}
