import { TestContext, setupTestApp, teardownTestApp } from '../setup/test-setup';
import { TestUser } from '../helpers/test-helper';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/posts/:id/like - 게시글 좋아요 API', () => {
  let context: TestContext;
  let author: TestUser;
  let liker: TestUser;
  let postId: number;

  beforeAll(async () => {
    context = await setupTestApp();
    const users = await context.testHelper.createUsers(2, 'Post Like User');
    author = users[0];
    liker = users[1];

    const res = await context.testHelper.authenticatedRequest(author.token)
      .post('/posts')
      .send({ title: '좋아요 테스트', content: '내용', category: 'recommendation' })
      .expect(201);
    postId = res.body.id;
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await context.dataSource.query('DELETE FROM post_likes');
  });

  afterAll(async () => {
    try {
      await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await context.dataSource.query('DELETE FROM posts WHERE id = ?', [postId]);
      await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
      if (author?.id) await context.dataSource.query('DELETE FROM users WHERE id = ?', [author.id]);
      if (liker?.id) await context.dataSource.query('DELETE FROM users WHERE id = ?', [liker.id]);
    } catch (error) {
      console.warn('테스트 데이터 정리 중 오류:', error.message);
    }
    await teardownTestApp(context);
  });

  it('POST /posts/:id/like - 좋아요 추가 성공', async () => {
    const response = await context.testHelper.authenticatedRequest(liker.token)
      .post(`/posts/${postId}/like`)
      .expect(201);

    expect(response.body.liked).toBe(true);
    expect(response.body.likeCount).toBe(1);
  });

  it('POST /posts/:id/like - 좋아요 취소 성공', async () => {
    await context.testHelper.authenticatedRequest(liker.token)
      .post(`/posts/${postId}/like`)
      .expect(201);

    const response = await context.testHelper.authenticatedRequest(liker.token)
      .post(`/posts/${postId}/like`)
      .expect(201);

    expect(response.body.liked).toBe(false);
    expect(response.body.likeCount).toBe(0);
  });

  it('POST /posts/:id/like - 인증 없이 좋아요 실패', async () => {
    await context.testHelper.unauthenticatedRequest()
      .post(`/posts/${postId}/like`)
      .expect(401);
  });

  it('POST /posts/:id/like - 존재하지 않는 게시글 좋아요 실패', async () => {
    await context.testHelper.authenticatedRequest(liker.token)
      .post('/posts/99999/like')
      .expect(404);
  });

  it('GET /posts/:id - 좋아요 정보 포함 조회', async () => {
    await context.testHelper.authenticatedRequest(liker.token)
      .post(`/posts/${postId}/like`)
      .expect(201);

    const response = await context.testHelper.authenticatedRequest(liker.token)
      .get(`/posts/${postId}`)
      .expect(200);

    expect(response.body.likeCount).toBe(1);
    expect(response.body.isLiked).toBe(true);
  });
});
