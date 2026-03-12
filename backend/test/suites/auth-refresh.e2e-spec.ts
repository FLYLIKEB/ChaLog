import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp, cleanupDatabase } from '../setup/test-setup';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/auth - Refresh Token & Cookie 인증', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await setupTestApp();
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await cleanupDatabase(context.dataSource);
  });

  afterAll(async () => {
    await teardownTestApp(context);
  });

  const registerUser = async (email: string) =>
    request(context.app.getHttpServer())
      .post('/auth/register')
      .send({ email, name: 'Test User', password: 'Password123!' });

  it('POST /auth/login - Set-Cookie 헤더에 access_token, refresh_token 포함', async () => {
    const email = `cookie-${Date.now()}@example.com`;
    await registerUser(email);

    const res = await request(context.app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Password123!' })
      .expect(201);

    const cookies: string[] = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toBeDefined();
    const cookieStr = cookies.join('; ');
    expect(cookieStr).toContain('access_token=');
    expect(cookieStr).toContain('refresh_token=');
    expect(cookieStr).toContain('HttpOnly');
  });

  it('POST /auth/refresh - 유효한 refresh_token으로 토큰 갱신 성공', async () => {
    const email = `refresh-${Date.now()}@example.com`;
    const registerRes = await registerUser(email);
    const cookies: string[] = registerRes.headers['set-cookie'] as unknown as string[];
    const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));
    expect(refreshCookie).toBeDefined();

    const res = await request(context.app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie!)
      .expect(200);

    expect(res.body).toHaveProperty('message');
    const newCookies: string[] = res.headers['set-cookie'] as unknown as string[];
    expect(newCookies.join('; ')).toContain('access_token=');
    expect(newCookies.join('; ')).toContain('refresh_token=');
  });

  it('POST /auth/refresh - 이미 사용된(rotation) refresh_token → 401', async () => {
    const email = `rotation-${Date.now()}@example.com`;
    const registerRes = await registerUser(email);
    const cookies: string[] = registerRes.headers['set-cookie'] as unknown as string[];
    const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));

    // 첫 번째 사용 (rotate됨)
    await request(context.app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie!)
      .expect(200);

    // 두 번째 사용 → 401
    await request(context.app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie!)
      .expect(401);
  });

  it('POST /auth/refresh - refresh_token 없음 → 401', async () => {
    await request(context.app.getHttpServer())
      .post('/auth/refresh')
      .expect(401);
  });

  it('POST /auth/logout - 로그아웃 후 refresh_token으로 refresh 시도 → 401', async () => {
    const email = `logout-${Date.now()}@example.com`;
    const registerRes = await registerUser(email);
    const cookies: string[] = registerRes.headers['set-cookie'] as unknown as string[];
    const accessCookie = cookies.find((c) => c.startsWith('access_token='));
    const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));

    // 로그아웃
    await request(context.app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', [accessCookie!, refreshCookie!].join('; '))
      .expect(204);

    // refresh 시도 → 401
    await request(context.app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', refreshCookie!)
      .expect(401);
  });

  it('GET /auth/me - access_token 쿠키로 인증 성공', async () => {
    const email = `me-${Date.now()}@example.com`;
    const registerRes = await registerUser(email);
    const cookies: string[] = registerRes.headers['set-cookie'] as unknown as string[];
    const accessCookie = cookies.find((c) => c.startsWith('access_token='));

    const res = await request(context.app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', accessCookie!)
      .expect(200);

    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(email);
  });
});
