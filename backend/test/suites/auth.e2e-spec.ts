import { DataSource } from 'typeorm';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp, cleanupDatabase, ensureDefaultSchema } from '../setup/test-setup';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/auth - 인증 API', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await setupTestApp();
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    // 테스트 격리를 위해 각 테스트 전에 모든 데이터 정리
    await cleanupDatabase(context.dataSource);
  });

  afterAll(async () => {
    await teardownTestApp(context);
  });

  it('POST /auth/register - 이메일로 새 사용자 회원가입', () => {
    const uniqueEmail = `test-${Date.now()}@example.com`;
    return request(context.app.getHttpServer())
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
    await request(context.app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail,
        name: 'Login Test User',
        password: 'password123',
      });

    // 로그인 테스트
    return request(context.app.getHttpServer())
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
    await request(context.app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail,
        name: 'Wrong Test User',
        password: 'password123',
      });

    // 잘못된 비밀번호로 로그인 시도
    return request(context.app.getHttpServer())
      .post('/auth/login')
      .send({
        email: uniqueEmail,
        password: 'wrongpassword',
      })
      .expect(401);
  });

  it('POST /auth/kakao - 잘못된 액세스 토큰으로 카카오 로그인 실패', () => {
    return request(context.app.getHttpServer())
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
    return request(context.app.getHttpServer())
      .post('/auth/kakao')
      .send({})
      .expect(400);
  });

  it('POST /auth/profile - 유효한 토큰으로 프로필 조회', async () => {
    const uniqueEmail = `profile-${Date.now()}@example.com`;
    // 먼저 회원가입
    const registerResponse = await request(context.app.getHttpServer())
      .post('/auth/register')
      .send({
        email: uniqueEmail,
        name: 'Profile Test User',
        password: 'password123',
      })
      .expect(201);

    const token = registerResponse.body.access_token;

    // 프로필 조회
    return request(context.app.getHttpServer())
      .post('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('userId');
        expect(res.body).toHaveProperty('email');
      });
  });

  it('POST /auth/profile - 토큰 없이 프로필 조회 실패', () => {
    return request(context.app.getHttpServer())
      .post('/auth/profile')
      .expect(401);
  });
});

