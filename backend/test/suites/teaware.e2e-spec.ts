import { TestContext, setupTestApp, teardownTestApp } from '../setup/test-setup';
import { TestUser } from '../helpers/test-helper';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/teaware - 다구 관리 API', () => {
  let context: TestContext;
  let testUser: TestUser;
  let teawareId: number;

  beforeAll(async () => {
    context = await setupTestApp();
    testUser = await context.testHelper.createUser('Teaware Test User');
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await context.dataSource.query('DELETE FROM teaware');
    await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  afterAll(async () => {
    try {
      if (testUser?.id) {
        await context.dataSource.query('DELETE FROM users WHERE id = ?', [testUser.id]);
      }
    } catch (error) {
      console.warn('테스트 데이터 정리 중 오류 (무시 가능):', (error as Error).message);
    }
    await teardownTestApp(context);
  });

  it('POST /teaware - 다구 생성 성공', async () => {
    const teawareData = {
      name: '테스트 자사호',
      category: 'ZISHA_HU',
      capacity: 120,
      material: '자사',
      memo: '테스트용 자사호',
    };

    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/teaware')
      .send(teawareData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('테스트 자사호');
    expect(response.body.category).toBe('ZISHA_HU');
    expect(response.body.isPinned).toBe(false);
    teawareId = response.body.id;
  });

  it('GET /teaware - 다구 목록 조회 (본인 것만)', async () => {
    // 다구 생성
    await context.testHelper.authenticatedRequest(testUser.token)
      .post('/teaware')
      .send({ name: '개완 1', category: 'GAIWAN' })
      .expect(201);

    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .get('/teaware')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('userId', testUser.id);
  });

  it('PATCH /teaware/:id - 다구 수정', async () => {
    const createResponse = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/teaware')
      .send({ name: '수정 전 이름', category: 'GAIWAN' })
      .expect(201);

    const id = createResponse.body.id;

    const updateResponse = await context.testHelper.authenticatedRequest(testUser.token)
      .patch(`/teaware/${id}`)
      .send({ name: '수정 후 이름', capacity: 150 })
      .expect(200);

    expect(updateResponse.body.name).toBe('수정 후 이름');
    expect(parseFloat(updateResponse.body.capacity)).toBe(150);
  });

  it('DELETE /teaware/:id - 다구 삭제', async () => {
    const createResponse = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/teaware')
      .send({ name: '삭제할 다구', category: 'GAIWAN' })
      .expect(201);

    const id = createResponse.body.id;

    await context.testHelper.authenticatedRequest(testUser.token)
      .delete(`/teaware/${id}`)
      .expect(200);

    await context.testHelper.authenticatedRequest(testUser.token)
      .get(`/teaware/${id}`)
      .expect(404);
  });

  it('PATCH /teaware/:id/pin - 핀 설정 토글', async () => {
    const createResponse = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/teaware')
      .send({ name: '핀 테스트 다구', category: 'GAIWAN' })
      .expect(201);

    const id = createResponse.body.id;

    // 핀 설정
    const pinResponse = await context.testHelper.authenticatedRequest(testUser.token)
      .patch(`/teaware/${id}/pin`)
      .expect(200);

    expect(pinResponse.body.isPinned).toBe(true);

    // 핀 해제
    const unpinResponse = await context.testHelper.authenticatedRequest(testUser.token)
      .patch(`/teaware/${id}/pin`)
      .expect(200);

    expect(unpinResponse.body.isPinned).toBe(false);
  });

  it('GET /teaware - 비인증 접근 시 401', async () => {
    await context.testHelper.authenticatedRequest('')
      .get('/teaware')
      .expect(401);
  });

  it('다른 사용자의 다구에 접근/수정/삭제/핀 시 404', async () => {
    const userA = testUser;
    const userB = await context.testHelper.createUser('Teaware User B');

    const createResponse = await context.testHelper.authenticatedRequest(userA.token)
      .post('/teaware')
      .send({ name: '사용자A 전용 다구', category: 'GAIWAN' })
      .expect(201);

    const id = createResponse.body.id;

    await context.testHelper.authenticatedRequest(userB.token)
      .get(`/teaware/${id}`)
      .expect(404);

    await context.testHelper.authenticatedRequest(userB.token)
      .patch(`/teaware/${id}`)
      .send({ name: '탈취 시도' })
      .expect(404);

    await context.testHelper.authenticatedRequest(userB.token)
      .delete(`/teaware/${id}`)
      .expect(404);

    await context.testHelper.authenticatedRequest(userB.token)
      .patch(`/teaware/${id}/pin`)
      .expect(404);

    await context.dataSource.query('DELETE FROM users WHERE id = ?', [userB.id]);
  });
});
