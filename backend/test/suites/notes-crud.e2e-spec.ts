import { DataSource } from 'typeorm';
import { TestContext, setupTestApp, teardownTestApp, ensureDefaultSchema } from '../setup/test-setup';
import { TestUser, TestTea } from '../helpers/test-helper';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/notes - 노트 CRUD API', () => {
  let context: TestContext;
  let testUser: TestUser;
  let testTea: TestTea;
  let noteId: number;

  beforeAll(async () => {
    context = await setupTestApp();
    // 기본 스키마 및 축 생성
    await ensureDefaultSchema(context.dataSource);
    
    // 테스트 헬퍼를 사용하여 사용자 및 차 생성
    testUser = await context.testHelper.createUser('Note CRUD Test User');
    testTea = await context.testHelper.createTea(testUser.token, {
      name: 'CRUD 테스트 차',
      year: 2023,
      type: '홍차',
    });
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
    // 테스트 종료 후 생성한 데이터 정리
    try {
      if (noteId) {
        await context.dataSource.query('DELETE FROM notes WHERE id = ?', [noteId]);
      }
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

  it('POST /notes - 노트 생성 성공 (새 구조)', async () => {
    // 활성 스키마 조회
    const schema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(schema.id);

    const noteData = {
      teaId: testTea.id,
      schemaId: schema.id,
      overallRating: 4.4,
      isRatingIncluded: true,
      axisValues: axes.map((axis) => ({
        axisId: axis.id,
        value: axis.displayOrder === 1 ? 4 : axis.displayOrder === 2 ? 5 : 4,
      })),
      memo: 'CRUD 테스트 노트',
      isPublic: true,
    };

    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/notes')
      .send(noteData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.schemaId).toBe(schema.id);
    // overallRating은 DB에서 DECIMAL로 저장되어 문자열로 반환될 수 있음
    const overallRating = typeof response.body.overallRating === 'string' 
      ? parseFloat(response.body.overallRating) 
      : response.body.overallRating;
    expect(overallRating).toBeCloseTo(noteData.overallRating, 1);
    expect(response.body.memo).toBe(noteData.memo);
    expect(response.body.isPublic).toBe(noteData.isPublic);
    expect(response.body.axisValues).toBeDefined();
    expect(Array.isArray(response.body.axisValues)).toBe(true);
    noteId = response.body.id;
  });

  it('POST /notes - 인증 없이 노트 생성 실패', async () => {
    const schema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(schema.id);

    return context.testHelper.unauthenticatedRequest()
      .post('/notes')
      .send({
        teaId: testTea.id,
        schemaId: schema.id,
        axisValues: axes.map((axis) => ({
          axisId: axis.id,
          value: 4,
        })),
      })
      .expect(401);
  });

  it('GET /notes - 노트 목록 조회 (인증 없이)', async () => {
    // 테스트 헬퍼를 사용하여 노트 생성
    const schema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(schema.id);

    const testNote = await context.testHelper.createNote(testUser.token, {
      teaId: testTea.id,
      schemaId: schema.id,
      overallRating: 4.4,
      axisValues: axes.map((axis) => ({
        axisId: axis.id,
        value: 4,
      })),
      memo: '공개 노트',
      isPublic: true,
    });
    noteId = testNote.id;

    // 인증 없이 노트 목록 조회
    const response = await context.testHelper.unauthenticatedRequest()
      .get('/notes?public=true')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    const note = response.body.find((n: any) => n.id === noteId);
    expect(note).toBeDefined();
    expect(note.isPublic).toBe(true);
    expect(note.schemaId).toBe(schema.id);
    expect(note.axisValues).toBeDefined();
  });

  it('GET /notes - userId 필터로 노트 조회', async () => {
    // 테스트 헬퍼를 사용하여 노트 생성
    const schema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(schema.id);

    const testNote = await context.testHelper.createNote(testUser.token, {
      teaId: testTea.id,
      schemaId: schema.id,
      axisValues: axes.map((axis) => ({
        axisId: axis.id,
        value: 4,
      })),
      memo: '사용자 필터 테스트',
      isPublic: true,
    });
    noteId = testNote.id;

    // userId로 필터링
    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/notes?userId=${testUser.id}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    const note = response.body.find((n: any) => n.id === noteId);
    expect(note).toBeDefined();
    expect(note.userId).toBe(testUser.id);
    expect(note.schemaId).toBe(schema.id);
  });

  it('GET /notes - teaId 필터로 노트 조회', async () => {
    // 테스트 헬퍼를 사용하여 노트 생성
    const schema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(schema.id);

    const testNote = await context.testHelper.createNote(testUser.token, {
      teaId: testTea.id,
      schemaId: schema.id,
      axisValues: axes.map((axis) => ({
        axisId: axis.id,
        value: 4,
      })),
      memo: '차 필터 테스트',
      isPublic: true,
    });
    noteId = testNote.id;

    // teaId로 필터링
    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/notes?teaId=${testTea.id}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    const note = response.body.find((n: any) => n.id === noteId);
    expect(note).toBeDefined();
    expect(note.teaId).toBe(testTea.id);
    expect(note.schemaId).toBe(schema.id);
  });

  it('PATCH /notes/:id - 노트 수정 성공 (새 구조)', async () => {
    // 테스트 헬퍼를 사용하여 노트 생성
    const schema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(schema.id);

    const testNote = await context.testHelper.createNote(testUser.token, {
      teaId: testTea.id,
      schemaId: schema.id,
      axisValues: axes.map((axis) => ({
        axisId: axis.id,
        value: 4,
      })),
      memo: '원본 메모',
      isPublic: true,
    });
    noteId = testNote.id;

    // 노트 수정
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .patch(`/notes/${noteId}`)
      .send({
        overallRating: 5.0,
        axisValues: axes.map((axis) => ({
          axisId: axis.id,
          value: 5,
        })),
        memo: '수정된 메모',
      })
      .expect(200);

    // overallRating은 DB에서 DECIMAL로 저장되어 문자열로 반환될 수 있음
    const overallRating = typeof response.body.overallRating === 'string' 
      ? parseFloat(response.body.overallRating) 
      : response.body.overallRating;
    expect(overallRating).toBe(5.0);
    expect(response.body.memo).toBe('수정된 메모');
    expect(response.body.axisValues).toBeDefined();
    expect(response.body.axisValues.length).toBe(axes.length);
  });

  it('PATCH /notes/:id - 다른 사용자의 노트 수정 실패', async () => {
    // 테스트 헬퍼를 사용하여 다른 사용자 생성
    const otherTestUser = await context.testHelper.createUser('Other User');

    // 테스트 헬퍼를 사용하여 노트 생성
    const schema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(schema.id);

    const testNote = await context.testHelper.createNote(testUser.token, {
      teaId: testTea.id,
      schemaId: schema.id,
      axisValues: axes.map((axis) => ({
        axisId: axis.id,
        value: 4,
      })),
      memo: '다른 사용자 수정 테스트',
      isPublic: true,
    });

    // 다른 사용자가 수정 시도
    const response = await context.testHelper.authenticatedRequest(otherTestUser.token)
      .patch(`/notes/${testNote.id}`)
      .send({
        memo: '수정 시도',
      })
      .expect(403);

    expect(response.body).toHaveProperty('message');
    expect(response.body.statusCode).toBe(403);

    // 테스트 데이터 정리
    await context.dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [testNote.id]);
    await context.dataSource.query('DELETE FROM notes WHERE id = ?', [testNote.id]);
    await context.dataSource.query('DELETE FROM users WHERE id = ?', [otherTestUser.id]);
  });

  it('DELETE /notes/:id - 노트 삭제 성공', async () => {
    // 테스트 헬퍼를 사용하여 노트 생성
    const schema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(schema.id);

    const testNote = await context.testHelper.createNote(testUser.token, {
      teaId: testTea.id,
      schemaId: schema.id,
      axisValues: axes.map((axis) => ({
        axisId: axis.id,
        value: 4,
      })),
      memo: '삭제 테스트 노트',
      isPublic: true,
    });

    // 노트 삭제
    await context.testHelper.authenticatedRequest(testUser.token)
      .delete(`/notes/${testNote.id}`)
      .expect(200);

    // 삭제 확인
    await context.testHelper.unauthenticatedRequest()
      .get(`/notes/${testNote.id}`)
      .expect(404);
  });

  it('DELETE /notes/:id - 다른 사용자의 노트 삭제 실패', async () => {
    // 테스트 헬퍼를 사용하여 다른 사용자 생성
    const otherTestUser = await context.testHelper.createUser('Other User 2');

    // 테스트 헬퍼를 사용하여 노트 생성
    const schema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(schema.id);

    const testNote = await context.testHelper.createNote(testUser.token, {
      teaId: testTea.id,
      schemaId: schema.id,
      axisValues: axes.map((axis) => ({
        axisId: axis.id,
        value: 4,
      })),
      memo: '다른 사용자 삭제 테스트',
      isPublic: true,
    });

    // 다른 사용자가 삭제 시도
    const response = await context.testHelper.authenticatedRequest(otherTestUser.token)
      .delete(`/notes/${testNote.id}`)
      .expect(403);

    expect(response.body).toHaveProperty('message');
    expect(response.body.statusCode).toBe(403);

    // 테스트 데이터 정리
    await context.dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [testNote.id]);
    await context.dataSource.query('DELETE FROM notes WHERE id = ?', [testNote.id]);
    await context.dataSource.query('DELETE FROM users WHERE id = ?', [otherTestUser.id]);
  });
});

