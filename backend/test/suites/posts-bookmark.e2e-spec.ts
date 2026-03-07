import { TestContext, setupTestApp, teardownTestApp } from '../setup/test-setup';
import { TestUser } from '../helpers/test-helper';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/posts/:id/bookmark - 게시글 북마크 API', () => {
  let context: TestContext;
  let author: TestUser;
  let bookmarker: TestUser;
  let postId: number;

  beforeAll(async () => {
    context = await setupTestApp();
    const users = await context.testHelper.createUsers(2, 'Post Bookmark User');
    author = users[0];
    bookmarker = users[1];

    const res = await context.testHelper.authenticatedRequest(author.token)
      .post('/posts')
      .send({ title: '북마크 테스트', content: '내용', category: 'tool' })
      .expect(201);
    postId = res.body.id;
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await context.dataSource.query('DELETE FROM post_bookmarks');
  });

  afterAll(async () => {
    try {
      await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await context.dataSource.query('DELETE FROM posts WHERE id = ?', [postId]);
      await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
      if (author?.id) await context.dataSource.query('DELETE FROM users WHERE id = ?', [author.id]);
      if (bookmarker?.id) await context.dataSource.query('DELETE FROM users WHERE id = ?', [bookmarker.id]);
    } catch (error) {
      console.warn('테스트 데이터 정리 중 오류:', error.message);
    }
    await teardownTestApp(context);
  });

  it('POST /posts/:id/bookmark - 북마크 추가 성공', async () => {
    const response = await context.testHelper.authenticatedRequest(bookmarker.token)
      .post(`/posts/${postId}/bookmark`)
      .expect(201);

    expect(response.body.bookmarked).toBe(true);
  });

  it('POST /posts/:id/bookmark - 북마크 취소 성공', async () => {
    await context.testHelper.authenticatedRequest(bookmarker.token)
      .post(`/posts/${postId}/bookmark`)
      .expect(201);

    const response = await context.testHelper.authenticatedRequest(bookmarker.token)
      .post(`/posts/${postId}/bookmark`)
      .expect(201);

    expect(response.body.bookmarked).toBe(false);
  });

  it('POST /posts/:id/bookmark - 인증 없이 북마크 실패', async () => {
    await context.testHelper.unauthenticatedRequest()
      .post(`/posts/${postId}/bookmark`)
      .expect(401);
  });

  it('GET /posts/:id - 북마크 정보 포함 조회', async () => {
    await context.testHelper.authenticatedRequest(bookmarker.token)
      .post(`/posts/${postId}/bookmark`)
      .expect(201);

    const response = await context.testHelper.authenticatedRequest(bookmarker.token)
      .get(`/posts/${postId}`)
      .expect(200);

    expect(response.body.isBookmarked).toBe(true);
  });
});
