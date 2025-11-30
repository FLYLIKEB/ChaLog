import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(404);
  });

  describe('/auth - 인증 API', () => {
    beforeEach(async () => {
      // 테스트 격리를 위해 각 테스트 전에 인증 관련 데이터 정리
      await dataSource.query('DELETE FROM notes');
      await dataSource.query('DELETE FROM user_authentications');
      await dataSource.query('DELETE FROM users');
    });

    it('POST /auth/register - 이메일로 새 사용자 회원가입', () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          name: 'Test User',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(uniqueEmail);
        });
    });

    it('POST /auth/login - 유효한 자격증명으로 로그인', async () => {
      const uniqueEmail = `login-${Date.now()}@example.com`;
      // 먼저 회원가입
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          name: 'Login Test User',
          password: 'password123',
        });

      // 로그인 테스트
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('POST /auth/login - 잘못된 자격증명으로 로그인 실패', async () => {
      const uniqueEmail = `wrong-${Date.now()}@example.com`;
      // 먼저 회원가입
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          name: 'Wrong Test User',
          password: 'password123',
        });

      // 잘못된 비밀번호로 로그인 시도
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('POST /auth/kakao - 잘못된 액세스 토큰으로 카카오 로그인 실패', () => {
      return request(app.getHttpServer())
        .post('/auth/kakao')
        .send({
          accessToken: 'invalid_token',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.statusCode).toBe(401);
        });
    });

    it('POST /auth/kakao - 액세스 토큰 없이 카카오 로그인 실패', () => {
      return request(app.getHttpServer())
        .post('/auth/kakao')
        .send({})
        .expect(400);
    });

    it('POST /auth/profile - 유효한 토큰으로 프로필 조회', async () => {
      const uniqueEmail = `profile-${Date.now()}@example.com`;
      // 먼저 회원가입
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          name: 'Profile Test User',
          password: 'password123',
        })
        .expect(201);

      const token = registerResponse.body.access_token;

      // 프로필 조회
      return request(app.getHttpServer())
        .post('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('userId');
          expect(res.body).toHaveProperty('email');
        });
    });

    it('POST /auth/profile - 토큰 없이 프로필 조회 실패', () => {
      return request(app.getHttpServer())
        .post('/auth/profile')
        .expect(401);
    });
  });

  describe('/teas - 차 API', () => {
    let authToken: string;

    beforeAll(async () => {
      // 테스트용 사용자 등록 및 로그인
      const uniqueEmail = `teatest-${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          name: 'Tea Test User',
          password: 'password123',
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: 'password123',
        });

      authToken = loginResponse.body.access_token;
    });

    beforeEach(async () => {
      // 테스트 격리를 위해 각 테스트 전에 teas 및 관련 notes 데이터 정리
      // 외래키 제약으로 인해 notes를 먼저 삭제
      await dataSource.query('DELETE FROM notes');
      await dataSource.query('DELETE FROM teas');
    });

    it('GET /teas - 초기에는 빈 배열을 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/teas')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('POST /teas - 인증된 사용자가 새 차를 생성할 수 있어야 함', () => {
      return request(app.getHttpServer())
        .post('/teas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '정산소종',
          year: 2023,
          type: '홍차',
          seller: '차향',
          origin: '중국 푸젠',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('정산소종');
        });
    });

    it('POST /teas - 인증 없이 차 생성 실패', () => {
      return request(app.getHttpServer())
        .post('/teas')
        .send({
          name: '정산소종',
          year: 2023,
          type: '홍차',
        })
        .expect(401);
    });
  });
});


