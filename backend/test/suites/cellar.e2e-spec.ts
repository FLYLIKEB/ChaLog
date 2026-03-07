import { DataSource } from 'typeorm';
import { TestContext, setupTestApp, teardownTestApp } from '../setup/test-setup';
import { TestUser, TestTea } from '../helpers/test-helper';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/cellar - 셀러 CRUD API', () => {
  let context: TestContext;
  let testUser: TestUser;
  let testTea: TestTea;

  beforeAll(async () => {
    context = await setupTestApp();
    testUser = await context.testHelper.createUser('Cellar Test User');
    testTea = await context.testHelper.createTea(testUser.token, {
      name: '셀러 테스트 차',
      type: '녹차',
    });
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await context.dataSource.query('DELETE FROM cellar_items');
    await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  afterAll(async () => {
    try {
      await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await context.dataSource.query('DELETE FROM cellar_items');
      if (testTea?.id) {
        await context.dataSource.query('DELETE FROM teas WHERE id = ?', [testTea.id]);
      }
      if (testUser?.id) {
        await context.dataSource.query('DELETE FROM users WHERE id = ?', [testUser.id]);
      }
      await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (error) {
      console.warn('셀러 테스트 데이터 정리 중 오류 (무시 가능):', error.message);
    }
    await teardownTestApp(context);
  });

  it('POST /cellar - 셀러 아이템 생성 성공', async () => {
    const response = await context.testHelper
      .authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({
        teaId: testTea.id,
        quantity: 100,
        unit: 'g',
        memo: '테스트 메모',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.teaId).toBe(testTea.id);
    expect(Number(response.body.quantity)).toBe(100);
    expect(response.body.unit).toBe('g');
    expect(response.body.memo).toBe('테스트 메모');
    expect(response.body.tea).toBeDefined();
    expect(response.body.tea.name).toBe(testTea.name);
  });

  it('POST /cellar - 인증 없이 생성 실패 (401)', async () => {
    await context.testHelper
      .unauthenticatedRequest()
      .post('/cellar')
      .send({ teaId: testTea.id })
      .expect(401);
  });

  it('POST /cellar - 존재하지 않는 teaId로 생성 실패 (404)', async () => {
    await context.testHelper
      .authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: 99999 })
      .expect(404);
  });

  it('GET /cellar - 목록 조회 (내 것만)', async () => {
    // 아이템 생성
    const createRes = await context.testHelper
      .authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 50, unit: 'g' })
      .expect(201);

    // 다른 사용자 생성 후 아이템 생성
    const otherUser = await context.testHelper.createUser('Cellar Other User');
    await context.testHelper
      .authenticatedRequest(otherUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 200, unit: 'ml' })
      .expect(201);

    // 내 목록 조회
    const response = await context.testHelper
      .authenticatedRequest(testUser.token)
      .get('/cellar')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0].id).toBe(createRes.body.id);

    // 다른 사용자 정리
    await context.dataSource.query('DELETE FROM users WHERE id = ?', [otherUser.id]);
  });

  it('GET /cellar - 인증 없이 조회 실패 (401)', async () => {
    await context.testHelper
      .unauthenticatedRequest()
      .get('/cellar')
      .expect(401);
  });

  it('GET /cellar/reminders - remindAt 도래한 아이템 조회', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await context.testHelper
      .authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 10, remindAt: pastDate })
      .expect(201);

    await context.testHelper
      .authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 20, remindAt: futureDate })
      .expect(201);

    const response = await context.testHelper
      .authenticatedRequest(testUser.token)
      .get('/cellar/reminders')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(Number(response.body[0].quantity)).toBe(10);
  });

  it('GET /cellar/:id - 단건 조회 성공', async () => {
    const createRes = await context.testHelper
      .authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 75, unit: 'bag' })
      .expect(201);

    const response = await context.testHelper
      .authenticatedRequest(testUser.token)
      .get(`/cellar/${createRes.body.id}`)
      .expect(200);

    expect(response.body.id).toBe(createRes.body.id);
    expect(response.body.unit).toBe('bag');
  });

  it('GET /cellar/:id - 다른 사용자의 아이템 조회 실패 (403)', async () => {
    const createRes = await context.testHelper
      .authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 50 })
      .expect(201);

    const otherUser = await context.testHelper.createUser('Cellar Other User 2');

    await context.testHelper
      .authenticatedRequest(otherUser.token)
      .get(`/cellar/${createRes.body.id}`)
      .expect(403);

    await context.dataSource.query('DELETE FROM users WHERE id = ?', [otherUser.id]);
  });

  it('PATCH /cellar/:id - 수정 성공', async () => {
    const createRes = await context.testHelper
      .authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 100, unit: 'g' })
      .expect(201);

    const response = await context.testHelper
      .authenticatedRequest(testUser.token)
      .patch(`/cellar/${createRes.body.id}`)
      .send({ quantity: 50, memo: '수정된 메모' })
      .expect(200);

    expect(Number(response.body.quantity)).toBe(50);
    expect(response.body.memo).toBe('수정된 메모');
  });

  it('PATCH /cellar/:id - 다른 사용자의 아이템 수정 실패 (403)', async () => {
    const createRes = await context.testHelper
      .authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 100 })
      .expect(201);

    const otherUser = await context.testHelper.createUser('Cellar Other User 3');

    await context.testHelper
      .authenticatedRequest(otherUser.token)
      .patch(`/cellar/${createRes.body.id}`)
      .send({ quantity: 1 })
      .expect(403);

    await context.dataSource.query('DELETE FROM users WHERE id = ?', [otherUser.id]);
  });

  it('DELETE /cellar/:id - 삭제 성공', async () => {
    const createRes = await context.testHelper
      .authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 30 })
      .expect(201);

    await context.testHelper
      .authenticatedRequest(testUser.token)
      .delete(`/cellar/${createRes.body.id}`)
      .expect(200);

    // 삭제 후 단건 조회 → 404
    await context.testHelper
      .authenticatedRequest(testUser.token)
      .get(`/cellar/${createRes.body.id}`)
      .expect(404);
  });

  it('DELETE /cellar/:id - 다른 사용자의 아이템 삭제 실패 (403)', async () => {
    const createRes = await context.testHelper
      .authenticatedRequest(testUser.token)
      .post('/cellar')
      .send({ teaId: testTea.id, quantity: 30 })
      .expect(201);

    const otherUser = await context.testHelper.createUser('Cellar Other User 4');

    await context.testHelper
      .authenticatedRequest(otherUser.token)
      .delete(`/cellar/${createRes.body.id}`)
      .expect(403);

    await context.dataSource.query('DELETE FROM users WHERE id = ?', [otherUser.id]);
  });
});
