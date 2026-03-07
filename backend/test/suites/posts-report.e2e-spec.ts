import { TestContext, setupTestApp, teardownTestApp } from '../setup/test-setup';
import { TestUser } from '../helpers/test-helper';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/posts/:id/report - 게시글 신고 API', () => {
  let context: TestContext;
  let author: TestUser;
  let reporter: TestUser;
  let postId: number;

  beforeAll(async () => {
    context = await setupTestApp();
    const users = await context.testHelper.createUsers(2, 'Post Report User');
    author = users[0];
    reporter = users[1];

    const res = await context.testHelper.authenticatedRequest(author.token)
      .post('/posts')
      .send({ title: '신고 테스트 게시글', content: '내용', category: 'recommendation' })
      .expect(201);
    postId = res.body.id;
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await context.dataSource.query('DELETE FROM post_reports');
  });

  afterAll(async () => {
    try {
      await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await context.dataSource.query('DELETE FROM posts WHERE id = ?', [postId]);
      await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
      if (author?.id) await context.dataSource.query('DELETE FROM users WHERE id = ?', [author.id]);
      if (reporter?.id) await context.dataSource.query('DELETE FROM users WHERE id = ?', [reporter.id]);
    } catch (error) {
      console.warn('테스트 데이터 정리 중 오류:', error.message);
    }
    await teardownTestApp(context);
  });

  it('POST /posts/:id/report - 신고 성공', async () => {
    const response = await context.testHelper.authenticatedRequest(reporter.token)
      .post(`/posts/${postId}/report`)
      .send({ reason: 'spam' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.message).toBe('신고가 접수되었습니다.');
  });

  it('POST /posts/:id/report - 중복 신고 실패', async () => {
    await context.testHelper.authenticatedRequest(reporter.token)
      .post(`/posts/${postId}/report`)
      .send({ reason: 'spam' })
      .expect(201);

    const response = await context.testHelper.authenticatedRequest(reporter.token)
      .post(`/posts/${postId}/report`)
      .send({ reason: 'spam' })
      .expect(409);

    expect(response.body.message).toContain('이미 신고한 게시글');
  });

  it('POST /posts/:id/report - 자신의 게시글 신고 실패', async () => {
    await context.testHelper.authenticatedRequest(author.token)
      .post(`/posts/${postId}/report`)
      .send({ reason: 'inappropriate' })
      .expect(403);
  });

  it('POST /posts/:id/report - 인증 없이 신고 실패', async () => {
    await context.testHelper.unauthenticatedRequest()
      .post(`/posts/${postId}/report`)
      .send({ reason: 'spam' })
      .expect(401);
  });

  it('POST /posts/:id/report - 존재하지 않는 게시글 신고 실패', async () => {
    await context.testHelper.authenticatedRequest(reporter.token)
      .post('/posts/99999/report')
      .send({ reason: 'spam' })
      .expect(404);
  });
});
