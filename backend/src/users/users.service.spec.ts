import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserAuthentication, AuthProvider } from './entities/user-authentication.entity';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

// 테스트 데이터 팩토리
const createMockUser = (overrides?: Partial<User>): User => ({
  id: 1,
  name: '테스트 사용자',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
} as User);

const createMockAuth = (overrides?: Partial<UserAuthentication>): UserAuthentication => ({
  id: 1,
  userId: 1,
  provider: AuthProvider.EMAIL,
  providerId: 'test@example.com',
  credential: 'hashed_password',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
} as UserAuthentication);

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let authRepository: Repository<UserAuthentication>;
  let dataSource: DataSource;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockAuthRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserAuthentication),
          useValue: mockAuthRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    authRepository = module.get<Repository<UserAuthentication>>(
      getRepositoryToken(UserAuthentication),
    );
    dataSource = module.get<DataSource>(DataSource);

    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
  });

  describe('create - 이메일 회원가입', () => {
    const email = 'test@example.com';
    const name = '테스트 사용자';
    const password = 'password123';

    it('이메일과 비밀번호로 새 사용자를 생성해야 함', async () => {
      const mockUser = createMockUser({ name });
      mockAuthRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockAuthRepository.create.mockReturnValue({});
      mockAuthRepository.save.mockResolvedValue({});

      const result = await service.create(email, name, password);

      expect(mockAuthRepository.findOne).toHaveBeenCalledWith({
        where: { provider: AuthProvider.EMAIL, providerId: email },
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith({ name });
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(mockAuthRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        provider: AuthProvider.EMAIL,
        providerId: email,
        credential: 'hashed_password',
      });
      expect(result).toEqual(mockUser);
    });

    it('이미 존재하는 이메일이면 ConflictException을 던져야 함', async () => {
      mockAuthRepository.findOne.mockResolvedValue(createMockAuth());

      await expect(service.create(email, name, password)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail - 이메일로 사용자 찾기', () => {
    it('이메일 인증이 존재하면 사용자를 반환해야 함', async () => {
      const email = 'test@example.com';
      const mockUser = createMockUser();
      const mockAuth = createMockAuth({ user: mockUser });

      mockAuthRepository.findOne.mockResolvedValue(mockAuth);

      const result = await service.findByEmail(email);

      expect(result).toEqual(mockUser);
    });

    it('이메일 인증이 없으면 null을 반환해야 함', async () => {
      mockAuthRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('validateUser - 사용자 인증', () => {
    const email = 'test@example.com';
    const password = 'password123';

    it('유효한 자격증명이면 사용자를 반환해야 함', async () => {
      const mockUser = createMockUser();
      const mockAuth = createMockAuth({ user: mockUser, credential: 'hashed_password' });

      mockAuthRepository.findOne.mockResolvedValue(mockAuth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(email, password);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, 'hashed_password');
      expect(result).toEqual(mockUser);
    });

    it('사용자가 없으면 null을 반환해야 함', async () => {
      mockAuthRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('비밀번호가 틀리면 null을 반환해야 함', async () => {
      const mockAuth = createMockAuth({ credential: 'hashed_password' });
      mockAuthRepository.findOne.mockResolvedValue(mockAuth);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(email, 'wrongpassword');

      expect(result).toBeNull();
    });

    it('credential이 null이면 null을 반환해야 함', async () => {
      const mockAuth = createMockAuth({ credential: null });
      mockAuthRepository.findOne.mockResolvedValue(mockAuth);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('findByKakaoId - 카카오 ID로 사용자 찾기', () => {
    it('카카오 인증이 존재하면 사용자를 반환해야 함', async () => {
      const kakaoId = '123456789';
      const mockUser = createMockUser({ name: '카카오 사용자' });
      const mockAuth = createMockAuth({
        provider: AuthProvider.KAKAO,
        providerId: kakaoId,
        user: mockUser,
      });

      mockAuthRepository.findOne.mockResolvedValue(mockAuth);

      const result = await service.findByKakaoId(kakaoId);

      expect(result).toEqual(mockUser);
    });

    it('카카오 인증이 없으면 null을 반환해야 함', async () => {
      mockAuthRepository.findOne.mockResolvedValue(null);

      const result = await service.findByKakaoId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createOrUpdateKakaoUser - 카카오 사용자 생성/업데이트', () => {
    const kakaoId = '123456789';
    const email = 'kakao@example.com';
    const name = '카카오 사용자';

    it('기존 카카오 사용자가 있으면 업데이트해야 함', async () => {
      const mockUser = createMockUser({ name: '기존 이름' });
      const mockAuth = createMockAuth({
        provider: AuthProvider.KAKAO,
        providerId: kakaoId,
        user: mockUser,
      });

      mockAuthRepository.findOne
        .mockResolvedValueOnce(mockAuth)
        .mockResolvedValueOnce(null);
      mockUserRepository.save.mockResolvedValue({ ...mockUser, name });
      mockAuthRepository.create.mockReturnValue({});
      mockAuthRepository.save.mockResolvedValue({});

      const result = await service.createOrUpdateKakaoUser(kakaoId, email, name);

      expect(mockUserRepository.save).toHaveBeenCalledWith({ ...mockUser, name });
      expect(result.name).toBe(name);
    });

    it('카카오 사용자가 없으면 새로 생성해야 함', async () => {
      const mockUser = createMockUser({ id: 2, name });
      mockAuthRepository.findOne.mockResolvedValue(null);
      mockDataSource.transaction.mockImplementation(async (callback) => {
        const mockManager = {
          create: jest.fn().mockReturnValue(mockUser),
          save: jest.fn().mockResolvedValue(mockUser),
        };
        return await callback(mockManager);
      });

      const result = await service.createOrUpdateKakaoUser(kakaoId, email, name);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });

  describe('getUserEmail - 사용자 이메일 조회', () => {
    it('이메일 인증이 있으면 이메일을 반환해야 함', async () => {
      const userId = 1;
      const email = 'test@example.com';
      const mockAuth = createMockAuth({ providerId: email });

      mockAuthRepository.findOne.mockResolvedValue(mockAuth);

      const result = await service.getUserEmail(userId);

      expect(result).toBe(email);
    });

    it('이메일 인증이 없으면 null을 반환해야 함', async () => {
      mockAuthRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserEmail(1);

      expect(result).toBeNull();
    });
  });
});
