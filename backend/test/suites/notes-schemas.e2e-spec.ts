import { TestContext, setupTestApp, teardownTestApp, ensureDefaultSchema } from '../setup/test-setup';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/notes/schemas - 평가 스키마 API', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await setupTestApp();
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    // 테스트 격리를 위해 각 테스트 전에 관련 데이터 정리
    await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await context.dataSource.query('DELETE FROM note_axis_value');
    await context.dataSource.query('DELETE FROM notes');
    await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');

    // 기본 스키마 및 축 생성
    await ensureDefaultSchema(context.dataSource);
  });

  afterAll(async () => {
    await teardownTestApp(context);
  });

  it('GET /notes/schemas/active - 활성 스키마 목록 조회', async () => {
    const response = await context.testHelper.unauthenticatedRequest()
      .get('/notes/schemas/active')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    
    const schema = response.body[0];
    expect(schema).toHaveProperty('id');
    expect(schema).toHaveProperty('code');
    expect(schema).toHaveProperty('version');
    expect(schema).toHaveProperty('nameKo');
    expect(schema).toHaveProperty('nameEn');
    expect(schema.isActive).toBe(true);
  });

  it('GET /notes/schemas/:schemaId/axes - 스키마의 축 목록 조회', async () => {
    // 활성 스키마 조회
    const schemasResponse = await context.testHelper.unauthenticatedRequest()
      .get('/notes/schemas/active')
      .expect(200);

    const schema = schemasResponse.body[0];
    expect(schema).toBeDefined();

    // 스키마의 축 목록 조회
    const axesResponse = await context.testHelper.unauthenticatedRequest()
      .get(`/notes/schemas/${schema.id}/axes`)
      .expect(200);

    expect(Array.isArray(axesResponse.body)).toBe(true);
    expect(axesResponse.body.length).toBeGreaterThan(0);

    const axis = axesResponse.body[0];
    expect(axis).toHaveProperty('id');
    expect(axis).toHaveProperty('schemaId');
    expect(axis).toHaveProperty('code');
    expect(axis).toHaveProperty('nameKo');
    expect(axis).toHaveProperty('nameEn');
    expect(axis).toHaveProperty('displayOrder');
    expect(axis.schemaId).toBe(schema.id);
  });

  it('GET /notes/schemas/:schemaId/axes - 존재하지 않는 스키마일 때 404 반환', async () => {
    await context.testHelper.unauthenticatedRequest()
      .get('/notes/schemas/99999/axes')
      .expect(404);
  });

  it('GET /notes/schemas/:schemaId/axes - 축 목록이 displayOrder로 정렬되어야 함', async () => {
    // 활성 스키마 조회
    const schemasResponse = await context.testHelper.unauthenticatedRequest()
      .get('/notes/schemas/active')
      .expect(200);

    const schema = schemasResponse.body[0];

    // 스키마의 축 목록 조회
    const axesResponse = await context.testHelper.unauthenticatedRequest()
      .get(`/notes/schemas/${schema.id}/axes`)
      .expect(200);

    const axes = axesResponse.body;
    expect(axes.length).toBeGreaterThan(1);

    // displayOrder로 정렬되어 있는지 확인
    for (let i = 1; i < axes.length; i++) {
      expect(axes[i].displayOrder).toBeGreaterThanOrEqual(axes[i - 1].displayOrder);
    }
  });
});

