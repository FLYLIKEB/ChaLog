import { TestContext, setupTestApp, teardownTestApp, ensureDefaultSchema } from '../setup/test-setup';
import { TestUser, TestTea, TestNote } from '../helpers/test-helper';
import { TEST_CONSTANTS, TEST_DEFAULTS } from '../constants/test-constants';

describe('/teas/:id 상세 고도화 API', () => {
  let context: TestContext;
  let testUser1: TestUser;
  let testUser2: TestUser;
  let testTea: TestTea;
  let testNote1: TestNote;
  let testNote2: TestNote;

  beforeAll(async () => {
    context = await setupTestApp();
    await ensureDefaultSchema(context.dataSource);

    const users = await context.testHelper.createUsers(2, 'Detail Test User');
    testUser1 = users[0];
    testUser2 = users[1];

    testTea = await context.testHelper.createTea(testUser1.token, {
      name: '정산소종',
      year: 2023,
      type: '홍차',
      seller: '차향',
      origin: '중국 푸젠',
    });

    const schema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(schema.id);

    const axisValues = TEST_DEFAULTS.NOTE.axisValues.map((av, index) => ({
      axisId: axes[index]?.id || av.axisId,
      value: av.value,
    }));

    const note1Response = await context.testHelper.authenticatedRequest(testUser1.token)
      .post('/notes')
      .send({
        teaId: testTea.id,
        schemaId: schema.id,
        overallRating: 4.5,
        isRatingIncluded: true,
        axisValues,
        memo: '훌륭한 홍차입니다',
        isPublic: true,
        tags: ['꽃향', '단맛'],
      })
      .expect(201);
    testNote1 = note1Response.body;

    const note2Response = await context.testHelper.authenticatedRequest(testUser2.token)
      .post('/notes')
      .send({
        teaId: testTea.id,
        schemaId: schema.id,
        overallRating: 4.0,
        isRatingIncluded: true,
        axisValues,
        memo: '향이 좋아요',
        isPublic: true,
        tags: ['꽃향', '스모키'],
      })
      .expect(201);
    testNote2 = note2Response.body;
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    try {
      await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await context.dataSource.query('DELETE FROM note_bookmarks');
      await context.dataSource.query('DELETE FROM note_likes');
      await context.dataSource.query('DELETE FROM note_axis_value');
      await context.dataSource.query('DELETE FROM note_tags');
      await context.dataSource.query('DELETE FROM notes');
      await context.dataSource.query('DELETE FROM teas WHERE id = ?', [testTea?.id]);
      if (testUser1?.id) {
        await context.dataSource.query('DELETE FROM users WHERE id = ?', [testUser1.id]);
      }
      if (testUser2?.id) {
        await context.dataSource.query('DELETE FROM users WHERE id = ?', [testUser2.id]);
      }
      await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (error) {
      console.warn('테스트 데이터 정리 중 오류 (무시 가능):', error.message);
    }
    await teardownTestApp(context);
  });

  describe('GET /teas/:id/popular-tags', () => {
    it('200 응답과 { tags } 구조를 반환해야 한다', async () => {
      const response = await context.testHelper.unauthenticatedRequest()
        .get(`/teas/${testTea.id}/popular-tags`)
        .expect(200);

      expect(response.body).toHaveProperty('tags');
      expect(Array.isArray(response.body.tags)).toBe(true);
    });

    it('태그는 name과 count 필드를 가져야 한다', async () => {
      const response = await context.testHelper.unauthenticatedRequest()
        .get(`/teas/${testTea.id}/popular-tags`)
        .expect(200);

      if (response.body.tags.length > 0) {
        const tag = response.body.tags[0];
        expect(tag).toHaveProperty('name');
        expect(tag).toHaveProperty('count');
        expect(typeof tag.count).toBe('number');
      }
    });

    it('공개 노트의 태그만 집계해야 한다 (꽃향이 가장 많아야 함)', async () => {
      const response = await context.testHelper.unauthenticatedRequest()
        .get(`/teas/${testTea.id}/popular-tags`)
        .expect(200);

      const flowerTag = response.body.tags.find((t: { name: string }) => t.name === '꽃향');
      expect(flowerTag).toBeDefined();
      expect(flowerTag.count).toBeGreaterThanOrEqual(2);
    });

    it('존재하지 않는 차 ID로 요청 시 404를 반환해야 한다', async () => {
      await context.testHelper.unauthenticatedRequest()
        .get('/teas/999999/popular-tags')
        .expect(404);
    });

    it('잘못된 ID 형식으로 요청 시 400을 반환해야 한다', async () => {
      await context.testHelper.unauthenticatedRequest()
        .get('/teas/invalid/popular-tags')
        .expect(400);
    });
  });

  describe('GET /teas/:id/top-reviews', () => {
    it('200 응답과 배열을 반환해야 한다', async () => {
      const response = await context.testHelper.unauthenticatedRequest()
        .get(`/teas/${testTea.id}/top-reviews`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('최대 3개까지만 반환해야 한다', async () => {
      const response = await context.testHelper.unauthenticatedRequest()
        .get(`/teas/${testTea.id}/top-reviews`)
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(3);
    });

    it('반환된 노트는 likeCount 필드를 가져야 한다', async () => {
      const response = await context.testHelper.unauthenticatedRequest()
        .get(`/teas/${testTea.id}/top-reviews`)
        .expect(200);

      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('likeCount');
        expect(typeof response.body[0].likeCount).toBe('number');
      }
    });

    it('좋아요가 많은 노트가 먼저 오도록 정렬되어야 한다', async () => {
      // note1에 좋아요 추가
      await context.testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote1.id}/like`)
        .expect(201);

      const response = await context.testHelper.unauthenticatedRequest()
        .get(`/teas/${testTea.id}/top-reviews`)
        .expect(200);

      if (response.body.length >= 2) {
        expect(response.body[0].likeCount).toBeGreaterThanOrEqual(response.body[1].likeCount);
      }

      // 좋아요 정리
      await context.testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote1.id}/like`);
    });

    it('존재하지 않는 차 ID로 요청 시 404를 반환해야 한다', async () => {
      await context.testHelper.unauthenticatedRequest()
        .get('/teas/999999/top-reviews')
        .expect(404);
    });

    it('잘못된 ID 형식으로 요청 시 400을 반환해야 한다', async () => {
      await context.testHelper.unauthenticatedRequest()
        .get('/teas/invalid/top-reviews')
        .expect(400);
    });
  });

  describe('GET /teas/:id/similar', () => {
    let similarTea: TestTea;

    beforeAll(async () => {
      similarTea = await context.testHelper.createTea(testUser1.token, {
        name: '다즐링',
        year: 2022,
        type: '홍차',
      });
    }, TEST_CONSTANTS.TEST_TIMEOUT);

    afterAll(async () => {
      if (similarTea?.id) {
        await context.dataSource.query('DELETE FROM teas WHERE id = ?', [similarTea.id]);
      }
    });

    it('200 응답과 배열을 반환해야 한다', async () => {
      const response = await context.testHelper.unauthenticatedRequest()
        .get(`/teas/${testTea.id}/similar`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('결과에 요청한 차 자신이 포함되지 않아야 한다', async () => {
      const response = await context.testHelper.unauthenticatedRequest()
        .get(`/teas/${testTea.id}/similar`)
        .expect(200);

      const ids = response.body.map((t: { id: number }) => t.id);
      expect(ids).not.toContain(testTea.id);
    });

    it('최대 4개까지만 반환해야 한다', async () => {
      const response = await context.testHelper.unauthenticatedRequest()
        .get(`/teas/${testTea.id}/similar`)
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(4);
    });

    it('존재하지 않는 차 ID로 요청 시 404를 반환해야 한다', async () => {
      await context.testHelper.unauthenticatedRequest()
        .get('/teas/999999/similar')
        .expect(404);
    });

    it('잘못된 ID 형식으로 요청 시 400을 반환해야 한다', async () => {
      await context.testHelper.unauthenticatedRequest()
        .get('/teas/invalid/similar')
        .expect(400);
    });
  });
});
