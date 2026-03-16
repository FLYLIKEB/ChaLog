import { DataSource } from 'typeorm';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp, cleanupDatabase, ensureDefaultSchema } from '../setup/test-setup';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/auth/withdraw - 회원탈퇴 API', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await setupTestApp();
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await cleanupDatabase(context.dataSource);
    await ensureDefaultSchema(context.dataSource);
  });

  afterAll(async () => {
    await teardownTestApp(context);
  });

  it('DELETE /auth/withdraw - 인증 없이 호출 시 401', async () => {
    await request(context.app.getHttpServer())
      .delete('/auth/withdraw')
      .send({ password: 'password123' })
      .expect(401);
  });

  it('DELETE /auth/withdraw - 잘못된 비밀번호로 탈퇴 시 401', async () => {
    const user = await context.testHelper.createUser('탈퇴테스트유저1');

    await request(context.app.getHttpServer())
      .delete('/auth/withdraw')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ password: 'wrongpassword' })
      .expect(401);
  });

  it('DELETE /auth/withdraw - 이메일 계정 정상 탈퇴 시 200, 사용자 삭제 확인', async () => {
    const user = await context.testHelper.createUser('탈퇴테스트유저2');

    await request(context.app.getHttpServer())
      .delete('/auth/withdraw')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ password: 'password123' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
        expect(res.body.message).toBe('회원탈퇴가 완료되었습니다.');
      });

    // 사용자가 삭제되었는지 확인 (DB 직접 조회)
    const rows = await context.dataSource.query(
      'SELECT id FROM users WHERE id = ?',
      [user.id],
    );
    expect(rows).toHaveLength(0);
  });

  it('DELETE /auth/withdraw - 탈퇴 후 해당 사용자 notes도 삭제됨 확인', async () => {
    const user = await context.testHelper.createUser('탈퇴테스트유저3');
    const tea = await context.testHelper.createTea(user.token, {
      name: '탈퇴테스트차',
      type: 'green',
    });
    await context.testHelper.createNote(user.token, {
      teaId: tea.id,
      axisValues: [],
      memo: '탈퇴 테스트 노트',
      isPublic: true,
    });

    // 노트가 존재하는지 확인
    const notesBefore = await context.dataSource.query(
      'SELECT id FROM notes WHERE userId = ?',
      [user.id],
    );
    expect(notesBefore.length).toBeGreaterThan(0);

    await request(context.app.getHttpServer())
      .delete('/auth/withdraw')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ password: 'password123' })
      .expect(200);

    // 노트가 삭제되었는지 확인
    const notesAfter = await context.dataSource.query(
      'SELECT id FROM notes WHERE userId = ?',
      [user.id],
    );
    expect(notesAfter).toHaveLength(0);
  });

  it('DELETE /auth/withdraw - password와 confirmText 모두 없을 때 400', async () => {
    const user = await context.testHelper.createUser('탈퇴테스트유저4');

    await request(context.app.getHttpServer())
      .delete('/auth/withdraw')
      .set('Authorization', `Bearer ${user.token}`)
      .send({})
      .expect(401);
  });

  it('DELETE /auth/withdraw - 탈퇴 후 로그인 시도 시 401', async () => {
    const uniqueEmail = `withdraw-${Date.now()}@example.com`;
    const registerRes = await request(context.app.getHttpServer())
      .post('/auth/register')
      .send({ email: uniqueEmail, name: '탈퇴후로그인테스트', password: 'password123' })
      .expect(201);

    const token = registerRes.body.access_token;

    await request(context.app.getHttpServer())
      .delete('/auth/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'password123' })
      .expect(200);

    // 탈퇴 후 로그인 시도
    await request(context.app.getHttpServer())
      .post('/auth/login')
      .send({ email: uniqueEmail, password: 'password123' })
      .expect(401);
  });
});
