import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp, cleanupDatabase } from '../setup/test-setup';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/auth/change-password - 비밀번호 변경 API', () => {
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

  it('PATCH /auth/change-password - 인증 없이 호출 시 401', () => {
    return request(context.app.getHttpServer())
      .patch('/auth/change-password')
      .send({
        currentPassword: 'password123',
        newPassword: 'newPassword456',
        confirmPassword: 'newPassword456',
      })
      .expect(401);
  });

  it('PATCH /auth/change-password - 현재 비밀번호 불일치 시 401', async () => {
    const user = await context.testHelper.createUser('Change Password User');

    return request(context.app.getHttpServer())
      .patch('/auth/change-password')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        currentPassword: 'wrongPassword999',
        newPassword: 'newPassword456',
        confirmPassword: 'newPassword456',
      })
      .expect(401);
  });

  it('PATCH /auth/change-password - newPassword !== confirmPassword 시 400', async () => {
    const user = await context.testHelper.createUser('Change Password User2');

    return request(context.app.getHttpServer())
      .patch('/auth/change-password')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        currentPassword: 'password123',
        newPassword: 'newPassword456',
        confirmPassword: 'differentPassword789',
      })
      .expect(400);
  });

  it('PATCH /auth/change-password - 비밀번호 8자 미만 시 400', async () => {
    const user = await context.testHelper.createUser('Change Password User3');

    return request(context.app.getHttpServer())
      .patch('/auth/change-password')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        currentPassword: 'password123',
        newPassword: 'abc1',
        confirmPassword: 'abc1',
      })
      .expect(400);
  });

  it('PATCH /auth/change-password - 영문 미포함 비밀번호 시 400', async () => {
    const user = await context.testHelper.createUser('Change Password User4');

    return request(context.app.getHttpServer())
      .patch('/auth/change-password')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        currentPassword: 'password123',
        newPassword: '12345678',
        confirmPassword: '12345678',
      })
      .expect(400);
  });

  it('PATCH /auth/change-password - 숫자 미포함 비밀번호 시 400', async () => {
    const user = await context.testHelper.createUser('Change Password User5');

    return request(context.app.getHttpServer())
      .patch('/auth/change-password')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        currentPassword: 'password123',
        newPassword: 'abcdefgh',
        confirmPassword: 'abcdefgh',
      })
      .expect(400);
  });

  it('PATCH /auth/change-password - 정상 변경 후 200 및 새 비밀번호로 로그인 성공', async () => {
    const uniqueEmail = context.testHelper.generateUniqueEmail('change-pw');
    const user = await context.testHelper.createUser('Change Password Success', uniqueEmail, 'password123');

    await request(context.app.getHttpServer())
      .patch('/auth/change-password')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        currentPassword: 'password123',
        newPassword: 'newPassword456',
        confirmPassword: 'newPassword456',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('message');
      });

    // 새 비밀번호로 로그인 성공 확인
    return request(context.app.getHttpServer())
      .post('/auth/login')
      .send({
        email: uniqueEmail,
        password: 'newPassword456',
      })
      .expect(201);
  });

  it('PATCH /auth/change-password - 변경 후 이전 비밀번호로 로그인 실패', async () => {
    const uniqueEmail = context.testHelper.generateUniqueEmail('change-pw-old');
    const user = await context.testHelper.createUser('Change Password Old', uniqueEmail, 'password123');

    await request(context.app.getHttpServer())
      .patch('/auth/change-password')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        currentPassword: 'password123',
        newPassword: 'newPassword456',
        confirmPassword: 'newPassword456',
      })
      .expect(200);

    // 이전 비밀번호로 로그인 실패 확인
    return request(context.app.getHttpServer())
      .post('/auth/login')
      .send({
        email: uniqueEmail,
        password: 'password123',
      })
      .expect(401);
  });
});
