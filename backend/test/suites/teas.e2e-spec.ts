import { DataSource } from 'typeorm';
import { TestContext, setupTestApp, teardownTestApp, ensureDefaultSchema } from '../setup/test-setup';
import { TestUser, TestTea } from '../helpers/test-helper';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/teas - 차 API', () => {
  let context: TestContext;
  let testUser: TestUser;

  beforeAll(async () => {
    context = await setupTestApp();
    // 기본 스키마 및 축 생성
    await ensureDefaultSchema(context.dataSource);
    
    // 테스트 헬퍼를 사용하여 사용자 생성
    testUser = await context.testHelper.createUser('Tea Test User');
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    // 테스트 격리를 위해 각 테스트 전에 teas 및 관련 데이터 정리
    // 외래키 제약을 고려하여 자식 테이블부터 삭제
    await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await context.dataSource.query('DELETE FROM note_bookmarks');
    await context.dataSource.query('DELETE FROM note_likes');
    await context.dataSource.query('DELETE FROM note_tags');
    await context.dataSource.query('DELETE FROM tags');
    await context.dataSource.query('DELETE FROM notes');
    await context.dataSource.query('DELETE FROM teas');
    await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  afterAll(async () => {
    // 테스트 종료 후 생성한 사용자 데이터 정리
    try {
      if (testUser?.id) {
        await context.dataSource.query('DELETE FROM users WHERE id = ?', [testUser.id]);
      }
    } catch (error) {
      console.warn('테스트 데이터 정리 중 오류 (무시 가능):', error.message);
    }
    await teardownTestApp(context);
  });

  it('GET /teas - 초기에는 빈 배열을 반환해야 함', async () => {
    const response = await context.testHelper.unauthenticatedRequest()
      .get('/teas')
      .expect(200);
    
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  it('POST /teas - 인증된 사용자가 새 차를 생성할 수 있어야 함', async () => {
    const teaData = {
      name: '정산소종',
      year: 2023,
      type: '홍차',
      seller: '차향',
      origin: '중국 푸젠',
    };
    
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/teas')
      .send(teaData)
      .expect(201);
    
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(teaData.name);
  });

  it('POST /teas - 인증 없이 차 생성 실패', () => {
    return context.testHelper.unauthenticatedRequest()
      .post('/teas')
      .send({
        name: '정산소종',
        year: 2023,
        type: '홍차',
      })
      .expect(401);
  });

  it('GET /teas/:id - 차 상세 조회 성공', async () => {
    // 테스트 헬퍼를 사용하여 차 생성
    const testTeaDetail = await context.testHelper.createTea(testUser.token, {
      name: '정산소종',
      year: 2023,
      type: '홍차',
      seller: '차향',
      origin: '중국 푸젠',
    });

    // 차 상세 조회
    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/teas/${testTeaDetail.id}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('정산소종');
    expect(response.body.type).toBe('홍차');
    expect(response.body.year).toBe(2023);

    // 테스트 데이터 정리
    await context.dataSource.query('DELETE FROM teas WHERE id = ?', [testTeaDetail.id]);
  });

  it('GET /teas/:id - 존재하지 않는 차 조회 시 404 에러', async () => {
    const nonExistentTeaId = 999999;
    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/teas/${nonExistentTeaId}`)
      .expect(404);

    expect(response.body).toHaveProperty('message');
    expect(response.body.statusCode).toBe(404);
  });

  it('GET /teas/:id - 잘못된 차 ID 형식으로 조회 시 400 에러', async () => {
    const response = await context.testHelper.unauthenticatedRequest()
      .get('/teas/invalid-id')
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.statusCode).toBe(400);
  });

  it('GET /teas?q=검색어 - 차 검색 성공', async () => {
    // 테스트 헬퍼를 사용하여 차 생성
    const testTea1 = await context.testHelper.createTea(testUser.token, {
      name: '정산소종',
      year: 2023,
      type: '홍차',
    });

    const testTea2 = await context.testHelper.createTea(testUser.token, {
      name: '다즐링',
      year: 2022,
      type: '홍차',
    });

    // 검색 테스트
    const response = await context.testHelper.unauthenticatedRequest()
      .get('/teas?q=정산')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    const foundTea = response.body.find((t: any) => t.name === '정산소종');
    expect(foundTea).toBeDefined();
    
    // 검색어가 포함되지 않은 차는 검색 결과에 없어야 함
    const notFoundTea = response.body.find((t: any) => t.name === '다즐링');
    expect(notFoundTea).toBeUndefined();

    // 테스트 데이터 정리
    await context.dataSource.query('DELETE FROM teas WHERE id IN (?, ?)', [testTea1.id, testTea2.id]);
  });

  it('GET /teas?q=검색어 - 검색 결과 없음', async () => {
    const response = await context.testHelper.unauthenticatedRequest()
      .get('/teas?q=존재하지않는차')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  it('GET /teas/rankings/popular - 인기 차 랭킹 반환', async () => {
    await context.testHelper.createTea(testUser.token, {
      name: '인기차1',
      type: '홍차',
      seller: '차향',
    });
    await context.testHelper.createTea(testUser.token, {
      name: '인기차2',
      type: '녹차',
    });

    const response = await context.testHelper.unauthenticatedRequest()
      .get('/teas/rankings/popular?limit=10')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeLessThanOrEqual(10);
  });

  it('GET /teas/rankings/new - 신규 차 반환', async () => {
    const response = await context.testHelper.unauthenticatedRequest()
      .get('/teas/rankings/new?limit=5')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeLessThanOrEqual(5);
  });

  it('GET /teas/sellers - 샵/브랜드 리스트 반환', async () => {
    await context.testHelper.createTea(testUser.token, {
      name: '샵테스트차',
      type: '홍차',
      seller: '테스트샵',
    });

    const response = await context.testHelper.unauthenticatedRequest()
      .get('/teas/sellers')
      .expect(200);

    expect(response.body).toHaveProperty('sellers');
    expect(Array.isArray(response.body.sellers)).toBe(true);
    const found = response.body.sellers.find((s: any) => s.name === '테스트샵');
    if (found) {
      expect(found.teaCount).toBeGreaterThanOrEqual(1);
    }
  });

  it('GET /teas/by-seller/:name - 샵별 차 목록 반환', async () => {
    const tea = await context.testHelper.createTea(testUser.token, {
      name: '샵상세테스트',
      type: '홍차',
      seller: '차향',
    });

    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/teas/by-seller/${encodeURIComponent('차향')}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    const found = response.body.find((t: any) => t.id === tea.id);
    expect(found).toBeDefined();
    expect(found.seller).toBe('차향');
  });

  it('GET /teas/curation - 추천 큐레이션 반환 (비로그인)', async () => {
    const response = await context.testHelper.unauthenticatedRequest()
      .get('/teas/curation?limit=10')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeLessThanOrEqual(10);
  });

  it('GET /teas/curation - 온보딩 완료 사용자에게 맞춤 큐레이션 반환', async () => {
    await context.testHelper.createTea(testUser.token, {
      name: '큐레이션홍차',
      type: '홍차',
      seller: '테스트샵',
    });
    await context.testHelper.createTea(testUser.token, {
      name: '큐레이션녹차',
      type: '녹차',
      seller: '테스트샵',
    });

    await context.testHelper
      .authenticatedRequest(testUser.token)
      .patch(`/users/${testUser.id}/onboarding`)
      .send({
        preferredTeaTypes: ['홍차', '녹차'],
        preferredFlavorTags: ['민트'],
      })
      .expect(200);

    const response = await context.testHelper
      .authenticatedRequest(testUser.token)
      .get('/teas/curation?limit=10')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeLessThanOrEqual(10);
    const types = response.body.map((t: { type: string }) => t.type);
    const hasPreferredTypes = types.some((t: string) => t === '홍차' || t === '녹차');
    expect(hasPreferredTypes).toBe(true);
  });

  it('GET /teas?type=&minRating=&sort= - 필터 조합 검증', async () => {
    await context.testHelper.createTea(testUser.token, {
      name: '필터테스트홍차',
      type: '홍차',
    });

    const response = await context.testHelper.unauthenticatedRequest()
      .get('/teas?type=홍차&minRating=3&sort=popular')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});

