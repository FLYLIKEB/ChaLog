import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import {
  UserAuthentication,
  AuthProvider,
} from './entities/user-authentication.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserAuthentication)
    private authRepository: Repository<UserAuthentication>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async create(email: string, name: string, password: string): Promise<User> {
    // 트랜잭션으로 사용자와 인증 정보를 원자적으로 생성
    return await this.dataSource.transaction(async (manager) => {
      // 이메일로 이미 인증 정보가 있는지 확인
      const existingAuth = await manager.findOne(UserAuthentication, {
        where: { provider: AuthProvider.EMAIL, providerId: email },
      });
      if (existingAuth) {
        throw new ConflictException('이미 존재하는 이메일입니다.');
      }

      // 사용자 생성
      const user = manager.create(User, { name });
      const savedUser = await manager.save(User, user);

      // 인증 정보 생성
      const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      const auth = manager.create(UserAuthentication, {
        userId: savedUser.id,
        provider: AuthProvider.EMAIL,
        providerId: email,
        credential: hashedPassword,
      });
      await manager.save(UserAuthentication, auth);

      return savedUser;
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const auth = await this.authRepository.findOne({
      where: { provider: AuthProvider.EMAIL, providerId: email },
      relations: ['user'],
    });
    return auth?.user || null;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const auth = await this.authRepository.findOne({
      where: { provider: AuthProvider.EMAIL, providerId: email },
      relations: ['user'],
    });

    if (!auth || !auth.credential) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, auth.credential);
    if (!isPasswordValid) {
      return null;
    }

    return auth.user;
  }

  async findByKakaoId(kakaoId: string): Promise<User | null> {
    const auth = await this.authRepository.findOne({
      where: { provider: AuthProvider.KAKAO, providerId: kakaoId },
      relations: ['user'],
    });
    return auth?.user || null;
  }

  async createOrUpdateKakaoUser(
    kakaoId: string,
    email: string | null,
    name: string,
  ): Promise<User> {
    // 기존 카카오 인증 정보 확인
    const existingAuth = await this.authRepository.findOne({
      where: { provider: AuthProvider.KAKAO, providerId: kakaoId },
      relations: ['user'],
    });

    if (existingAuth) {
      return await this.updateExistingKakaoUser(existingAuth.user, email, name);
    }

    return await this.createNewKakaoUser(kakaoId, email, name);
  }

  private async updateExistingKakaoUser(
    user: User,
    email: string | null,
    name: string,
  ): Promise<User> {
    // 사용자 이름 업데이트
    if (name && user.name !== name) {
      user.name = name;
      await this.usersRepository.save(user);
    }

    // 이메일 인증 정보 추가 (없는 경우만)
    if (email) {
      await this.addEmailAuthIfNotExists(user.id, email);
    }

    return user;
  }

  private async createNewKakaoUser(
    kakaoId: string,
    email: string | null,
    name: string,
  ): Promise<User> {
    // 트랜잭션으로 사용자와 인증 정보를 원자적으로 생성
    return await this.dataSource.transaction(async (manager) => {
      // 사용자 생성
      const user = manager.create(User, { name });
      const savedUser = await manager.save(User, user);

      // 카카오 인증 정보 생성
      const kakaoAuth = manager.create(UserAuthentication, {
        userId: savedUser.id,
        provider: AuthProvider.KAKAO,
        providerId: kakaoId,
        credential: null,
      });
      await manager.save(UserAuthentication, kakaoAuth);

      // 이메일 인증 정보 추가 (있는 경우)
      if (email) {
        // 이미 다른 사용자가 해당 이메일을 사용 중인지 확인
        const existingEmailAuth = await manager.findOne(UserAuthentication, {
          where: { provider: AuthProvider.EMAIL, providerId: email },
        });
        if (existingEmailAuth) {
          // 이미 다른 사용자가 해당 이메일을 사용 중이면 이메일 연결 건너뛰기
          return savedUser;
        }
        const emailAuth = manager.create(UserAuthentication, {
          userId: savedUser.id,
          provider: AuthProvider.EMAIL,
          providerId: email,
          credential: null,
        });
        await manager.save(UserAuthentication, emailAuth);
      }

      return savedUser;
    });
  }

  private async addEmailAuthIfNotExists(
    userId: number,
    email: string,
  ): Promise<void> {
    // 해당 이메일이 어떤 사용자에게든 이미 등록되어 있는지 확인
    const existingEmailAuth = await this.authRepository.findOne({
      where: { provider: AuthProvider.EMAIL, providerId: email },
    });

    if (existingEmailAuth) {
      // 이미 다른 사용자가 해당 이메일을 사용 중이면 건너뛰기
      if (existingEmailAuth.userId !== userId) {
        return;
      }
      // 같은 사용자에게 이미 등록되어 있으면 건너뛰기
      return;
    }

    // 이메일이 등록되어 있지 않으면 추가
    const emailAuth = this.authRepository.create({
      userId,
      provider: AuthProvider.EMAIL,
      providerId: email,
      credential: null,
    });
    await this.authRepository.save(emailAuth);
  }

  async getUserEmail(userId: number): Promise<string | null> {
    const auth = await this.authRepository.findOne({
      where: { userId, provider: AuthProvider.EMAIL },
    });
    return auth?.providerId || null;
  }

  async update(id: number, userId: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    // 본인 프로필만 수정 가능
    if (user.id !== userId) {
      throw new ForbiddenException('이 프로필을 수정할 권한이 없습니다.');
    }

    // 프로필 이미지 URL 업데이트
    if (updateUserDto.profileImageUrl !== undefined) {
      user.profileImageUrl = updateUserDto.profileImageUrl;
    }

    return await this.usersRepository.save(user);
  }
}
