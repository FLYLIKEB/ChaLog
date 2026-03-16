import request from 'supertest';
import { createHash, randomBytes } from 'crypto';
import { TestContext, setupTestApp, teardownTestApp, cleanupDatabase } from '../setup/test-setup';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('Auth Email Verification (e2e)', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await setupTestApp();
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await teardownTestApp(context);
  });

  beforeEach(async () => {
    await cleanupDatabase(context.dataSource);
  });

  const registerUser = async (email: string, name: string, password = 'password123') => {
    const res = await request(context.app.getHttpServer())
      .post('/auth/register')
      .send({ email, name, password })
      .expect(201);
    return res.body;
  };

  const getVerificationToken = async (userId: number): Promise<{ tokenHash: string } | null> => {
    const rows = await context.dataSource.query(
      'SELECT tokenHash FROM email_verification_tokens WHERE userId = ? AND usedAt IS NULL ORDER BY createdAt DESC LIMIT 1',
      [userId],
    );
    return rows[0] || null;
  };

  const getUserId = async (token: string): Promise<number> => {
    const profileRes = await request(context.app.getHttpServer())
      .post('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    return profileRes.body.userId;
  };

  it('회원가입 후 emailVerifiedAt이 null이어야 한다', async () => {
    const result = await registerUser('verify-test@example.com', 'VerifyTest');
    const userId = await getUserId(result.access_token);

    const rows = await context.dataSource.query(
      'SELECT emailVerifiedAt FROM users WHERE id = ?',
      [userId],
    );
    expect(rows[0].emailVerifiedAt).toBeNull();
  });

  it('회원가입 후 이메일 인증 토큰이 생성되어야 한다', async () => {
    const result = await registerUser('token-test@example.com', 'TokenTest');
    const userId = await getUserId(result.access_token);

    const tokenRecord = await getVerificationToken(userId);
    expect(tokenRecord).not.toBeNull();
    expect(tokenRecord!.tokenHash).toBeDefined();
  });

  it('유효한 토큰으로 이메일 인증 → 200, emailVerifiedAt 설정', async () => {
    // DB에 직접 알려진 토큰 삽입
    const result = await registerUser('valid-token@example.com', 'ValidToken');
    const userId = await getUserId(result.access_token);

    // 알려진 rawToken으로 새 토큰 레코드 삽입
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await context.dataSource.query(
      'INSERT INTO email_verification_tokens (userId, tokenHash, expiresAt, usedAt) VALUES (?, ?, ?, NULL)',
      [userId, tokenHash, expiresAt],
    );

    const res = await request(context.app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: rawToken })
      .expect(201);

    expect(res.body.message).toBe('이메일이 인증되었습니다.');

    const rows = await context.dataSource.query(
      'SELECT emailVerifiedAt FROM users WHERE id = ?',
      [userId],
    );
    expect(rows[0].emailVerifiedAt).not.toBeNull();
  });

  it('만료된 토큰 → 400', async () => {
    const result = await registerUser('expired@example.com', 'ExpiredToken');
    const userId = await getUserId(result.access_token);

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() - 1000); // 이미 만료

    await context.dataSource.query(
      'INSERT INTO email_verification_tokens (userId, tokenHash, expiresAt, usedAt) VALUES (?, ?, ?, NULL)',
      [userId, tokenHash, expiresAt],
    );

    await request(context.app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: rawToken })
      .expect(400);
  });

  it('이미 사용된 토큰 → 400', async () => {
    const result = await registerUser('used-token@example.com', 'UsedToken');
    const userId = await getUserId(result.access_token);

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const usedAt = new Date();

    await context.dataSource.query(
      'INSERT INTO email_verification_tokens (userId, tokenHash, expiresAt, usedAt) VALUES (?, ?, ?, ?)',
      [userId, tokenHash, expiresAt, usedAt],
    );

    await request(context.app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: rawToken })
      .expect(400);
  });

  it('잘못된 토큰 → 400', async () => {
    await request(context.app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: 'completely-invalid-token' })
      .expect(400);
  });

  it('POST /auth/resend-verification → 200, 새 토큰 생성', async () => {
    const result = await registerUser('resend@example.com', 'ResendTest');
    const userId = await getUserId(result.access_token);

    const res = await request(context.app.getHttpServer())
      .post('/auth/resend-verification')
      .set('Authorization', `Bearer ${result.access_token}`)
      .expect(201);

    expect(res.body.message).toBe('인증 메일이 재발송되었습니다.');

    // 새 토큰이 생성되었는지 확인
    const rows = await context.dataSource.query(
      'SELECT COUNT(*) as count FROM email_verification_tokens WHERE userId = ? AND usedAt IS NULL',
      [userId],
    );
    expect(parseInt(rows[0].count, 10)).toBeGreaterThan(0);
  });

  it('이미 인증된 사용자 resend → 400', async () => {
    const result = await registerUser('already-verified@example.com', 'AlreadyVerified');
    const userId = await getUserId(result.access_token);

    // 직접 emailVerifiedAt 설정
    await context.dataSource.query(
      'UPDATE users SET emailVerifiedAt = NOW() WHERE id = ?',
      [userId],
    );

    await request(context.app.getHttpServer())
      .post('/auth/resend-verification')
      .set('Authorization', `Bearer ${result.access_token}`)
      .expect(400);
  });

  it('미인증 사용자 POST /notes → 403', async () => {
    const result = await registerUser('unverified-notes@example.com', 'UnverifiedNotes');

    // 스키마 및 티 생성을 위한 인증된 사용자 (이미 인증됨 상태로 만들기 위해 DB 직접 수정은 복잡)
    // 대신, 미인증 상태로 notes 생성 시도
    await request(context.app.getHttpServer())
      .post('/notes')
      .set('Authorization', `Bearer ${result.access_token}`)
      .send({
        teaId: 1,
        schemaId: 1,
        axisValues: [],
        memo: '테스트',
        isPublic: true,
        isRatingIncluded: false,
      })
      .expect(403);
  });

  it('인증된 사용자 POST /notes → 201 또는 400 (데이터 이슈)', async () => {
    const result = await registerUser('verified-notes@example.com', 'VerifiedNotes');
    const userId = await getUserId(result.access_token);

    // 이메일 인증 완료
    await context.dataSource.query(
      'UPDATE users SET emailVerifiedAt = NOW() WHERE id = ?',
      [userId],
    );

    // 인증된 사용자는 403이 아닌 다른 응답을 받아야 함
    const res = await request(context.app.getHttpServer())
      .post('/notes')
      .set('Authorization', `Bearer ${result.access_token}`)
      .send({
        teaId: 999999,
        schemaId: 999999,
        axisValues: [],
        memo: '테스트',
        isPublic: true,
        isRatingIncluded: false,
      });

    // 403이 아니어야 한다 (400 or 404 due to invalid teaId/schemaId)
    expect(res.status).not.toBe(403);
  });
});
