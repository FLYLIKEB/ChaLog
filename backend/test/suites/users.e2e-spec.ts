import { DataSource } from 'typeorm';
import { TestContext, setupTestApp, teardownTestApp, ensureDefaultSchema, cleanupDatabase } from '../setup/test-setup';
import { TestUser } from '../helpers/test-helper';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/users/:id - 사용자 프로필 조회 API', () => {
  let context: TestContext;
  let testUser: TestUser;
  let otherTestUser: TestUser;

  beforeAll(async () => {
    context = await setupTestApp();
    // 기본 스키마 및 축 생성
    await ensureDefaultSchema(context.dataSource);
    
    // 테스트 헬퍼를 사용하여 사용자 2명 생성
    [testUser, otherTestUser] = await context.testHelper.createUsers(2, 'Profile Test User');
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    // 테스트 격리를 위해 각 테스트 전에 노트 관련 데이터 정리
    await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await context.dataSource.query('DELETE FROM note_bookmarks');
    await context.dataSource.query('DELETE FROM note_likes');
    await context.dataSource.query('DELETE FROM note_tags');
    await context.dataSource.query('DELETE FROM tags');
    await context.dataSource.query('DELETE FROM notes');
    await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  afterAll(async () => {
    await teardownTestApp(context);
  });

  it('GET /users/:id - 사용자 프로필 조회 성공', async () => {
    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/users/${testUser.id}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name');
    expect(response.body.id).toBe(testUser.id);
    expect(response.body.name).toBe(testUser.name);
  });

  it('GET /users/:id - 인증 없이 사용자 프로필 조회 성공', async () => {
    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/users/${testUser.id}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name');
    expect(response.body.id).toBe(testUser.id);
  });

  it('GET /users/:id - 인증된 사용자가 다른 사용자 프로필 조회 성공', async () => {
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .get(`/users/${otherTestUser.id}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name');
    expect(response.body.id).toBe(otherTestUser.id);
    expect(response.body.name).toBe(otherTestUser.name);
  });

  it('GET /users/:id - 존재하지 않는 사용자 조회 시 404 에러', async () => {
    const nonExistentUserId = 999999;
    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/users/${nonExistentUserId}`)
      .expect(404);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('사용자를 찾을 수 없습니다');
  });

  it('GET /users/:id - 잘못된 사용자 ID 형식으로 조회 시 400 에러', async () => {
    const response = await context.testHelper.unauthenticatedRequest()
      .get('/users/invalid-id')
      .expect(400);

    expect(response.body).toHaveProperty('message');
  });

  it('GET /users/:id - 사용자 프로필 응답에 불필요한 정보 제외', async () => {
    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/users/${testUser.id}`)
      .expect(200);

    // 민감한 정보가 포함되지 않았는지 확인
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('credential');
    expect(response.body).not.toHaveProperty('authentications');
  });

  it('GET /users/:id - 노트를 작성한 사용자 프로필 조회', async () => {
    // 테스트 헬퍼를 사용하여 차 생성
    const testTea = await context.testHelper.createTea(testUser.token, {
      name: '테스트 차',
      year: 2023,
      type: '홍차',
    });

    // 테스트 헬퍼를 사용하여 노트 생성
    const activeSchema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(activeSchema.id);
    
    await context.testHelper.createNote(testUser.token, {
      teaId: testTea.id,
      schemaId: activeSchema.id,
      overallRating: 4.5,
      isRatingIncluded: true,
      axisValues: axes.map((axis: any) => ({
        axisId: axis.id,
        value: axis.code === 'RICHNESS' ? 4 : axis.code === 'STRENGTH' ? 5 : axis.code === 'SMOOTHNESS' ? 4 : axis.code === 'CLARITY' ? 4 : 5,
      })),
      memo: '테스트 노트',
      isPublic: true,
    });

    // 사용자 프로필 조회
    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/users/${testUser.id}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name');
    expect(response.body.id).toBe(testUser.id);

    // 테스트 데이터 정리
    await context.dataSource.query('DELETE FROM notes WHERE userId = ?', [testUser.id]);
    await context.dataSource.query('DELETE FROM teas WHERE id = ?', [testTea.id]);
  });
});

