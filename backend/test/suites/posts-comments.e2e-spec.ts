import { TestContext, setupTestApp, teardownTestApp } from '../setup/test-setup';
import { TestUser } from '../helpers/test-helper';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/posts/:postId/comments - 댓글 API', () => {
  let context: TestContext;
  let author: TestUser;
  let commenter: TestUser;
  let postId: number;
  let commentId: number;

  beforeAll(async () => {
    context = await setupTestApp();
    const users = await context.testHelper.createUsers(2, 'Comment Test User');
    author = users[0];
    commenter = users[1];

    const res = await context.testHelper.authenticatedRequest(author.token)
      .post('/posts')
      .send({ title: '댓글 테스트 게시글', content: '내용', category: 'tea_room_review' })
      .expect(201);
    postId = res.body.id;
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await context.dataSource.query('DELETE FROM comments WHERE postId = ?', [postId]);
  });

  afterAll(async () => {
    try {
      await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await context.dataSource.query('DELETE FROM posts WHERE id = ?', [postId]);
      await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
      if (author?.id) await context.dataSource.query('DELETE FROM users WHERE id = ?', [author.id]);
      if (commenter?.id) await context.dataSource.query('DELETE FROM users WHERE id = ?', [commenter.id]);
    } catch (error) {
      console.warn('테스트 데이터 정리 중 오류:', error.message);
    }
    await teardownTestApp(context);
  });

  it('POST /posts/:postId/comments - 댓글 작성 성공', async () => {
    const response = await context.testHelper.authenticatedRequest(commenter.token)
      .post(`/posts/${postId}/comments`)
      .send({ content: '첫 번째 댓글입니다.' })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.content).toBe('첫 번째 댓글입니다.');
    expect(response.body).toHaveProperty('user');
    commentId = response.body.id;
  });

  it('POST /posts/:postId/comments - 인증 없이 댓글 작성 실패', async () => {
    await context.testHelper.unauthenticatedRequest()
      .post(`/posts/${postId}/comments`)
      .send({ content: '댓글' })
      .expect(401);
  });

  it('POST /posts/:postId/comments - 존재하지 않는 게시글에 댓글 작성 실패', async () => {
    await context.testHelper.authenticatedRequest(commenter.token)
      .post('/posts/99999/comments')
      .send({ content: '댓글' })
      .expect(404);
  });

  it('GET /posts/:postId/comments - 댓글 목록 조회', async () => {
    await context.testHelper.authenticatedRequest(commenter.token)
      .post(`/posts/${postId}/comments`)
      .send({ content: '댓글1' });

    await context.testHelper.authenticatedRequest(author.token)
      .post(`/posts/${postId}/comments`)
      .send({ content: '댓글2' });

    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/posts/${postId}/comments`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
    expect(response.body[0]).toHaveProperty('user');
  });

  it('PATCH /comments/:id - 댓글 수정 성공', async () => {
    const created = await context.testHelper.authenticatedRequest(commenter.token)
      .post(`/posts/${postId}/comments`)
      .send({ content: '원래 댓글' })
      .expect(201);

    const response = await context.testHelper.authenticatedRequest(commenter.token)
      .patch(`/comments/${created.body.id}`)
      .send({ content: '수정된 댓글' })
      .expect(200);

    expect(response.body.content).toBe('수정된 댓글');
  });

  it('PATCH /comments/:id - 작성자가 아니면 수정 실패', async () => {
    const created = await context.testHelper.authenticatedRequest(commenter.token)
      .post(`/posts/${postId}/comments`)
      .send({ content: '수정 불가 댓글' })
      .expect(201);

    await context.testHelper.authenticatedRequest(author.token)
      .patch(`/comments/${created.body.id}`)
      .send({ content: '다른 사람이 수정' })
      .expect(403);
  });

  it('DELETE /comments/:id - 댓글 삭제 성공', async () => {
    const created = await context.testHelper.authenticatedRequest(commenter.token)
      .post(`/posts/${postId}/comments`)
      .send({ content: '삭제될 댓글' })
      .expect(201);

    await context.testHelper.authenticatedRequest(commenter.token)
      .delete(`/comments/${created.body.id}`)
      .expect(204);

    const comments = await context.testHelper.unauthenticatedRequest()
      .get(`/posts/${postId}/comments`)
      .expect(200);

    const found = comments.body.find((c: any) => c.id === created.body.id);
    expect(found).toBeUndefined();
  });

  it('DELETE /comments/:id - 작성자가 아니면 삭제 실패', async () => {
    const created = await context.testHelper.authenticatedRequest(commenter.token)
      .post(`/posts/${postId}/comments`)
      .send({ content: '삭제 불가 댓글' })
      .expect(201);

    await context.testHelper.authenticatedRequest(author.token)
      .delete(`/comments/${created.body.id}`)
      .expect(403);
  });
});
