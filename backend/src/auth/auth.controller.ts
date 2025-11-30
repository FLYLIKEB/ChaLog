import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { KakaoLoginDto } from './dto/kakao-login.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(
      registerDto.email,
      registerDto.name,
      registerDto.password,
    );
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req, @Body() loginDto: LoginDto) {
    return await this.authService.login(req.user);
  }

  @Post('kakao')
  async loginWithKakao(@Body() kakaoLoginDto: KakaoLoginDto) {
    return await this.authService.loginWithKakao(kakaoLoginDto.accessToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('profile')
  async getProfile(@Request() req) {
    return req.user;
  }
}
