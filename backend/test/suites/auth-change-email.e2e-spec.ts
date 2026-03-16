import request from 'supertest';
import { createHash, randomBytes } from 'crypto';
import { TestContext, setupTestApp, teardownTestApp, cleanupDatabase } from '../setup/test-setup';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/auth/change-email - 이메일 변경 API', () => {
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

  describe('POST /auth/change-email/request', () => {
    it('인증 없이 요청 시 401', () => {
      return request(context.app.getHttpServer())
        .post('/auth/change-email/request')
        .send({ newEmail: 'new@example.com' })
        .expect(401);
    });

    it('이미 등록된 이메일로 변경 요청 시 409', async () => {
      const user1 = await context.testHelper.createUser('User One');
      const existingEmail = context.testHelper.generateUniqueEmail('existing');
      await context.testHelper.createUser('User Two', existingEmail);

      return request(context.app.getHttpServer())
        .post('/auth/change-email/request')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ newEmail: existingEmail })
        .expect(409);
    });

    it('정상 요청 시 200 반환', async () => {
      const user = await context.testHelper.createUser('Email Change User');
      const newEmail = context.testHelper.generateUniqueEmail('newemail');

      return request(context.app.getHttpServer())
        .post('/auth/change-email/request')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ newEmail })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('정상 요청 시 email_change_tokens 레코드 생성', async () => {
      const user = await context.testHelper.createUser('Email Change Token User');
      const newEmail = context.testHelper.generateUniqueEmail('tokencheck');

      await request(context.app.getHttpServer())
        .post('/auth/change-email/request')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ newEmail })
        .expect(200);

      const tokens = await context.dataSource.query(
        'SELECT * FROM email_change_tokens WHERE userId = ?',
        [user.id],
      );
      expect(tokens.length).toBe(1);
      expect(tokens[0].newEmail).toBe(newEmail);
    });

    it('OAuth 전용 계정(이메일 인증 없음)은 400', async () => {
      // OAuth 전용 사용자 직접 생성 (email auth 없이)
      await context.dataSource.query(
        "INSERT INTO users (name, role, isProfilePublic) VALUES ('OAuth User', 'user', 1)",
      );
      const [oauthUser] = await context.dataSource.query(
        "SELECT id FROM users WHERE name = 'OAuth User' ORDER BY id DESC LIMIT 1",
      );
      await context.dataSource.query(
        "INSERT INTO user_authentications (userId, provider, providerId) VALUES (?, 'kakao', 'kakao-oauth-only-id')",
        [oauthUser.id],
      );

      // OAuth 유저용 JWT 발급
      const tokenRes = await request(context.app.getHttpServer())
        .post('/auth/kakao')
        .send({ accessToken: 'INVALID_TOKEN_THAT_WILL_FAIL' });
      // kakao login will fail; use a direct DB approach instead
      // We simulate by checking what happens when user has no EMAIL auth
      // We'll use the register flow to create a regular user, then delete email auth
      const regularUser = await context.testHelper.createUser('Regular For OAuth Test');
      await context.dataSource.query(
        "DELETE FROM user_authentications WHERE userId = ? AND provider = 'email'",
        [regularUser.id],
      );

      return request(context.app.getHttpServer())
        .post('/auth/change-email/request')
        .set('Authorization', `Bearer ${regularUser.token}`)
        .send({ newEmail: context.testHelper.generateUniqueEmail('oauth-target') })
        .expect(400);
    });
  });

  describe('POST /auth/change-email/confirm', () => {
    it('인증 없이 요청 시 401', () => {
      return request(context.app.getHttpServer())
        .post('/auth/change-email/confirm')
        .send({ token: 'sometoken' })
        .expect(401);
    });

    it('유효 토큰으로 확인 시 200 및 이메일 변경 확인', async () => {
      const originalEmail = context.testHelper.generateUniqueEmail('original');
      const user = await context.testHelper.createUser('Confirm Email User', originalEmail);
      const newEmail = context.testHelper.generateUniqueEmail('confirmed');

      // request change email
      await request(context.app.getHttpServer())
        .post('/auth/change-email/request')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ newEmail })
        .expect(200);

      // Get the token hash from DB, derive rawToken by inserting a known one
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      // Invalidate any existing token and insert known one
      await context.dataSource.query(
        'DELETE FROM email_change_tokens WHERE userId = ?',
        [user.id],
      );
      await context.dataSource.query(
        'INSERT INTO email_change_tokens (userId, tokenHash, newEmail, expiresAt, usedAt) VALUES (?, ?, ?, ?, NULL)',
        [user.id, tokenHash, newEmail, expiresAt],
      );

      await request(context.app.getHttpServer())
        .post('/auth/change-email/confirm')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ token: rawToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });

      // Verify email changed in user_authentications
      const auth = await context.dataSource.query(
        "SELECT * FROM user_authentications WHERE userId = ? AND provider = 'email'",
        [user.id],
      );
      expect(auth[0].providerId).toBe(newEmail);
    });

    it('만료된 토큰 → 400', async () => {
      const user = await context.testHelper.createUser('Expired Token User');
      const newEmail = context.testHelper.generateUniqueEmail('expired');
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiredAt = new Date(Date.now() - 60 * 1000); // 1분 전 만료

      await context.dataSource.query(
        'INSERT INTO email_change_tokens (userId, tokenHash, newEmail, expiresAt, usedAt) VALUES (?, ?, ?, ?, NULL)',
        [user.id, tokenHash, newEmail, expiredAt],
      );

      return request(context.app.getHttpServer())
        .post('/auth/change-email/confirm')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ token: rawToken })
        .expect(400);
    });

    it('이미 사용된 토큰 → 400', async () => {
      const user = await context.testHelper.createUser('Used Token User');
      const newEmail = context.testHelper.generateUniqueEmail('used');
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      const usedAt = new Date();

      await context.dataSource.query(
        'INSERT INTO email_change_tokens (userId, tokenHash, newEmail, expiresAt, usedAt) VALUES (?, ?, ?, ?, ?)',
        [user.id, tokenHash, newEmail, expiresAt, usedAt],
      );

      return request(context.app.getHttpServer())
        .post('/auth/change-email/confirm')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ token: rawToken })
        .expect(400);
    });

    it('변경 후 새 이메일로 로그인 가능', async () => {
      const originalEmail = context.testHelper.generateUniqueEmail('login-original');
      const user = await context.testHelper.createUser('Login After Change User', originalEmail);
      const newEmail = context.testHelper.generateUniqueEmail('login-new');

      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await context.dataSource.query(
        'INSERT INTO email_change_tokens (userId, tokenHash, newEmail, expiresAt, usedAt) VALUES (?, ?, ?, ?, NULL)',
        [user.id, tokenHash, newEmail, expiresAt],
      );

      await request(context.app.getHttpServer())
        .post('/auth/change-email/confirm')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ token: rawToken })
        .expect(200);

      // New email login should succeed
      return request(context.app.getHttpServer())
        .post('/auth/login')
        .send({ email: newEmail, password: 'password123' })
        .expect(201);
    });
  });
});
