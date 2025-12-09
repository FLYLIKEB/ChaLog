import { DataSource } from 'typeorm';
import { TestContext, setupTestApp, teardownTestApp, ensureDefaultSchema } from '../setup/test-setup';
import { TestUser, TestTea, TestNote } from '../helpers/test-helper';
import { TEST_CONSTANTS, TEST_DEFAULTS } from '../constants/test-constants';

describe('GET /notes?bookmarked=true - 북마크한 노트 조회 API', () => {
  let context: TestContext;
  let testUser1: TestUser;
  let testUser2: TestUser;
  let testTea: TestTea;
  let testNote1: TestNote;
  let testNote2: TestNote;
  let testNote3: TestNote;

  beforeAll(async () => {
    context = await setupTestApp();
    // 기본 스키마 및 축 생성
    await ensureDefaultSchema(context.dataSource);
    
    // 북마크 테이블이 없으면 생성
    try {
      await context.dataSource.query(`
        CREATE TABLE IF NOT EXISTS \`note_bookmarks\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`noteId\` INT NOT NULL,
          \`userId\` INT NOT NULL,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY \`unique_note_user_bookmark\` (\`noteId\`, \`userId\`),
          INDEX \`IDX_note_bookmarks_noteId\` (\`noteId\`),
          INDEX \`IDX_note_bookmarks_userId\` (\`userId\`),
          FOREIGN KEY (\`noteId\`) REFERENCES \`notes\`(\`id\`) ON DELETE CASCADE,
          FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } catch (error) {
      // 테이블이 이미 존재하거나 다른 이유로 실패할 수 있음
      console.warn('북마크 테이블 생성 시도 중 오류 (무시 가능):', error.message);
    }
    
    // 테스트용 사용자 2명 생성
    const users = await context.testHelper.createUsers(2, 'Bookmarked List Test User');
    testUser1 = users[0];
    testUser2 = users[1];

    // 테스트용 차 생성
    testTea = await context.testHelper.createTea(testUser1.token, {
      name: TEST_DEFAULTS.TEA.name,
      year: TEST_DEFAULTS.TEA.year,
      type: TEST_DEFAULTS.TEA.type,
    });

    // 테스트용 노트 3개 생성
    const schema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(schema.id);
    
    testNote1 = await context.testHelper.createNote(testUser1.token, {
      teaId: testTea.id,
      schemaId: schema.id,
      overallRating: TEST_DEFAULTS.NOTE.overallRating,
      isRatingIncluded: TEST_DEFAULTS.NOTE.isRatingIncluded,
      axisValues: TEST_DEFAULTS.NOTE.axisValues.map((av, index) => ({
        axisId: axes[index]?.id || av.axisId,
        value: av.value,
      })),
      memo: '노트 1',
      isPublic: true,
    });

    testNote2 = await context.testHelper.createNote(testUser1.token, {
      teaId: testTea.id,
      schemaId: schema.id,
      overallRating: TEST_DEFAULTS.NOTE.overallRating,
      isRatingIncluded: TEST_DEFAULTS.NOTE.isRatingIncluded,
      axisValues: TEST_DEFAULTS.NOTE.axisValues.map((av, index) => ({
        axisId: axes[index]?.id || av.axisId,
        value: av.value,
      })),
      memo: '노트 2',
      isPublic: true,
    });

    testNote3 = await context.testHelper.createNote(testUser1.token, {
      teaId: testTea.id,
      schemaId: schema.id,
      overallRating: TEST_DEFAULTS.NOTE.overallRating,
      isRatingIncluded: TEST_DEFAULTS.NOTE.isRatingIncluded,
      axisValues: TEST_DEFAULTS.NOTE.axisValues.map((av, index) => ({
        axisId: axes[index]?.id || av.axisId,
        value: av.value,
      })),
      memo: '노트 3',
      isPublic: true,
    });
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    // 테스트 격리를 위해 각 테스트 전에 북마크 데이터만 정리
    await context.dataSource.query('DELETE FROM note_bookmarks');
  });

  afterAll(async () => {
    // 테스트 종료 후 생성한 데이터 정리
    try {
      if (testNote1?.id) {
        await context.dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [testNote1.id]);
        await context.dataSource.query('DELETE FROM notes WHERE id = ?', [testNote1.id]);
      }
      if (testNote2?.id) {
        await context.dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [testNote2.id]);
        await context.dataSource.query('DELETE FROM notes WHERE id = ?', [testNote2.id]);
      }
      if (testNote3?.id) {
        await context.dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [testNote3.id]);
        await context.dataSource.query('DELETE FROM notes WHERE id = ?', [testNote3.id]);
      }
      if (testTea?.id) {
        await context.dataSource.query('DELETE FROM teas WHERE id = ?', [testTea.id]);
      }
      if (testUser1?.id) {
        await context.dataSource.query('DELETE FROM users WHERE id = ?', [testUser1.id]);
      }
      if (testUser2?.id) {
        await context.dataSource.query('DELETE FROM users WHERE id = ?', [testUser2.id]);
      }
    } catch (error) {
      console.warn('테스트 데이터 정리 중 오류 (무시 가능):', error.message);
    }
    await teardownTestApp(context);
  });

  it('GET /notes?bookmarked=true - 인증된 사용자가 북마크한 노트 조회 성공', async () => {
    // testUser2가 testNote1과 testNote2를 북마크
    await context.testHelper.authenticatedRequest(testUser2.token)
      .post(`/notes/${testNote1.id}/bookmark`)
      .expect(201);
    
    await context.testHelper.authenticatedRequest(testUser2.token)
      .post(`/notes/${testNote2.id}/bookmark`)
      .expect(201);

    // 북마크한 노트 조회
    const response = await context.testHelper.authenticatedRequest(testUser2.token)
      .get('/notes?bookmarked=true')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
    
    const noteIds = response.body.map((note: any) => note.id);
    expect(noteIds).toContain(testNote1.id);
    expect(noteIds).toContain(testNote2.id);
    expect(noteIds).not.toContain(testNote3.id);
    
    // 모든 노트가 isBookmarked: true인지 확인
    response.body.forEach((note: any) => {
      expect(note.isBookmarked).toBe(true);
    });
  });

  it('GET /notes?bookmarked=true - 북마크하지 않은 노트는 조회되지 않음', async () => {
    // 북마크 없이 조회
    const response = await context.testHelper.authenticatedRequest(testUser2.token)
      .get('/notes?bookmarked=true')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  it('GET /notes?bookmarked=true - 북마크한 날짜 기준 최신순 정렬 확인', async () => {
    // testUser2가 testNote1을 먼저 북마크
    await context.testHelper.authenticatedRequest(testUser2.token)
      .post(`/notes/${testNote1.id}/bookmark`)
      .expect(201);
    
    // 약간의 지연 후 testNote2를 북마크 (최신)
    await new Promise(resolve => setTimeout(resolve, 100));
    await context.testHelper.authenticatedRequest(testUser2.token)
      .post(`/notes/${testNote2.id}/bookmark`)
      .expect(201);

    // 북마크한 노트 조회
    const response = await context.testHelper.authenticatedRequest(testUser2.token)
      .get('/notes?bookmarked=true')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(2);
    
    // 첫 번째 노트가 testNote2여야 함 (최신순)
    expect(response.body[0].id).toBe(testNote2.id);
    expect(response.body[1].id).toBe(testNote1.id);
  });

  it('GET /notes?bookmarked=true - 인증 없이 조회 시 401 에러', async () => {
    await context.testHelper.unauthenticatedRequest()
      .get('/notes?bookmarked=true')
      .expect(401);
  });

  it('GET /notes?bookmarked=true - 다른 사용자가 북마크한 노트는 조회되지 않음', async () => {
    // testUser1이 testNote1을 북마크
    await context.testHelper.authenticatedRequest(testUser1.token)
      .post(`/notes/${testNote1.id}/bookmark`)
      .expect(201);
    
    // testUser2가 북마크한 노트 조회 (testUser1이 북마크한 노트는 포함되지 않아야 함)
    const response = await context.testHelper.authenticatedRequest(testUser2.token)
      .get('/notes?bookmarked=true')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  it('GET /notes?bookmarked=true - 북마크 해제 후 조회 시 제외됨', async () => {
    // testUser2가 testNote1을 북마크
    await context.testHelper.authenticatedRequest(testUser2.token)
      .post(`/notes/${testNote1.id}/bookmark`)
      .expect(201);
    
    // 북마크 확인
    let response = await context.testHelper.authenticatedRequest(testUser2.token)
      .get('/notes?bookmarked=true')
      .expect(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].id).toBe(testNote1.id);
    
    // 북마크 해제
    await context.testHelper.authenticatedRequest(testUser2.token)
      .post(`/notes/${testNote1.id}/bookmark`)
      .expect(201);
    
    // 다시 조회 (빈 배열)
    response = await context.testHelper.authenticatedRequest(testUser2.token)
      .get('/notes?bookmarked=true')
      .expect(200);
    expect(response.body.length).toBe(0);
  });
});

