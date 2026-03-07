import { DataSource } from 'typeorm';
import { TestContext, setupTestApp, teardownTestApp, ensureDefaultSchema } from '../setup/test-setup';
import { TestUser, TestTea, TestNote } from '../helpers/test-helper';
import { TEST_CONSTANTS, TEST_DEFAULTS } from '../constants/test-constants';

describe('/notes/:id/report - 노트 신고 API', () => {
  let context: TestContext;
  let noteOwner: TestUser;
  let reporter: TestUser;
  let testTea: TestTea;
  let publicNote: TestNote;

  beforeAll(async () => {
    context = await setupTestApp();
    await ensureDefaultSchema(context.dataSource);

    const users = await context.testHelper.createUsers(2, 'Report Test User');
    noteOwner = users[0];
    reporter = users[1];

    testTea = await context.testHelper.createTea(noteOwner.token, {
      name: TEST_DEFAULTS.TEA.name,
      year: TEST_DEFAULTS.TEA.year,
      type: TEST_DEFAULTS.TEA.type,
    });

    const schema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(schema.id);

    publicNote = await context.testHelper.createNote(noteOwner.token, {
      teaId: testTea.id,
      schemaId: schema.id,
      overallRating: TEST_DEFAULTS.NOTE.overallRating,
      isRatingIncluded: TEST_DEFAULTS.NOTE.isRatingIncluded,
      axisValues: TEST_DEFAULTS.NOTE.axisValues.map((av, index) => ({
        axisId: axes[index]?.id || av.axisId,
        value: av.value,
      })),
      memo: TEST_DEFAULTS.NOTE.memo,
      isPublic: true,
    });
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await context.dataSource.query('DELETE FROM note_reports');
  });

  afterAll(async () => {
    try {
      await context.dataSource.query('DELETE FROM note_reports');
      if (publicNote?.id) {
        await context.dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [publicNote.id]);
        await context.dataSource.query('DELETE FROM notes WHERE id = ?', [publicNote.id]);
      }
      if (testTea?.id) {
        await context.dataSource.query('DELETE FROM teas WHERE id = ?', [testTea.id]);
      }
      if (noteOwner?.id) {
        await context.dataSource.query('DELETE FROM users WHERE id = ?', [noteOwner.id]);
      }
      if (reporter?.id) {
        await context.dataSource.query('DELETE FROM users WHERE id = ?', [reporter.id]);
      }
    } catch (error) {
      console.warn('테스트 데이터 정리 중 오류 (무시 가능):', error.message);
    }
    await teardownTestApp(context);
  });

  it('POST /notes/:id/report - 신고 성공 (201)', async () => {
    const response = await context.testHelper.authenticatedRequest(reporter.token)
      .post(`/notes/${publicNote.id}/report`)
      .send({ reason: 'spam' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('신고가 접수되었습니다.');
  });

  it('POST /notes/:id/report - 인증 없이 신고 실패 (401)', async () => {
    await context.testHelper.unauthenticatedRequest()
      .post(`/notes/${publicNote.id}/report`)
      .send({ reason: 'spam' })
      .expect(401);
  });

  it('POST /notes/:id/report - 자기 자신 노트 신고 실패 (403)', async () => {
    const response = await context.testHelper.authenticatedRequest(noteOwner.token)
      .post(`/notes/${publicNote.id}/report`)
      .send({ reason: 'spam' })
      .expect(403);

    expect(response.body).toHaveProperty('message');
    expect(response.body.statusCode).toBe(403);
  });

  it('POST /notes/:id/report - 존재하지 않는 노트 신고 실패 (404)', async () => {
    const response = await context.testHelper.authenticatedRequest(reporter.token)
      .post('/notes/99999/report')
      .send({ reason: 'spam' })
      .expect(404);

    expect(response.body).toHaveProperty('message');
    expect(response.body.statusCode).toBe(404);
  });

  it('POST /notes/:id/report - 잘못된 신고 사유로 실패 (400)', async () => {
    const response = await context.testHelper.authenticatedRequest(reporter.token)
      .post(`/notes/${publicNote.id}/report`)
      .send({ reason: 'invalid_reason' })
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.statusCode).toBe(400);
  });

  it('POST /notes/:id/report - 신고 사유 없이 실패 (400)', async () => {
    const response = await context.testHelper.authenticatedRequest(reporter.token)
      .post(`/notes/${publicNote.id}/report`)
      .send({})
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.statusCode).toBe(400);
  });

  it('POST /notes/:id/report - 잘못된 노트 ID 형식으로 실패 (400)', async () => {
    const response = await context.testHelper.authenticatedRequest(reporter.token)
      .post('/notes/invalid-id/report')
      .send({ reason: 'spam' })
      .expect(400);

    expect(response.body).toHaveProperty('message');
    expect(response.body.statusCode).toBe(400);
  });

  it('POST /notes/:id/report - 모든 신고 사유 허용 확인', async () => {
    const reasons = ['spam', 'inappropriate', 'copyright', 'other'];

    for (const reason of reasons) {
      const response = await context.testHelper.authenticatedRequest(reporter.token)
        .post(`/notes/${publicNote.id}/report`)
        .send({ reason })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.message).toBe('신고가 접수되었습니다.');
    }
  });
});
