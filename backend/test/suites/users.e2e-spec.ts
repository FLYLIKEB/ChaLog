import { DataSource } from 'typeorm';
import { TestContext, setupTestApp, teardownTestApp, ensureDefaultSchema, cleanupDatabase } from '../setup/test-setup';
import { TestUser } from '../helpers/test-helper';
import { TEST_CONSTANTS } from '../constants/test-constants';

describe('/users/:id - 사용자 프로필 조회 API', () => {
  let context: TestContext;
  let testUser: TestUser;
  let otherTestUser: TestUser;

  beforeAll(async () => {
    context = await setupTestApp();
    // 기본 스키마 및 축 생성
    await ensureDefaultSchema(context.dataSource);
    
    // 테스트 헬퍼를 사용하여 사용자 2명 생성
    [testUser, otherTestUser] = await context.testHelper.createUsers(2, 'Profile Test User');
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
    await teardownTestApp(context);
  });

  it('GET /users/:id - 사용자 프로필 조회 성공', async () => {
    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/users/${testUser.id}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name');
    expect(response.body.id).toBe(testUser.id);
    expect(response.body.name).toBe(testUser.name);
  });

  it('GET /users/:id - 인증 없이 사용자 프로필 조회 성공', async () => {
    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/users/${testUser.id}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name');
    expect(response.body.id).toBe(testUser.id);
  });

  it('GET /users/:id - 인증된 사용자가 다른 사용자 프로필 조회 성공', async () => {
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .get(`/users/${otherTestUser.id}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name');
    expect(response.body.id).toBe(otherTestUser.id);
    expect(response.body.name).toBe(otherTestUser.name);
  });

  it('GET /users/:id - 존재하지 않는 사용자 조회 시 404 에러', async () => {
    const nonExistentUserId = 999999;
    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/users/${nonExistentUserId}`)
      .expect(404);

    expect(response.body).toHaveProperty('message');
    const message = Array.isArray(response.body.message) 
      ? response.body.message[0] 
      : response.body.message;
    expect(message).toContain('사용자를 찾을 수 없습니다');
  });

  it('GET /users/:id - 잘못된 사용자 ID 형식으로 조회 시 400 에러', async () => {
    const response = await context.testHelper.unauthenticatedRequest()
      .get('/users/invalid-id')
      .expect(400);

    expect(response.body).toHaveProperty('message');
  });

  it('GET /users/:id - 사용자 프로필 응답에 불필요한 정보 제외', async () => {
    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/users/${testUser.id}`)
      .expect(200);

    // 민감한 정보가 포함되지 않았는지 확인
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('credential');
    expect(response.body).not.toHaveProperty('authentications');
  });

  it('GET /users/:id - 노트를 작성한 사용자 프로필 조회', async () => {
    // 테스트 헬퍼를 사용하여 차 생성
    const testTea = await context.testHelper.createTea(testUser.token, {
      name: '테스트 차',
      year: 2023,
      type: '홍차',
    });

    // 테스트 헬퍼를 사용하여 노트 생성
    const activeSchema = await context.testHelper.getActiveSchema();
    const axes = await context.testHelper.getSchemaAxes(activeSchema.id);
    
    await context.testHelper.createNote(testUser.token, {
      teaId: testTea.id,
      schemaId: activeSchema.id,
      overallRating: 4.5,
      isRatingIncluded: true,
      axisValues: axes.map((axis: any) => ({
        axisId: axis.id,
        value: axis.code === 'RICHNESS' ? 4 : axis.code === 'STRENGTH' ? 5 : axis.code === 'SMOOTHNESS' ? 4 : axis.code === 'CLARITY' ? 4 : 5,
      })),
      memo: '테스트 노트',
      isPublic: true,
    });

    // 사용자 프로필 조회
    const response = await context.testHelper.unauthenticatedRequest()
      .get(`/users/${testUser.id}`)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name');
    expect(response.body.id).toBe(testUser.id);

    // 테스트 데이터 정리
    await context.dataSource.query('DELETE FROM notes WHERE userId = ?', [testUser.id]);
    await context.dataSource.query('DELETE FROM teas WHERE id = ?', [testTea.id]);
  });
});

describe('/users/profile-image - 프로필 이미지 업로드 API', () => {
  let context: TestContext;
  let testUser: TestUser;
  let otherTestUser: TestUser;

  beforeAll(async () => {
    context = await setupTestApp();
    [testUser, otherTestUser] = await context.testHelper.createUsers(2, 'Profile Image Test User');
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await teardownTestApp(context);
  });

  // 간단한 PNG 이미지 버퍼 생성 (1x1 픽셀)
  const createTestImageBuffer = (): Buffer => {
    // 최소한의 유효한 PNG 이미지 (1x1 픽셀, 투명)
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const ihdr = Buffer.from([
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width: 1
      0x00, 0x00, 0x00, 0x01, // height: 1
      0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
      0x1F, 0x15, 0xC4, 0x89, // CRC
    ]);
    const iend = Buffer.from([
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82, // CRC
    ]);
    return Buffer.concat([pngSignature, ihdr, iend]);
  };

  it('POST /users/profile-image - 프로필 이미지 업로드 성공', async () => {
    const imageBuffer = createTestImageBuffer();
    
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/users/profile-image')
      .attach('image', imageBuffer, 'test.png')
      .expect(201);

    expect(response.body).toHaveProperty('url');
    expect(typeof response.body.url).toBe('string');
    expect(response.body.url.length).toBeGreaterThan(0);
  });

  it('POST /users/profile-image - 인증 없이 업로드 시 401 에러', async () => {
    const imageBuffer = createTestImageBuffer();
    
    const response = await context.testHelper.unauthenticatedRequest()
      .post('/users/profile-image')
      .attach('image', imageBuffer, 'test.png')
      .expect(401);

    expect(response.body).toHaveProperty('message');
  });

  it('POST /users/profile-image - 파일 없이 업로드 시 400 에러', async () => {
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/users/profile-image')
      .expect(400);

    expect(response.body).toHaveProperty('message');
    const message = Array.isArray(response.body.message) 
      ? response.body.message[0] 
      : response.body.message;
    expect(message).toContain('이미지 파일이 필요합니다');
  });

  it('POST /users/profile-image - 지원하지 않는 파일 형식 시 400 에러', async () => {
    const textBuffer = Buffer.from('This is not an image');
    
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/users/profile-image')
      .attach('image', textBuffer, 'test.txt')
      .expect(400);

    expect(response.body).toHaveProperty('message');
    const message = Array.isArray(response.body.message) 
      ? response.body.message[0] 
      : response.body.message;
    expect(message).toContain('지원하지 않는 이미지 형식');
  });

  it('POST /users/profile-image - 파일 크기 초과 시 400 또는 413 에러', async () => {
    // 11MB 크기의 버퍼 생성
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
    
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .post('/users/profile-image')
      .attach('image', largeBuffer, 'large.png')
      .expect((res) => {
        // NestJS는 파일 크기 초과 시 413을 반환할 수 있음
        expect([400, 413]).toContain(res.status);
      });

    expect(response.body).toHaveProperty('message');
    const message = Array.isArray(response.body.message) 
      ? response.body.message[0] 
      : response.body.message;
    expect(message).toMatch(/파일 크기|payload|too large/i);
  });
});

describe('/users/:id - 프로필 업데이트 API', () => {
  let context: TestContext;
  let testUser: TestUser;
  let otherTestUser: TestUser;

  beforeAll(async () => {
    context = await setupTestApp();
    [testUser, otherTestUser] = await context.testHelper.createUsers(2, 'Profile Update Test User');
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await teardownTestApp(context);
  });

  it('PATCH /users/:id - 프로필 이미지 URL 업데이트 성공', async () => {
    const newImageUrl = 'https://example.com/profile.jpg';
    
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .patch(`/users/${testUser.id}`)
      .send({ profileImageUrl: newImageUrl })
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('profileImageUrl');
    expect(response.body.profileImageUrl).toBe(newImageUrl);
  });

  it('PATCH /users/:id - 프로필 이미지 URL 제거 성공', async () => {
    // 먼저 이미지 URL 설정
    await context.testHelper.authenticatedRequest(testUser.token)
      .patch(`/users/${testUser.id}`)
      .send({ profileImageUrl: 'https://example.com/profile.jpg' })
      .expect(200);

    // 이미지 URL 제거
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .patch(`/users/${testUser.id}`)
      .send({ profileImageUrl: null })
      .expect(200);

    expect(response.body).toHaveProperty('profileImageUrl');
    expect(response.body.profileImageUrl).toBeNull();
  });

  it('PATCH /users/:id - 다른 사용자 프로필 수정 시 403 에러', async () => {
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .patch(`/users/${otherTestUser.id}`)
      .send({ profileImageUrl: 'https://example.com/profile.jpg' })
      .expect(403);

    expect(response.body).toHaveProperty('message');
    const message = Array.isArray(response.body.message) 
      ? response.body.message[0] 
      : response.body.message;
    expect(message).toContain('권한이 없습니다');
  });

  it('PATCH /users/:id - 인증 없이 업데이트 시 401 에러', async () => {
    const response = await context.testHelper.unauthenticatedRequest()
      .patch(`/users/${testUser.id}`)
      .send({ profileImageUrl: 'https://example.com/profile.jpg' })
      .expect(401);

    expect(response.body).toHaveProperty('message');
  });

  it('PATCH /users/:id - 존재하지 않는 사용자 업데이트 시 404 에러', async () => {
    const nonExistentUserId = 999999;
    
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .patch(`/users/${nonExistentUserId}`)
      .send({ profileImageUrl: 'https://example.com/profile.jpg' })
      .expect(404);

    expect(response.body).toHaveProperty('message');
  });

  it('PATCH /users/:id - 잘못된 사용자 ID 형식 시 400 에러', async () => {
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .patch('/users/invalid-id')
      .send({ profileImageUrl: 'https://example.com/profile.jpg' })
      .expect(400);

    expect(response.body).toHaveProperty('message');
  });

  it('PATCH /users/:id - 프로필 이미지 URL이 너무 길면 400 에러', async () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(600); // 500자 초과
    
    const response = await context.testHelper.authenticatedRequest(testUser.token)
      .patch(`/users/${testUser.id}`)
      .send({ profileImageUrl: longUrl })
      .expect(400);

    expect(response.body).toHaveProperty('message');
  });
});

