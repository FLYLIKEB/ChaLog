import { Controller, Post, Body, UseGuards, Request, BadRequestException, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 인증 엔드포인트는 더 엄격한 제한
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(
      registerDto.email,
      registerDto.name,
      registerDto.password,
    );
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req, @Body() loginDto: LoginDto) {
    return await this.authService.login(req.user);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('kakao')
  async loginWithKakao(@Body() kakaoLoginDto: KakaoLoginDto) {
    return await this.authService.loginWithKakao(kakaoLoginDto.accessToken);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('google')
  async loginWithGoogle(@Body() googleLoginDto: GoogleLoginDto) {
    return await this.authService.loginWithGoogle(googleLoginDto.accessToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('profile')
  async getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @HttpCode(204)
  @Post('link/kakao')
  async linkKakao(@Request() req, @Body() kakaoLoginDto: KakaoLoginDto) {
    if (!req.user?.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }
    const userId = parseInt(req.user.userId, 10);
    if (Number.isNaN(userId)) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }
    await this.authService.linkKakao(userId, kakaoLoginDto.accessToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @HttpCode(204)
  @Post('link/google')
  async linkGoogle(@Request() req, @Body() googleLoginDto: GoogleLoginDto) {
    if (!req.user?.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }
    const userId = parseInt(req.user.userId, 10);
    if (Number.isNaN(userId)) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }
    await this.authService.linkGoogle(userId, googleLoginDto.accessToken);
  }
}
