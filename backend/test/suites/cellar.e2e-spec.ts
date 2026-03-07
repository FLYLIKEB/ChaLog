import { TestContext, setupTestApp, teardownTestApp } from '../setup/test-setup';
import { TestUser, TestTea } from '../helpers/test-helper';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/cellar - 셀러 (인벤토리) API', () => {
  let context: TestContext;
  let testUser: TestUser;
  let testTea: TestTea;

  beforeAll(async () => {
    context = await setupTestApp();

    testUser = await context.testHelper.createUser('Cellar Test User');
    testTea = await context.testHelper.createTea(testUser.token, {
      name: '셀러 테스트 차',
      year: 2022,
      type: '보이차',
    });
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await context.dataSource.query('DELETE FROM cellar_items');
    await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  afterAll(async () => {
    try {
      if (testTea?.id) {
        await context.dataSource.query('DELETE FROM teas WHERE id = ?', [testTea.id]);
      }
      if (testUser?.id) {
        await context.dataSource.query('DELETE FROM users WHERE id = ?', [testUser.id]);
      }
    } catch (error) {
      console.warn('테스트 데이터 정리 중 오류 (무시 가능):', error.message);
    }
    await teardownTestApp(context);
  });

  it('POST /cellar - 셀러 아이템 생성 성공', async () => {
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({
        teaId: testTea.id,
        quantity: 150,
        unit: 'g',
        memo: '첫 번째 셀러 아이템',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.teaId).toBe(testTea.id);
    expect(Number(response.body.quantity)).toBe(150);
    expect(response.body.unit).toBe('g');
    expect(response.body.memo).toBe('첫 번째 셀러 아이템');
    expect(response.body.tea).toBeDefined();
    expect(response.body.tea.name).toBe('셀러 테스트 차');
  });

  it('POST /cellar - 인증 없이 생성 실패', async () => {
    return context.testHelper.unauthenticatedRequest()
      .post('/cellar')
      .send({ teaId: testTea.id })
      .expect(401);
  });

  it('POST /cellar - 존재하지 않는 teaId로 생성 실패', async () => {
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: 999999 })
      .expect(404);

    expect(response.body).toHaveProperty('message');
  });

  it('GET /cellar - 목록 조회 (본인 아이템만)', async () => {
    await context.testHelper.authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 100, unit: 'g' })
      .expect(201);

    const otherUser = await context.testHelper.createUser('Other Cellar User');
    await context.testHelper.authenticatedRequest(otherUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 200, unit: 'g' })
      .expect(201);

    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .get('/cellar')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(Number(response.body[0].quantity)).toBe(100);

    await context.dataSource.query('DELETE FROM users WHERE id = ?', [otherUser.id]);
  });

  it('GET /cellar - 인증 없이 조회 실패', async () => {
    return context.testHelper.unauthenticatedRequest()
      .get('/cellar')
      .expect(401);
  });

  it('GET /cellar/reminders - 리마인더 조회', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    await context.testHelper.authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 50, remindAt: yesterdayStr })
      .expect(201);

    await context.testHelper.authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 80, remindAt: futureDateStr })
      .expect(201);

    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .get('/cellar/reminders')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(Number(response.body[0].quantity)).toBe(50);
  });

  it('GET /cellar/:id - 단건 조회', async () => {
    const created = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 70, unit: 'bag' })
      .expect(201);

    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .get(`/cellar/${created.body.id}`)
      .expect(200);

    expect(response.body.id).toBe(created.body.id);
    expect(response.body.unit).toBe('bag');
  });

  it('GET /cellar/:id - 다른 사용자의 아이템 접근 실패', async () => {
    const created = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 70 })
      .expect(201);

    const otherUser = await context.testHelper.createUser('Other Access User');

    const response = await context.testHelper.authenticatedRequest(otherUser.token)
      .get(`/cellar/${created.body.id}`)
      .expect(403);

    expect(response.body.statusCode).toBe(403);

    await context.dataSource.query('DELETE FROM users WHERE id = ?', [otherUser.id]);
  });

  it('PATCH /cellar/:id - 아이템 수정 성공', async () => {
    const created = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 100, unit: 'g', memo: '원본' })
      .expect(201);

    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .patch(`/cellar/${created.body.id}`)
      .send({ quantity: 50, memo: '반쯤 마심' })
      .expect(200);

    expect(Number(response.body.quantity)).toBe(50);
    expect(response.body.memo).toBe('반쯤 마심');
  });

  it('PATCH /cellar/:id - 다른 사용자의 아이템 수정 실패', async () => {
    const created = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 100 })
      .expect(201);

    const otherUser = await context.testHelper.createUser('Other Patch User');

    const response = await context.testHelper.authenticatedRequest(otherUser.token)
      .patch(`/cellar/${created.body.id}`)
      .send({ quantity: 1 })
      .expect(403);

    expect(response.body.statusCode).toBe(403);

    await context.dataSource.query('DELETE FROM users WHERE id = ?', [otherUser.id]);
  });

  it('DELETE /cellar/:id - 아이템 삭제 성공', async () => {
    const created = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 100 })
      .expect(201);

    await context.testHelper.authenticatedRequest(testUser.token)
      .delete(`/cellar/${created.body.id}`)
      .expect(200);

    await context.testHelper.authenticatedRequest(testUser.token)
      .get(`/cellar/${created.body.id}`)
      .expect(404);
  });

  it('DELETE /cellar/:id - 다른 사용자의 아이템 삭제 실패', async () => {
    const created = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 100 })
      .expect(201);

    const otherUser = await context.testHelper.createUser('Other Delete User');

    const response = await context.testHelper.authenticatedRequest(otherUser.token)
      .delete(`/cellar/${created.body.id}`)
      .expect(403);

    expect(response.body.statusCode).toBe(403);

    await context.dataSource.query('DELETE FROM users WHERE id = ?', [otherUser.id]);
  });

  it('DELETE /cellar/:id - 인증 없이 삭제 실패', async () => {
    const created = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 100 })
      .expect(201);

    return context.testHelper.unauthenticatedRequest()
      .delete(`/cellar/${created.body.id}`)
      .expect(401);
  });
});
