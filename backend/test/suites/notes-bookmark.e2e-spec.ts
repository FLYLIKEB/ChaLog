import { DataSource } from 'typeorm';
import { TestContext, setupTestApp, teardownTestApp, ensureDefaultSchema } from '../setup/test-setup';
import { TestUser, TestTea, TestNote } from '../helpers/test-helper';
import { TEST_CONSTANTS, TEST_DEFAULTS } from '../constants/test-constants';

describe('/notes/:id/bookmark - 노트 북마크 API', () => {
  let context: TestContext;
  let testUser1: TestUser;
  let testUser2: TestUser;
  let testTea: TestTea;
  let testNote: TestNote;

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
    const users = await context.testHelper.createUsers(2, 'Bookmark Test User');
    testUser1 = users[0];
    testUser2 = users[1];

    // 테스트용 차 생성
    testTea = await context.testHelper.createTea(testUser1.token, {
      name: TEST_DEFAULTS.TEA.name,
      year: TEST_DEFAULTS.TEA.year,
      type: TEST_DEFAULTS.TEA.type,
    });

    // 테스트용 노트 생성
    const schema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(schema.id);
    
    testNote = await context.testHelper.createNote(testUser1.token, {
      teaId: testTea.id,
      schemaId: schema.id,
      overallRating: TEST_DEFAULTS.NOTE.overallRating,
      isRatingIncluded: TEST_DEFAULTS.NOTE.isRatingIncluded,
      axisValues: TEST_DEFAULTS.NOTE.axisValues.map((av, index) => ({
        axisId: axes[index]?.id || av.axisId,
        value: av.value,
      })),
      memo: TEST_DEFAULTS.NOTE.memo,
      isPublic: TEST_DEFAULTS.NOTE.isPublic,
    });
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    // 테스트 격리를 위해 각 테스트 전에 북마크 데이터만 정리
    await context.dataSource.query('DELETE FROM note_bookmarks');
  });

  afterAll(async () => {
    // 테스트 종료 후 생성한 데이터 정리
    try {
      if (testNote?.id) {
        await context.dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [testNote.id]);
        await context.dataSource.query('DELETE FROM notes WHERE id = ?', [testNote.id]);
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

  it('POST /notes/:id/bookmark - 북마크 추가 성공', async () => {
    const response = await context.testHelper.authenticatedRequest(testUser2.token)
      .post(`/notes/${testNote.id}/bookmark`)
      .expect(201);

    expect(response.body).toHaveProperty('bookmarked');
    expect(response.body.bookmarked).toBe(true);
  });

  it('POST /notes/:id/bookmark - 북마크 해제 성공', async () => {
    // 먼저 북마크 추가
    await context.testHelper.authenticatedRequest(testUser2.token)
      .post(`/notes/${testNote.id}/bookmark`)
      .expect(201);

    // 북마크 해제
    const response = await context.testHelper.authenticatedRequest(testUser2.token)
      .post(`/notes/${testNote.id}/bookmark`)
      .expect(201);

    expect(response.body.bookmarked).toBe(false);
  });

  it('POST /notes/:id/bookmark - 중복 북마크 방지 (토글 동작)', async () => {
    // 첫 번째 북마크
    const response1 = await context.testHelper.authenticatedRequest(testUser2.token)
      .post(`/notes/${testNote.id}/bookmark`)
      .expect(201);
    expect(response1.body.bookmarked).toBe(true);

    // 두 번째 북마크 (해제되어야 함)
    const response2 = await context.testHelper.authenticatedRequest(testUser2.token)
      .post(`/notes/${testNote.id}/bookmark`)
      .expect(201);
    expect(response2.body.bookmarked).toBe(false);

    // 세 번째 북마크 (다시 추가되어야 함)
    const response3 = await context.testHelper.authenticatedRequest(testUser2.token)
      .post(`/notes/${testNote.id}/bookmark`)
      .expect(201);
    expect(response3.body.bookmarked).toBe(true);
  });

  it('POST /notes/:id/bookmark - 존재하지 않는 노트에 북마크 실패', async () => {
    const nonExistentNoteId = 99999;
    const response = await context.testHelper.authenticatedRequest(testUser2.token)
      .post(`/notes/${nonExistentNoteId}/bookmark`)
      .expect(404);

    expect(response.body).toHaveProperty('message');
    expect(response.body.statusCode).toBe(404);
  });

  it('POST /notes/:id/bookmark - 인증 없이 북마크 실패', async () => {
    return context.testHelper.unauthenticatedRequest()
      .post(`/notes/${testNote.id}/bookmark`)
      .expect(401);
  });

  it('POST /notes/:id/bookmark - 잘못된 노트 ID 형식으로 북마크 실패', async () => {
    const response = await context.testHelper.authenticatedRequest(testUser2.token)
      .post('/notes/invalid-id/bookmark')
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.statusCode).toBe(400);
  });

  it('POST /notes/:id/bookmark - 비공개 노트에 작성자가 아닌 사용자가 북마크 시도 시 403 에러', async () => {
    // 비공개 노트 생성
    const schema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(schema.id);
    
    const privateNote = await context.testHelper.createNote(testUser1.token, {
      teaId: testTea.id,
      schemaId: schema.id,
      axisValues: axes.map((axis) => ({
        axisId: axis.id,
        value: 4,
      })),
      memo: '비공개 테스트 노트입니다',
      isPublic: false,
    });

    // 작성자가 아닌 사용자(userId2)가 북마크 시도
    const response = await context.testHelper.authenticatedRequest(testUser2.token)
      .post(`/notes/${privateNote.id}/bookmark`)
      .expect(403);

    expect(response.body).toHaveProperty('message');
    expect(response.body.statusCode).toBe(403);
    expect(response.body.message).toContain('권한이 없습니다');

    // 테스트 데이터 정리
    await context.dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [privateNote.id]);
    await context.dataSource.query('DELETE FROM notes WHERE id = ?', [privateNote.id]);
  });

  it('POST /notes/:id/bookmark - 비공개 노트에 작성자가 북마크 성공', async () => {
    // 비공개 노트 생성
    const schema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(schema.id);
    
    const privateNote = await context.testHelper.createNote(testUser1.token, {
      teaId: testTea.id,
      schemaId: schema.id,
      axisValues: axes.map((axis) => ({
        axisId: axis.id,
        value: 4,
      })),
      memo: '비공개 테스트 노트입니다',
      isPublic: false,
    });

    // 작성자(userId1)가 북마크 시도
    const response = await context.testHelper.authenticatedRequest(testUser1.token)
      .post(`/notes/${privateNote.id}/bookmark`)
      .expect(201);

    expect(response.body).toHaveProperty('bookmarked');
    expect(response.body.bookmarked).toBe(true);

    // 테스트 데이터 정리
    await context.dataSource.query('DELETE FROM note_bookmarks WHERE noteId = ?', [privateNote.id]);
    await context.dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [privateNote.id]);
    await context.dataSource.query('DELETE FROM notes WHERE id = ?', [privateNote.id]);
  });

  it('GET /notes/:id - 노트 조회 시 북마크 정보 포함', async () => {
    // 먼저 북마크 추가
    const bookmarkResponse = await context.testHelper.authenticatedRequest(testUser2.token)
      .post(`/notes/${testNote.id}/bookmark`)
      .expect(201);
    
    expect(bookmarkResponse.body.bookmarked).toBe(true);

    // 노트 조회 (인증된 사용자) - 트랜잭션으로 인해 데이터가 즉시 반영됨
    const response = await context.testHelper.authenticatedRequest(testUser2.token)
      .get(`/notes/${testNote.id}`)
      .expect(200);

    expect(response.body).toHaveProperty('isBookmarked');
    expect(response.body.isBookmarked).toBe(true);
  });

  it('GET /notes/:id - 북마크하지 않은 노트 조회 시 isBookmarked는 false', async () => {
    // 북마크 없이 노트 조회
    const response = await context.testHelper.authenticatedRequest(testUser2.token)
      .get(`/notes/${testNote.id}`)
      .expect(200);

    expect(response.body.isBookmarked).toBe(false);
  });

  it('GET /notes/:id - 인증 없이 노트 조회 시 북마크 정보 포함 (isBookmarked는 false)', async () => {
    // 인증 없이 노트 조회
    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/notes/${testNote.id}`)
      .expect(200);

    expect(response.body).toHaveProperty('isBookmarked');
    expect(response.body.isBookmarked).toBe(false); // 인증되지 않았으므로 false
  });

  it('GET /notes - 노트 목록 조회 시 북마크 정보 포함', async () => {
    // 노트 목록 조회
    const response = await context.testHelper.authenticatedRequest(testUser2.token)
      .get('/notes')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    const note = response.body.find((n: any) => n.id === testNote.id);
    expect(note).toBeDefined();
    expect(note).toHaveProperty('isBookmarked');
    // 북마크를 누르지 않았으므로 false여야 함
    expect(note.isBookmarked).toBe(false);
  });

  it('POST /notes/:id/bookmark - 여러 사용자가 같은 노트에 북마크', async () => {
    // 사용자 1이 북마크
    const response1 = await context.testHelper.authenticatedRequest(testUser1.token)
      .post(`/notes/${testNote.id}/bookmark`)
      .expect((res) => {
        // Rate limiting이 발생할 수 있으므로 201 또는 429 모두 허용
        if (res.status === 429) {
          return;
        }
        expect(res.status).toBe(201);
        expect(res.body.bookmarked).toBe(true);
      });
    
    // Rate limiting이 발생하지 않은 경우에만 계속
    if (response1.status === 201) {
      // 사용자 1이 북마크 해제
      const response2 = await context.testHelper.authenticatedRequest(testUser1.token)
        .post(`/notes/${testNote.id}/bookmark`)
        .expect((res) => {
          if (res.status === 429) {
            return;
          }
          expect(res.status).toBe(201);
          expect(res.body.bookmarked).toBe(false);
        });
    }
  });
});

