import { TestContext, setupTestApp, teardownTestApp } from '../setup/test-setup';
import { TestUser } from '../helpers/test-helper';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/posts - 게시글 CRUD API', () => {
  let context: TestContext;
  let testUser: TestUser;
  let otherUser: TestUser;
  let postId: number;

  const postData = {
    title: '우림 질문 테스트',
    content: '어떻게 우리면 좋을까요?',
    category: 'brewing_question',
    isSponsored: false,
  };

  beforeAll(async () => {
    context = await setupTestApp();
    const users = await context.testHelper.createUsers(2, 'Post CRUD User');
    testUser = users[0];
    otherUser = users[1];
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  beforeEach(async () => {
    await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await context.dataSource.query('DELETE FROM post_bookmarks');
    await context.dataSource.query('DELETE FROM post_likes');
    await context.dataSource.query('DELETE FROM comments');
    await context.dataSource.query('DELETE FROM post_reports');
    await context.dataSource.query('DELETE FROM posts');
    await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  afterAll(async () => {
    try {
      await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await context.dataSource.query('DELETE FROM posts');
      await context.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
      if (testUser?.id) await context.dataSource.query('DELETE FROM users WHERE id = ?', [testUser.id]);
      if (otherUser?.id) await context.dataSource.query('DELETE FROM users WHERE id = ?', [otherUser.id]);
    } catch (error) {
      console.warn('테스트 데이터 정리 중 오류 (무시 가능):', error.message);
    }
    await teardownTestApp(context);
  });

  it('POST /posts - 게시글 생성 성공', async () => {
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/posts')
      .send(postData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe(postData.title);
    expect(response.body.category).toBe(postData.category);
    expect(response.body.isSponsored).toBe(false);
    postId = response.body.id;
  });

  it('POST /posts - 이미지 포함 게시글 생성 성공', async () => {
    const postWithImages = {
      ...postData,
      title: '이미지 포함 게시글',
      images: [
        { url: 'https://example.com/image1.jpg', caption: '첫 번째 이미지' },
        { url: 'https://example.com/image2.jpg', thumbnailUrl: 'https://example.com/thumb2.jpg', caption: '두 번째 이미지' },
      ],
    };
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/posts')
      .send(postWithImages)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('이미지 포함 게시글');
    expect(response.body.images).toBeDefined();
    expect(Array.isArray(response.body.images)).toBe(true);
    expect(response.body.images).toHaveLength(2);
    expect(response.body.images[0]).toMatchObject({ url: 'https://example.com/image1.jpg', caption: '첫 번째 이미지' });
    expect(response.body.images[1]).toMatchObject({ url: 'https://example.com/image2.jpg', caption: '두 번째 이미지' });
  });

  it('POST /posts - 협찬 게시글 생성 성공', async () => {
    const sponsoredData = {
      ...postData,
      title: '협찬 게시글',
      isSponsored: true,
      sponsorNote: '다실 A 협찬',
    };
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/posts')
      .send(sponsoredData)
      .expect(201);

    expect(response.body.isSponsored).toBe(true);
    expect(response.body.sponsorNote).toBe('다실 A 협찬');
  });

  it('POST /posts - 인증 없이 게시글 생성 실패', async () => {
    await context.testHelper.unauthenticatedRequest()
      .post('/posts')
      .send(postData)
      .expect(401);
  });

  it('GET /posts - 게시글 목록 조회', async () => {
    await context.testHelper.authenticatedRequest(testUser.token)
      .post('/posts')
      .send(postData);

    const response = await context.testHelper.unauthenticatedRequest()
      .get('/posts')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('GET /posts?category=brewing_question - 카테고리 필터 조회', async () => {
    await context.testHelper.authenticatedRequest(testUser.token)
      .post('/posts')
      .send(postData);

    const response = await context.testHelper.unauthenticatedRequest()
      .get('/posts?category=brewing_question')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    response.body.forEach((p: any) => expect(p.category).toBe('brewing_question'));
  });

  it('GET /posts/:id - 게시글 상세 조회', async () => {
    const created = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/posts')
      .send(postData)
      .expect(201);

    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/posts/${created.body.id}`)
      .expect(200);

    expect(response.body.id).toBe(created.body.id);
    expect(response.body).toHaveProperty('likeCount');
    expect(response.body).toHaveProperty('isLiked');
    expect(response.body).toHaveProperty('isBookmarked');
  });

  it('GET /posts/:id - 존재하지 않는 게시글 조회 실패', async () => {
    await context.testHelper.unauthenticatedRequest()
      .get('/posts/99999')
      .expect(404);
  });

  it('PATCH /posts/:id - 게시글 수정 성공', async () => {
    const created = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/posts')
      .send(postData)
      .expect(201);

    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .patch(`/posts/${created.body.id}`)
      .send({ title: '수정된 제목' })
      .expect(200);

    expect(response.body.title).toBe('수정된 제목');
  });

  it('PATCH /posts/:id - 작성자가 아니면 수정 실패', async () => {
    const created = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/posts')
      .send(postData)
      .expect(201);

    await context.testHelper.authenticatedRequest(otherUser.token)
      .patch(`/posts/${created.body.id}`)
      .send({ title: '다른 사람이 수정' })
      .expect(403);
  });

  it('DELETE /posts/:id - 게시글 삭제 성공', async () => {
    const created = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/posts')
      .send(postData)
      .expect(201);

    await context.testHelper.authenticatedRequest(testUser.token)
      .delete(`/posts/${created.body.id}`)
      .expect(204);
  });

  it('DELETE /posts/:id - 작성자가 아니면 삭제 실패', async () => {
    const created = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/posts')
      .send(postData)
      .expect(201);

    await context.testHelper.authenticatedRequest(otherUser.token)
      .delete(`/posts/${created.body.id}`)
      .expect(403);
  });
});
