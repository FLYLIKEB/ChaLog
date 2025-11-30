import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// 테스트 데이터 팩토리
const createMockUser = (overrides?: Partial<User>): User => ({
  id: 1,
  name: '테스트 사용자',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
} as User);

const createMockKakaoUserInfo = (overrides?: any) => ({
  id: 123456789,
  kakao_account: {
    email: 'kakao@example.com',
    profile: {
      nickname: '카카오 사용자',
    },
  },
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    validateUser: jest.fn(),
    create: jest.fn(),
    getUserEmail: jest.fn(),
    createOrUpdateKakaoUser: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock_jwt_token'),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('validateUser - 사용자 검증', () => {
    it('UsersService의 validateUser를 호출해야 함', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockUser = createMockUser();

      mockUsersService.validateUser.mockResolvedValue(mockUser);

      const result = await service.validateUser(email, password);

      expect(mockUsersService.validateUser).toHaveBeenCalledWith(email, password);
      expect(result).toEqual(mockUser);
    });
  });

  describe('login - 로그인', () => {
    const mockUser = createMockUser();
    const email = 'test@example.com';
    const token = 'mock_jwt_token';

    beforeEach(() => {
      mockUsersService.getUserEmail.mockResolvedValue(email);
      mockJwtService.sign.mockReturnValue(token);
    });

    it('액세스 토큰과 사용자 정보를 반환해야 함', async () => {
      const result = await service.login(mockUser);

      expect(mockUsersService.getUserEmail).toHaveBeenCalledWith(mockUser.id);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email,
        sub: mockUser.id,
      });
      expect(result).toEqual({
        access_token: token,
        user: {
          id: mockUser.id,
          email,
          name: mockUser.name,
        },
      });
    });

    it('이메일이 없는 사용자도 처리해야 함', async () => {
      mockUsersService.getUserEmail.mockResolvedValue(null);

      const result = await service.login(mockUser);

      expect(result.user.email).toBeNull();
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: null,
        sub: mockUser.id,
      });
    });
  });

  describe('register - 회원가입', () => {
    it('사용자를 생성하고 로그인 응답을 반환해야 함', async () => {
      const email = 'test@example.com';
      const name = '테스트 사용자';
      const password = 'password123';
      const mockUser = createMockUser({ name });
      const token = 'mock_jwt_token';

      mockUsersService.create.mockResolvedValue(mockUser);
      mockUsersService.getUserEmail.mockResolvedValue(email);
      mockJwtService.sign.mockReturnValue(token);

      const result = await service.register(email, name, password);

      expect(mockUsersService.create).toHaveBeenCalledWith(email, name, password);
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
    });
  });

  describe('loginWithKakao - 카카오 로그인', () => {
    const mockUser = createMockUser({ id: 2, name: '카카오 사용자' });
    const token = 'mock_jwt_token';

    beforeEach(() => {
      mockUsersService.getUserEmail.mockResolvedValue('kakao@example.com');
      mockJwtService.sign.mockReturnValue(token);
    });

    it('유효한 카카오 액세스 토큰으로 로그인해야 함', async () => {
      const accessToken = 'valid_kakao_token';
      const kakaoUserInfo = createMockKakaoUserInfo();

      mockedAxios.get.mockResolvedValue({ data: kakaoUserInfo });
      mockUsersService.createOrUpdateKakaoUser.mockResolvedValue(mockUser);

      const result = await service.loginWithKakao(accessToken);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://kapi.kakao.com/v2/user/me',
        expect.objectContaining({
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      expect(mockUsersService.createOrUpdateKakaoUser).toHaveBeenCalledWith(
        String(kakaoUserInfo.id),
        kakaoUserInfo.kakao_account.email,
        kakaoUserInfo.kakao_account.profile.nickname,
      );
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('user');
    });

    it('이메일이 없는 카카오 사용자도 처리해야 함', async () => {
      const accessToken = 'valid_kakao_token';
      const kakaoUserInfo = createMockKakaoUserInfo({
        kakao_account: {
          profile: { nickname: '카카오 사용자' },
        },
      });

      mockedAxios.get.mockResolvedValue({ data: kakaoUserInfo });
      mockUsersService.createOrUpdateKakaoUser.mockResolvedValue(mockUser);
      mockUsersService.getUserEmail.mockResolvedValue(null);

      const result = await service.loginWithKakao(accessToken);

      expect(mockUsersService.createOrUpdateKakaoUser).toHaveBeenCalledWith(
        String(kakaoUserInfo.id),
        null,
        kakaoUserInfo.kakao_account.profile.nickname,
      );
      expect(result.user.email).toBeNull();
    });

    it('카카오 사용자 정보가 유효하지 않으면 UnauthorizedException을 던져야 함', async () => {
      mockedAxios.get.mockResolvedValue({ data: { id: null } });

      await expect(service.loginWithKakao('invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('카카오 API 호출 실패 시 UnauthorizedException을 던져야 함', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(service.loginWithKakao('invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('카카오 API 에러 메시지를 포함해야 함', async () => {
      const axiosError = {
        response: {
          data: {
            msg: 'Invalid access token',
          },
        },
      };

      mockedAxios.get.mockRejectedValue(axiosError);

      await expect(service.loginWithKakao('invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
