import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request = require('supertest');

export interface TestUser {
  id: number;
  email: string;
  name: string;
  token: string;
}

export interface TestTea {
  id: number;
  name: string;
  year?: number;
  type: string;
  seller?: string;
  origin?: string;
}

export interface TestNote {
  id: number;
  teaId: number;
  userId: number;
  rating: number;
  memo: string | null;
  isPublic: boolean;
}

export class TestHelper {
  constructor(
    private readonly app: INestApplication,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 고유한 이메일 주소 생성
   */
  generateUniqueEmail(prefix: string = 'test'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}-${timestamp}-${random}@example.com`;
  }

  /**
   * 테스트 사용자 생성 (등록 + 로그인 + 프로필 조회)
   */
  async createUser(name: string, email?: string, password: string = 'password123'): Promise<TestUser> {
    const uniqueEmail = email || this.generateUniqueEmail();
    
    // 사용자 등록
    const registerResponse = await request(this.app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail,
        name,
        password,
      })
      .expect(201);

    const token = registerResponse.body.access_token;

    // 프로필 조회로 userId 얻기
    const profileResponse = await request(this.app.getHttpServer())
      .post('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    return {
      id: profileResponse.body.userId,
      email: uniqueEmail,
      name,
      token,
    };
  }

  /**
   * 여러 사용자 일괄 생성
   */
  async createUsers(count: number, namePrefix: string = 'Test User'): Promise<TestUser[]> {
    const users: TestUser[] = [];
    for (let i = 1; i <= count; i++) {
      const user = await this.createUser(`${namePrefix} ${i}`);
      users.push(user);
    }
    return users;
  }

  /**
   * 테스트 차 생성
   */
  async createTea(
    userToken: string,
    teaData: {
      name: string;
      year?: number;
      type: string;
      seller?: string;
      origin?: string;
    },
  ): Promise<TestTea> {
    const response = await request(this.app.getHttpServer())
      .post('/teas')
      .set('Authorization', `Bearer ${userToken}`)
      .send(teaData)
      .expect(201);

    return {
      id: response.body.id,
      name: response.body.name,
      year: response.body.year,
      type: response.body.type,
      seller: response.body.seller,
      origin: response.body.origin,
    };
  }

  /**
   * 테스트 노트 생성
   */
  async createNote(
    userToken: string,
    noteData: {
      teaId: number;
      rating: number;
      ratings: {
        richness: number;
        strength: number;
        smoothness: number;
        clarity: number;
        complexity: number;
      };
      memo?: string;
      isPublic?: boolean;
    },
  ): Promise<TestNote> {
    const response = await request(this.app.getHttpServer())
      .post('/notes')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        ...noteData,
        memo: noteData.memo || '테스트 노트',
        isPublic: noteData.isPublic ?? true,
      })
      .expect(201);

    return {
      id: response.body.id,
      teaId: response.body.teaId,
      userId: response.body.userId,
      rating: response.body.rating,
      memo: response.body.memo,
      isPublic: response.body.isPublic,
    };
  }

  /**
   * 인증 헤더 생성
   */
  getAuthHeaders(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * HTTP 요청 헬퍼 (인증 포함)
   */
  authenticatedRequest(token: string) {
    return request(this.app.getHttpServer()).set('Authorization', `Bearer ${token}`);
  }

  /**
   * HTTP 요청 헬퍼 (인증 없음)
   */
  unauthenticatedRequest() {
    return request(this.app.getHttpServer());
  }
}

