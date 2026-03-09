import { DataSource } from 'typeorm';
import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp, cleanupDatabase, ensureDefaultSchema } from '../setup/test-setup';
import { TestUser } from '../helpers/test-helper';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/admin - 마스터 데이터 CRUD API', () => {
  let context: TestContext;
  let adminUser: TestUser;

  beforeAll(async () => {
    context = await setupTestApp();
    await ensureDefaultSchema(context.dataSource);

    // Admin 사용자 생성: 일반 사용자 생성 후 role을 admin으로 변경
    adminUser = await context.testHelper.createUser('Admin User');
    await context.dataSource.query(
      `UPDATE users SET role = 'admin' WHERE id = ?`,
      [adminUser.id],
    );
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await cleanupDatabase(context.dataSource);
    // Admin 사용자 재생성
    adminUser = await context.testHelper.createUser('Admin User');
    await context.dataSource.query(
      `UPDATE users SET role = 'admin' WHERE id = ?`,
      [adminUser.id],
    );
  });

  afterAll(async () => {
    await teardownTestApp(context);
  });

  it('POST /admin/teas - 차 생성', async () => {
    let sellerId: number;
    const sellersRes = await request(context.app.getHttpServer())
      .get('/admin/sellers?limit=100')
      .set('Authorization', `Bearer ${adminUser.token}`)
      .expect(200);
    const existing = sellersRes.body.items?.find((s: any) => s.name === '차향');
    if (existing) {
      sellerId = existing.id;
    } else {
      const sellerRes = await request(context.app.getHttpServer())
        .post('/admin/sellers')
        .set('Authorization', `Bearer ${adminUser.token}`)
        .send({ name: '차향' })
        .expect(201);
      sellerId = sellerRes.body.id;
    }

    const res = await request(context.app.getHttpServer())
      .post('/admin/teas')
      .set('Authorization', `Bearer ${adminUser.token}`)
      .send({
        name: '정산소종',
        year: 2023,
        type: '녹차',
        sellerId,
        origin: '중국 푸젠',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('정산소종');
    expect(res.body.type).toBe('녹차');
    expect(res.body.seller).toBe('차향');
  });

  it('POST /admin/sellers - 찻집 생성', async () => {
    const res = await request(context.app.getHttpServer())
      .post('/admin/sellers')
      .set('Authorization', `Bearer ${adminUser.token}`)
      .send({
        name: '테스트 찻집',
        address: '서울시 강남구',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('테스트 찻집');
    expect(res.body.address).toBe('서울시 강남구');
  });

  it('POST /admin/tags - 태그 생성', async () => {
    const res = await request(context.app.getHttpServer())
      .post('/admin/tags')
      .set('Authorization', `Bearer ${adminUser.token}`)
      .send({ name: '달콤함' })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('달콤함');
  });

  it('PATCH /admin/users/:id - 사용자 프로필 수정', async () => {
    const targetUser = await context.testHelper.createUser('Target User');

    const res = await request(context.app.getHttpServer())
      .patch(`/admin/users/${targetUser.id}`)
      .set('Authorization', `Bearer ${adminUser.token}`)
      .send({
        name: '수정된 이름',
        bio: '수정된 소개',
      })
      .expect(200);

    expect(res.body.name).toBe('수정된 이름');
    expect(res.body.bio).toBe('수정된 소개');
  });
});
