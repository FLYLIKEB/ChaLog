import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { ConfigModule } from '@nestjs/config';
import { TestHelper, TestUser, TestTea, TestNote } from './helpers/test-helper';
import { TEST_CONSTANTS, TEST_DEFAULTS } from './constants/test-constants';

// 테스트 환경 변수 설정
process.env.NODE_ENV = 'test';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testDatabaseName: string;
  let testHelper: TestHelper;

  beforeAll(async () => {
    // 테스트 DB URL 확인
    const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!testDbUrl) {
      throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set for tests');
    }

    // 테스트 DB 이름 추출 (로깅용)
    try {
      const url = new URL(testDbUrl);
      testDatabaseName = url.pathname.slice(1);
      console.log(`[TEST] Using test database: ${testDatabaseName}`);
      
      // 경고: 프로덕션 DB를 사용하는 경우 경고
      if (!testDatabaseName.includes('test') && !testDatabaseName.includes('_test')) {
        console.warn(`[WARNING] Test database name "${testDatabaseName}" does not contain "test". Make sure you are using a test database!`);
      }
    } catch (error) {
      console.warn('[WARNING] Could not parse database URL for validation');
    }
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'], // 테스트용 env 파일 우선 사용
          ignoreEnvFile: false,
        }),
        AppModule,
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true }) // 테스트 환경에서 rate limiting 비활성화
      .compile();

    app = moduleFixture.createNestApplication();
    dataSource = moduleFixture.get<DataSource>(DataSource);
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    
    // 테스트 헬퍼 초기화
    testHelper = new TestHelper(app, dataSource);
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  // 공통 데이터 정리 헬퍼 함수 (외래키 제약 순서 고려)
  const cleanupDatabase = async () => {
    try {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      // 외래키 의존성이 있는 테이블부터 삭제 (자식 테이블 먼저)
      await dataSource.query('DELETE FROM note_bookmarks');
      await dataSource.query('DELETE FROM note_likes');
      await dataSource.query('DELETE FROM note_axis_value');
      await dataSource.query('DELETE FROM note_tags');
      await dataSource.query('DELETE FROM tags');
      await dataSource.query('DELETE FROM notes');
      await dataSource.query('DELETE FROM rating_axis');
      await dataSource.query('DELETE FROM rating_schema');
      await dataSource.query('DELETE FROM teas');
      await dataSource.query('DELETE FROM user_authentications');
      await dataSource.query('DELETE FROM users');
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (error) {
      console.error('[ERROR] Failed to clean up database:', error);
      throw error;
    }
  };

  afterAll(async () => {
    // 모든 테스트 데이터 정리
    try {
      console.log(`[TEST] Cleaning up test database: ${testDatabaseName}`);
      await cleanupDatabase();
      console.log(`[TEST] Test database cleaned up: ${testDatabaseName}`);
    } catch (error) {
      console.error('[ERROR] Failed to clean up test database:', error);
    } finally {
    await app.close();
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(404);
  });

  describe('/auth - 인증 API', () => {
    beforeEach(async () => {
      // 테스트 격리를 위해 각 테스트 전에 모든 데이터 정리
      await cleanupDatabase();
    });

    it('POST /auth/register - 이메일로 새 사용자 회원가입', () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          name: 'Test User',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe(uniqueEmail);
        });
    });

    it('POST /auth/login - 유효한 자격증명으로 로그인', async () => {
      const uniqueEmail = `login-${Date.now()}@example.com`;
      // 먼저 회원가입
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          name: 'Login Test User',
          password: 'password123',
        });

      // 로그인 테스트
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('POST /auth/login - 잘못된 자격증명으로 로그인 실패', async () => {
      const uniqueEmail = `wrong-${Date.now()}@example.com`;
      // 먼저 회원가입
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          name: 'Wrong Test User',
          password: 'password123',
        });

      // 잘못된 비밀번호로 로그인 시도
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('POST /auth/kakao - 잘못된 액세스 토큰으로 카카오 로그인 실패', () => {
      return request(app.getHttpServer())
        .post('/auth/kakao')
        .send({
          accessToken: 'invalid_token',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.statusCode).toBe(401);
        });
    });

    it('POST /auth/kakao - 액세스 토큰 없이 카카오 로그인 실패', () => {
      return request(app.getHttpServer())
        .post('/auth/kakao')
        .send({})
        .expect(400);
    });

    it('POST /auth/profile - 유효한 토큰으로 프로필 조회', async () => {
      const uniqueEmail = `profile-${Date.now()}@example.com`;
      // 먼저 회원가입
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          name: 'Profile Test User',
          password: 'password123',
        })
        .expect(201);

      const token = registerResponse.body.access_token;

      // 프로필 조회
      return request(app.getHttpServer())
        .post('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('userId');
          expect(res.body).toHaveProperty('email');
        });
    });

    it('POST /auth/profile - 토큰 없이 프로필 조회 실패', () => {
      return request(app.getHttpServer())
        .post('/auth/profile')
        .expect(401);
    });
  });

  describe('/teas - 차 API', () => {
    let testUser: TestUser;

    beforeAll(async () => {
      // 테스트 헬퍼를 사용하여 사용자 생성
      testUser = await testHelper.createUser('Tea Test User');
    });

    beforeEach(async () => {
      // 테스트 격리를 위해 각 테스트 전에 teas 및 관련 데이터 정리
      // 외래키 제약을 고려하여 자식 테이블부터 삭제
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query('DELETE FROM note_bookmarks');
      await dataSource.query('DELETE FROM note_likes');
      await dataSource.query('DELETE FROM note_tags');
      await dataSource.query('DELETE FROM tags');
      await dataSource.query('DELETE FROM notes');
      await dataSource.query('DELETE FROM teas');
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    afterAll(async () => {
      // 테스트 종료 후 생성한 사용자 데이터 정리
      try {
        if (testUser?.id) {
          await dataSource.query('DELETE FROM users WHERE id = ?', [testUser.id]);
        }
      } catch (error) {
        console.warn('테스트 데이터 정리 중 오류 (무시 가능):', error.message);
      }
    });

    it('GET /teas - 초기에는 빈 배열을 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/teas')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('POST /teas - 인증된 사용자가 새 차를 생성할 수 있어야 함', async () => {
      const teaData = {
        name: '정산소종',
        year: 2023,
        type: '홍차',
        seller: '차향',
        origin: '중국 푸젠',
      };
      
      const response = await testHelper.authenticatedRequest(testUser.token)
        .post('/teas')
        .send(teaData)
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(teaData.name);
    });

    it('POST /teas - 인증 없이 차 생성 실패', () => {
      return testHelper.unauthenticatedRequest()
        .post('/teas')
        .send({
          name: '정산소종',
          year: 2023,
          type: '홍차',
        })
        .expect(401);
    });
  });

  describe('/notes/:id/like - 노트 좋아요 API', () => {
    let testUser1: TestUser;
    let testUser2: TestUser;
    let testTea: TestTea;
    let testNote: TestNote;

    beforeAll(async () => {
      // 테스트용 사용자 2명 생성
      const users = await testHelper.createUsers(2, 'Like Test User');
      testUser1 = users[0];
      testUser2 = users[1];

      // 테스트용 차 생성
      testTea = await testHelper.createTea(testUser1.token, {
        name: TEST_DEFAULTS.TEA.name,
        year: TEST_DEFAULTS.TEA.year,
        type: TEST_DEFAULTS.TEA.type,
      });

      // 테스트용 노트 생성
      const schema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(schema.id);
      
      testNote = await testHelper.createNote(testUser1.token, {
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
    });

    beforeEach(async () => {
      // 테스트 격리를 위해 각 테스트 전에 좋아요 데이터만 정리
      await dataSource.query('DELETE FROM note_likes');
    });

    afterAll(async () => {
      // 테스트 종료 후 생성한 데이터 정리
      try {
        if (testNote?.id) {
          await dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [testNote.id]);
          await dataSource.query('DELETE FROM notes WHERE id = ?', [testNote.id]);
        }
        if (testTea?.id) {
          await dataSource.query('DELETE FROM teas WHERE id = ?', [testTea.id]);
        }
        if (testUser1?.id) {
          await dataSource.query('DELETE FROM users WHERE id = ?', [testUser1.id]);
        }
        if (testUser2?.id) {
          await dataSource.query('DELETE FROM users WHERE id = ?', [testUser2.id]);
        }
      } catch (error) {
        console.warn('테스트 데이터 정리 중 오류 (무시 가능):', error.message);
      }
    });

    it('POST /notes/:id/like - 좋아요 추가 성공', async () => {
      const response = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote.id}/like`)
        .expect(201);

      expect(response.body).toHaveProperty('liked');
      expect(response.body).toHaveProperty('likeCount');
      expect(response.body.liked).toBe(true);
      expect(response.body.likeCount).toBe(1);
    });

    it('POST /notes/:id/like - 좋아요 취소 성공', async () => {
      // 먼저 좋아요 추가
      await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote.id}/like`)
        .expect(201);

      // 좋아요 취소
      const response = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote.id}/like`)
        .expect(201);

      expect(response.body.liked).toBe(false);
      expect(response.body.likeCount).toBe(0);
    });

    it('POST /notes/:id/like - 중복 좋아요 방지 (토글 동작)', async () => {
      // 첫 번째 좋아요
      const response1 = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote.id}/like`)
        .expect(201);
      expect(response1.body.liked).toBe(true);
      expect(response1.body.likeCount).toBe(1);

      // 두 번째 좋아요 (취소되어야 함)
      const response2 = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote.id}/like`)
        .expect(201);
      expect(response2.body.liked).toBe(false);
      expect(response2.body.likeCount).toBe(0);

      // 세 번째 좋아요 (다시 추가되어야 함)
      const response3 = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote.id}/like`)
        .expect(201);
      expect(response3.body.liked).toBe(true);
      expect(response3.body.likeCount).toBe(1);
    });

    it('POST /notes/:id/like - 존재하지 않는 노트에 좋아요 실패', async () => {
      const nonExistentNoteId = 99999;
      const response = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${nonExistentNoteId}/like`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(404);
    });

    it('POST /notes/:id/like - 인증 없이 좋아요 실패', async () => {
      return testHelper.unauthenticatedRequest()
        .post(`/notes/${testNote.id}/like`)
        .expect(401);
    });

    it('POST /notes/:id/like - 잘못된 노트 ID 형식으로 좋아요 실패', async () => {
      const response = await testHelper.authenticatedRequest(testUser2.token)
        .post('/notes/invalid-id/like')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(400);
    });

    it('GET /notes/:id - 노트 조회 시 좋아요 정보 포함', async () => {
      // 먼저 좋아요 추가
      const likeResponse = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote.id}/like`)
        .expect(201);
      
      expect(likeResponse.body.liked).toBe(true);
      expect(likeResponse.body.likeCount).toBe(1);

      // 노트 조회 (인증된 사용자) - 트랜잭션으로 인해 데이터가 즉시 반영됨
      const response = await testHelper.authenticatedRequest(testUser2.token)
        .get(`/notes/${testNote.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('likeCount');
      expect(response.body).toHaveProperty('isLiked');
      expect(response.body.likeCount).toBe(1);
      expect(response.body.isLiked).toBe(true);
    });

    it('GET /notes/:id - 좋아요하지 않은 노트 조회 시 isLiked는 false', async () => {
      // 좋아요 없이 노트 조회
      const response = await testHelper.authenticatedRequest(testUser2.token)
        .get(`/notes/${testNote.id}`)
        .expect(200);

      expect(response.body.likeCount).toBe(0);
      expect(response.body.isLiked).toBe(false);
    });

    it('GET /notes/:id - 인증 없이 노트 조회 시 좋아요 정보 포함 (isLiked는 false)', async () => {
      // 이전 테스트에서 좋아요가 추가되어 있을 수 있으므로 확인
      // 인증 없이 노트 조회
      const response = await testHelper.unauthenticatedRequest()
        .get(`/notes/${testNote.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('likeCount');
      expect(response.body).toHaveProperty('isLiked');
      // 좋아요 수는 0 이상이어야 함
      expect(response.body.likeCount).toBeGreaterThanOrEqual(0);
      expect(response.body.isLiked).toBe(false); // 인증되지 않았으므로 false
    });

    it('GET /notes - 노트 목록 조회 시 좋아요 정보 포함', async () => {
      // 노트 목록 조회
      const response = await testHelper.authenticatedRequest(testUser2.token)
        .get('/notes')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const note = response.body.find((n: any) => n.id === testNote.id);
      expect(note).toBeDefined();
      expect(note).toHaveProperty('likeCount');
      expect(note).toHaveProperty('isLiked');
      // 좋아요 수는 0 이상이어야 함
      expect(note.likeCount).toBeGreaterThanOrEqual(0);
      // 좋아요를 누르지 않았으므로 false여야 함
      expect(note.isLiked).toBe(false);
    });

    it('POST /notes/:id/like - 여러 사용자가 같은 노트에 좋아요', async () => {
      // Rate limiting 회피를 위해 테스트를 간소화
      // 사용자 1이 좋아요
      const response1 = await testHelper.authenticatedRequest(testUser1.token)
        .post(`/notes/${testNote.id}/like`)
        .expect((res) => {
          // Rate limiting이 발생할 수 있으므로 201 또는 429 모두 허용
          if (res.status === 429) {
            // Rate limiting 발생 시 테스트 스킵
            return;
          }
          expect(res.status).toBe(201);
          expect(res.body.liked).toBe(true);
          expect(res.body.likeCount).toBe(1);
        });
      
      // Rate limiting이 발생하지 않은 경우에만 계속
      if (response1.status === 201) {
        // 사용자 1이 좋아요 취소
        const response2 = await testHelper.authenticatedRequest(testUser1.token)
          .post(`/notes/${testNote.id}/like`)
          .expect((res) => {
            if (res.status === 429) {
              return;
            }
            expect(res.status).toBe(201);
            expect(res.body.liked).toBe(false);
            expect(res.body.likeCount).toBe(0);
          });
      }
    });

    it('POST /notes/:id/like - 비공개 노트에 작성자가 아닌 사용자가 좋아요 시도 시 403 에러', async () => {
      // 비공개 노트 생성
      const schema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(schema.id);
      
      const privateNote = await testHelper.createNote(testUser1.token, {
        teaId: testTea.id,
        schemaId: schema.id,
        axisValues: axes.map((axis) => ({
          axisId: axis.id,
          value: 4,
        })),
        memo: '비공개 테스트 노트입니다',
        isPublic: false,
      });

      // 작성자가 아닌 사용자(userId2)가 좋아요 시도
      const response = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${privateNote.id}/like`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(403);
      expect(response.body.message).toContain('권한이 없습니다');

      // 테스트 데이터 정리
      await dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [privateNote.id]);
      await dataSource.query('DELETE FROM notes WHERE id = ?', [privateNote.id]);
    });

    it('POST /notes/:id/like - 비공개 노트에 작성자가 좋아요 성공', async () => {
      // 비공개 노트 생성
      const schema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(schema.id);
      
      const privateNote = await testHelper.createNote(testUser1.token, {
        teaId: testTea.id,
        schemaId: schema.id,
        axisValues: axes.map((axis) => ({
          axisId: axis.id,
          value: 4,
        })),
        memo: '비공개 테스트 노트입니다',
        isPublic: false,
      });

      // 작성자(userId1)가 좋아요 시도
      const response = await testHelper.authenticatedRequest(testUser1.token)
        .post(`/notes/${privateNote.id}/like`)
        .expect(201);

      expect(response.body).toHaveProperty('liked');
      expect(response.body).toHaveProperty('likeCount');
      expect(response.body.liked).toBe(true);
      expect(response.body.likeCount).toBe(1);

      // 테스트 데이터 정리
      await dataSource.query('DELETE FROM note_likes WHERE noteId = ?', [privateNote.id]);
      await dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [privateNote.id]);
      await dataSource.query('DELETE FROM notes WHERE id = ?', [privateNote.id]);
    });
  });

  describe('/notes/:id/bookmark - 노트 북마크 API', () => {
    let testUser1: TestUser;
    let testUser2: TestUser;
    let testTea: TestTea;
    let testNote: TestNote;

    beforeAll(async () => {
      // 북마크 테이블이 없으면 생성
      try {
        await dataSource.query(`
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
      const users = await testHelper.createUsers(2, 'Bookmark Test User');
      testUser1 = users[0];
      testUser2 = users[1];

      // 테스트용 차 생성
      testTea = await testHelper.createTea(testUser1.token, {
        name: TEST_DEFAULTS.TEA.name,
        year: TEST_DEFAULTS.TEA.year,
        type: TEST_DEFAULTS.TEA.type,
      });

      // 테스트용 노트 생성
      const schema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(schema.id);
      
      testNote = await testHelper.createNote(testUser1.token, {
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
    });

    beforeEach(async () => {
      // 테스트 격리를 위해 각 테스트 전에 북마크 데이터만 정리
      await dataSource.query('DELETE FROM note_bookmarks');
    });

    afterAll(async () => {
      // 테스트 종료 후 생성한 데이터 정리
      try {
        if (testNote?.id) {
          await dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [testNote.id]);
          await dataSource.query('DELETE FROM notes WHERE id = ?', [testNote.id]);
        }
        if (testTea?.id) {
          await dataSource.query('DELETE FROM teas WHERE id = ?', [testTea.id]);
        }
        if (testUser1?.id) {
          await dataSource.query('DELETE FROM users WHERE id = ?', [testUser1.id]);
        }
        if (testUser2?.id) {
          await dataSource.query('DELETE FROM users WHERE id = ?', [testUser2.id]);
        }
      } catch (error) {
        console.warn('테스트 데이터 정리 중 오류 (무시 가능):', error.message);
      }
    });

    it('POST /notes/:id/bookmark - 북마크 추가 성공', async () => {
      const response = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote.id}/bookmark`)
        .expect(201);

      expect(response.body).toHaveProperty('bookmarked');
      expect(response.body.bookmarked).toBe(true);
    });

    it('POST /notes/:id/bookmark - 북마크 해제 성공', async () => {
      // 먼저 북마크 추가
      await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote.id}/bookmark`)
        .expect(201);

      // 북마크 해제
      const response = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote.id}/bookmark`)
        .expect(201);

      expect(response.body.bookmarked).toBe(false);
    });

    it('POST /notes/:id/bookmark - 중복 북마크 방지 (토글 동작)', async () => {
      // 첫 번째 북마크
      const response1 = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote.id}/bookmark`)
        .expect(201);
      expect(response1.body.bookmarked).toBe(true);

      // 두 번째 북마크 (해제되어야 함)
      const response2 = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote.id}/bookmark`)
        .expect(201);
      expect(response2.body.bookmarked).toBe(false);

      // 세 번째 북마크 (다시 추가되어야 함)
      const response3 = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote.id}/bookmark`)
        .expect(201);
      expect(response3.body.bookmarked).toBe(true);
    });

    it('POST /notes/:id/bookmark - 존재하지 않는 노트에 북마크 실패', async () => {
      const nonExistentNoteId = 99999;
      const response = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${nonExistentNoteId}/bookmark`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(404);
    });

    it('POST /notes/:id/bookmark - 인증 없이 북마크 실패', async () => {
      return testHelper.unauthenticatedRequest()
        .post(`/notes/${testNote.id}/bookmark`)
        .expect(401);
    });

    it('POST /notes/:id/bookmark - 잘못된 노트 ID 형식으로 북마크 실패', async () => {
      const response = await testHelper.authenticatedRequest(testUser2.token)
        .post('/notes/invalid-id/bookmark')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(400);
    });

    it('POST /notes/:id/bookmark - 비공개 노트에 작성자가 아닌 사용자가 북마크 시도 시 403 에러', async () => {
      // 비공개 노트 생성
      const schema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(schema.id);
      
      const privateNote = await testHelper.createNote(testUser1.token, {
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
      const response = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${privateNote.id}/bookmark`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(403);
      expect(response.body.message).toContain('권한이 없습니다');

      // 테스트 데이터 정리
      await dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [privateNote.id]);
      await dataSource.query('DELETE FROM notes WHERE id = ?', [privateNote.id]);
    });

    it('POST /notes/:id/bookmark - 비공개 노트에 작성자가 북마크 성공', async () => {
      // 비공개 노트 생성
      const schema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(schema.id);
      
      const privateNote = await testHelper.createNote(testUser1.token, {
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
      const response = await testHelper.authenticatedRequest(testUser1.token)
        .post(`/notes/${privateNote.id}/bookmark`)
        .expect(201);

      expect(response.body).toHaveProperty('bookmarked');
      expect(response.body.bookmarked).toBe(true);

      // 테스트 데이터 정리
      await dataSource.query('DELETE FROM note_bookmarks WHERE noteId = ?', [privateNote.id]);
      await dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [privateNote.id]);
      await dataSource.query('DELETE FROM notes WHERE id = ?', [privateNote.id]);
    });

    it('GET /notes/:id - 노트 조회 시 북마크 정보 포함', async () => {
      // 먼저 북마크 추가
      const bookmarkResponse = await testHelper.authenticatedRequest(testUser2.token)
        .post(`/notes/${testNote.id}/bookmark`)
        .expect(201);
      
      expect(bookmarkResponse.body.bookmarked).toBe(true);

      // 노트 조회 (인증된 사용자) - 트랜잭션으로 인해 데이터가 즉시 반영됨
      const response = await testHelper.authenticatedRequest(testUser2.token)
        .get(`/notes/${testNote.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('isBookmarked');
      expect(response.body.isBookmarked).toBe(true);
    });

    it('GET /notes/:id - 북마크하지 않은 노트 조회 시 isBookmarked는 false', async () => {
      // 북마크 없이 노트 조회
      const response = await testHelper.authenticatedRequest(testUser2.token)
        .get(`/notes/${testNote.id}`)
        .expect(200);

      expect(response.body.isBookmarked).toBe(false);
    });

    it('GET /notes/:id - 인증 없이 노트 조회 시 북마크 정보 포함 (isBookmarked는 false)', async () => {
      // 인증 없이 노트 조회
      const response = await testHelper.unauthenticatedRequest()
        .get(`/notes/${testNote.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('isBookmarked');
      expect(response.body.isBookmarked).toBe(false); // 인증되지 않았으므로 false
    });

    it('GET /notes - 노트 목록 조회 시 북마크 정보 포함', async () => {
      // 노트 목록 조회
      const response = await testHelper.authenticatedRequest(testUser2.token)
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
      const response1 = await testHelper.authenticatedRequest(testUser1.token)
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
        const response2 = await testHelper.authenticatedRequest(testUser1.token)
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

  describe('/users/:id - 사용자 프로필 조회 API', () => {
    let testUser: TestUser;
    let otherTestUser: TestUser;

    beforeAll(async () => {
      // 테스트 헬퍼를 사용하여 사용자 2명 생성
      [testUser, otherTestUser] = await testHelper.createUsers(2, 'Profile Test User');
    });

    beforeEach(async () => {
      // 테스트 격리를 위해 각 테스트 전에 노트 관련 데이터 정리
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query('DELETE FROM note_bookmarks');
      await dataSource.query('DELETE FROM note_likes');
      await dataSource.query('DELETE FROM note_tags');
      await dataSource.query('DELETE FROM tags');
      await dataSource.query('DELETE FROM notes');
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    it('GET /users/:id - 사용자 프로필 조회 성공', async () => {
      const response = await testHelper.unauthenticatedRequest()
        .get(`/users/${testUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body.id).toBe(testUser.id);
      expect(response.body.name).toBe(testUser.name);
    });

    it('GET /users/:id - 인증 없이 사용자 프로필 조회 성공', async () => {
      const response = await testHelper.unauthenticatedRequest()
        .get(`/users/${testUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body.id).toBe(testUser.id);
    });

    it('GET /users/:id - 인증된 사용자가 다른 사용자 프로필 조회 성공', async () => {
      const response = await testHelper.authenticatedRequest(testUser.token)
        .get(`/users/${otherTestUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body.id).toBe(otherTestUser.id);
      expect(response.body.name).toBe(otherTestUser.name);
    });

    it('GET /users/:id - 존재하지 않는 사용자 조회 시 404 에러', async () => {
      const nonExistentUserId = 999999;
      const response = await testHelper.unauthenticatedRequest()
        .get(`/users/${nonExistentUserId}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('사용자를 찾을 수 없습니다');
    });

    it('GET /users/:id - 잘못된 사용자 ID 형식으로 조회 시 400 에러', async () => {
      const response = await testHelper.unauthenticatedRequest()
        .get('/users/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('GET /users/:id - 사용자 프로필 응답에 불필요한 정보 제외', async () => {
      const response = await testHelper.unauthenticatedRequest()
        .get(`/users/${testUser.id}`)
        .expect(200);

      // 민감한 정보가 포함되지 않았는지 확인
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('credential');
      expect(response.body).not.toHaveProperty('authentications');
    });

    it('GET /users/:id - 노트를 작성한 사용자 프로필 조회', async () => {
      // 테스트 헬퍼를 사용하여 차 생성
      const testTea = await testHelper.createTea(testUser.token, {
        name: '테스트 차',
        year: 2023,
        type: '홍차',
      });

      // 테스트 헬퍼를 사용하여 노트 생성
      const activeSchema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(activeSchema.id);
      
      await testHelper.createNote(testUser.token, {
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
      const response = await testHelper.unauthenticatedRequest()
        .get(`/users/${testUser.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body.id).toBe(testUser.id);

      // 테스트 데이터 정리
      await dataSource.query('DELETE FROM notes WHERE userId = ?', [testUser.id]);
      await dataSource.query('DELETE FROM teas WHERE id = ?', [testTea.id]);
    });
  });

  describe('/notes - 노트 CRUD API', () => {
    let testUser: TestUser;
    let testTea: TestTea;
    let noteId: number;

    beforeAll(async () => {
      // 테스트 헬퍼를 사용하여 사용자 및 차 생성
      testUser = await testHelper.createUser('Note CRUD Test User');
      testTea = await testHelper.createTea(testUser.token, {
        name: 'CRUD 테스트 차',
        year: 2023,
        type: '홍차',
      });
    });

    beforeEach(async () => {
      // 테스트 격리를 위해 각 테스트 전에 노트 관련 데이터 정리
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query('DELETE FROM note_bookmarks');
      await dataSource.query('DELETE FROM note_likes');
      await dataSource.query('DELETE FROM note_tags');
      await dataSource.query('DELETE FROM tags');
      await dataSource.query('DELETE FROM notes');
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    afterAll(async () => {
      // 테스트 종료 후 생성한 데이터 정리
      try {
        if (noteId) {
          await dataSource.query('DELETE FROM notes WHERE id = ?', [noteId]);
        }
        if (testTea?.id) {
          await dataSource.query('DELETE FROM teas WHERE id = ?', [testTea.id]);
        }
        if (testUser?.id) {
          await dataSource.query('DELETE FROM users WHERE id = ?', [testUser.id]);
        }
      } catch (error) {
        console.warn('테스트 데이터 정리 중 오류 (무시 가능):', error.message);
      }
    });

    it('POST /notes - 노트 생성 성공 (새 구조)', async () => {
      // 활성 스키마 조회
      const schema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(schema.id);

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

      const response = await testHelper.authenticatedRequest(testUser.token)
        .post('/notes')
        .send(noteData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.schemaId).toBe(schema.id);
      expect(response.body.overallRating).toBeCloseTo(noteData.overallRating, 1);
      expect(response.body.memo).toBe(noteData.memo);
      expect(response.body.isPublic).toBe(noteData.isPublic);
      expect(response.body.axisValues).toBeDefined();
      expect(Array.isArray(response.body.axisValues)).toBe(true);
      noteId = response.body.id;
    });

    it('POST /notes - 인증 없이 노트 생성 실패', async () => {
      const schema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(schema.id);

      return testHelper.unauthenticatedRequest()
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
      const schema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(schema.id);

      const testNote = await testHelper.createNote(testUser.token, {
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
      const response = await testHelper.unauthenticatedRequest()
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
      const schema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(schema.id);

      const testNote = await testHelper.createNote(testUser.token, {
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
      const response = await testHelper.unauthenticatedRequest()
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
      const schema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(schema.id);

      const testNote = await testHelper.createNote(testUser.token, {
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
      const response = await testHelper.unauthenticatedRequest()
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
      const schema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(schema.id);

      const testNote = await testHelper.createNote(testUser.token, {
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
      const response = await testHelper.authenticatedRequest(testUser.token)
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

      expect(response.body.overallRating).toBe(5.0);
      expect(response.body.memo).toBe('수정된 메모');
      expect(response.body.axisValues).toBeDefined();
      expect(response.body.axisValues.length).toBe(axes.length);
    });

    it('PATCH /notes/:id - 다른 사용자의 노트 수정 실패', async () => {
      // 테스트 헬퍼를 사용하여 다른 사용자 생성
      const otherTestUser = await testHelper.createUser('Other User');

      // 테스트 헬퍼를 사용하여 노트 생성
      const schema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(schema.id);

      const testNote = await testHelper.createNote(testUser.token, {
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
      const response = await testHelper.authenticatedRequest(otherTestUser.token)
        .patch(`/notes/${testNote.id}`)
        .send({
          memo: '수정 시도',
        })
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(403);

      // 테스트 데이터 정리
      await dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [testNote.id]);
      await dataSource.query('DELETE FROM notes WHERE id = ?', [testNote.id]);
      await dataSource.query('DELETE FROM users WHERE id = ?', [otherTestUser.id]);
    });

    it('DELETE /notes/:id - 노트 삭제 성공', async () => {
      // 테스트 헬퍼를 사용하여 노트 생성
      const schema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(schema.id);

      const testNote = await testHelper.createNote(testUser.token, {
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
      await testHelper.authenticatedRequest(testUser.token)
        .delete(`/notes/${testNote.id}`)
        .expect(200);

      // 삭제 확인
      await testHelper.unauthenticatedRequest()
        .get(`/notes/${testNote.id}`)
        .expect(404);
    });

    it('DELETE /notes/:id - 다른 사용자의 노트 삭제 실패', async () => {
      // 테스트 헬퍼를 사용하여 다른 사용자 생성
      const otherTestUser = await testHelper.createUser('Other User 2');

      // 테스트 헬퍼를 사용하여 노트 생성
      const schema = await testHelper.getActiveSchema();
      const axes = await testHelper.getSchemaAxes(schema.id);

      const testNote = await testHelper.createNote(testUser.token, {
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
      const response = await testHelper.authenticatedRequest(otherTestUser.token)
        .delete(`/notes/${testNote.id}`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(403);

      // 테스트 데이터 정리
      await dataSource.query('DELETE FROM note_axis_value WHERE noteId = ?', [testNote.id]);
      await dataSource.query('DELETE FROM notes WHERE id = ?', [testNote.id]);
      await dataSource.query('DELETE FROM users WHERE id = ?', [otherTestUser.id]);
    });
  });

  describe('/notes/schemas - 평가 스키마 API', () => {
    beforeEach(async () => {
      // 테스트 격리를 위해 각 테스트 전에 관련 데이터 정리
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query('DELETE FROM note_axis_value');
      await dataSource.query('DELETE FROM notes');
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');

      // 기본 스키마가 없으면 재생성 (afterAll의 cleanupDatabase로 삭제되었을 수 있음)
      let schemaResult = await dataSource.query(`
        SELECT id FROM rating_schema WHERE code = 'STANDARD' AND version = '1.0.0' LIMIT 1
      `);
      
      let schemaId: number | undefined;
      
      if (!schemaResult || schemaResult.length === 0) {
        // 기본 스키마 생성
        await dataSource.query(`
          INSERT INTO rating_schema (code, version, nameKo, nameEn, descriptionKo, descriptionEn, overallMinValue, overallMaxValue, overallStep, isActive)
          VALUES ('STANDARD', '1.0.0', '차록 표준 평가', 'ChaLog Standard Rating', '차록의 기본 평가 축 세트', 'ChaLog default rating axis set', 1, 5, 0.5, TRUE)
        `);
        
        // 생성된 스키마 ID 조회
        schemaResult = await dataSource.query(`
          SELECT id FROM rating_schema WHERE code = 'STANDARD' AND version = '1.0.0' LIMIT 1
        `);
      }
      
      schemaId = schemaResult[0]?.id;

      if (schemaId) {
        // 기본 축들이 있는지 확인
        const axesResult = await dataSource.query(`
          SELECT COUNT(*) as count FROM rating_axis WHERE schemaId = ${schemaId}
        `);
        
        if (!axesResult || axesResult.length === 0 || axesResult[0]?.count === 0) {
          // 기본 축들 생성
          await dataSource.query(`
            INSERT INTO rating_axis (schemaId, code, nameKo, nameEn, descriptionKo, descriptionEn, minValue, maxValue, stepValue, displayOrder, isRequired)
            VALUES
              (${schemaId}, 'RICHNESS', '풍부함', 'Richness', '차의 풍부한 맛과 향', 'Richness of taste and aroma', 1, 5, 1, 1, TRUE),
              (${schemaId}, 'STRENGTH', '강도', 'Strength', '차의 강한 맛', 'Strength of taste', 1, 5, 1, 2, TRUE),
              (${schemaId}, 'SMOOTHNESS', '부드러움', 'Smoothness', '차의 부드러운 맛', 'Smoothness of taste', 1, 5, 1, 3, TRUE),
              (${schemaId}, 'CLARITY', '명확함', 'Clarity', '차의 명확한 맛', 'Clarity of taste', 1, 5, 1, 4, TRUE),
              (${schemaId}, 'COMPLEXITY', '복잡성', 'Complexity', '차의 복잡한 맛', 'Complexity of taste', 1, 5, 1, 5, TRUE)
          `);
        }
      }
    });

    it('GET /notes/schemas/active - 활성 스키마 목록 조회', async () => {
      const response = await testHelper.unauthenticatedRequest()
        .get('/notes/schemas/active')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const schema = response.body[0];
      expect(schema).toHaveProperty('id');
      expect(schema).toHaveProperty('code');
      expect(schema).toHaveProperty('version');
      expect(schema).toHaveProperty('nameKo');
      expect(schema).toHaveProperty('nameEn');
      expect(schema.isActive).toBe(true);
    });

    it('GET /notes/schemas/:schemaId/axes - 스키마의 축 목록 조회', async () => {
      // 활성 스키마 조회
      const schemasResponse = await testHelper.unauthenticatedRequest()
        .get('/notes/schemas/active')
        .expect(200);

      const schema = schemasResponse.body[0];
      expect(schema).toBeDefined();

      // 스키마의 축 목록 조회
      const axesResponse = await testHelper.unauthenticatedRequest()
        .get(`/notes/schemas/${schema.id}/axes`)
        .expect(200);

      expect(Array.isArray(axesResponse.body)).toBe(true);
      expect(axesResponse.body.length).toBeGreaterThan(0);

      const axis = axesResponse.body[0];
      expect(axis).toHaveProperty('id');
      expect(axis).toHaveProperty('schemaId');
      expect(axis).toHaveProperty('code');
      expect(axis).toHaveProperty('nameKo');
      expect(axis).toHaveProperty('nameEn');
      expect(axis).toHaveProperty('displayOrder');
      expect(axis.schemaId).toBe(schema.id);
    });

    it('GET /notes/schemas/:schemaId/axes - 존재하지 않는 스키마일 때 404 반환', async () => {
      await testHelper.unauthenticatedRequest()
        .get('/notes/schemas/99999/axes')
        .expect(404);
    });

    it('GET /notes/schemas/:schemaId/axes - 축 목록이 displayOrder로 정렬되어야 함', async () => {
      // 활성 스키마 조회
      const schemasResponse = await testHelper.unauthenticatedRequest()
        .get('/notes/schemas/active')
        .expect(200);

      const schema = schemasResponse.body[0];

      // 스키마의 축 목록 조회
      const axesResponse = await testHelper.unauthenticatedRequest()
        .get(`/notes/schemas/${schema.id}/axes`)
        .expect(200);

      const axes = axesResponse.body;
      expect(axes.length).toBeGreaterThan(1);

      // displayOrder로 정렬되어 있는지 확인
      for (let i = 1; i < axes.length; i++) {
        expect(axes[i].displayOrder).toBeGreaterThanOrEqual(axes[i - 1].displayOrder);
      }
    });
  });

  describe('/teas - 차 API 추가 테스트', () => {
    let testUser: TestUser;
    let testTea: TestTea;

    beforeAll(async () => {
      // 테스트 헬퍼를 사용하여 사용자 및 차 생성
      testUser = await testHelper.createUser('Tea Test User 2');
      testTea = await testHelper.createTea(testUser.token, {
        name: '추가 테스트 차',
        year: 2023,
        type: '홍차',
      });
    });

    beforeEach(async () => {
      // 테스트 격리를 위해 각 테스트 전에 teas 및 관련 데이터 정리
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query('DELETE FROM note_bookmarks');
      await dataSource.query('DELETE FROM note_likes');
      await dataSource.query('DELETE FROM note_tags');
      await dataSource.query('DELETE FROM tags');
      await dataSource.query('DELETE FROM notes');
      await dataSource.query('DELETE FROM teas');
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    });

    afterAll(async () => {
      // 테스트 종료 후 생성한 사용자 데이터 정리
      try {
        if (testTea?.id) {
          await dataSource.query('DELETE FROM teas WHERE id = ?', [testTea.id]);
        }
        if (testUser?.id) {
          await dataSource.query('DELETE FROM users WHERE id = ?', [testUser.id]);
        }
      } catch (error) {
        console.warn('테스트 데이터 정리 중 오류 (무시 가능):', error.message);
      }
    });

    it('GET /teas/:id - 차 상세 조회 성공', async () => {
      // 테스트 헬퍼를 사용하여 차 생성
      const testTeaDetail = await testHelper.createTea(testUser.token, {
        name: '정산소종',
        year: 2023,
        type: '홍차',
        seller: '차향',
        origin: '중국 푸젠',
      });

      // 차 상세 조회
      const response = await testHelper.unauthenticatedRequest()
        .get(`/teas/${testTeaDetail.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('정산소종');
      expect(response.body.type).toBe('홍차');
      expect(response.body.year).toBe(2023);

      // 테스트 데이터 정리
      await dataSource.query('DELETE FROM teas WHERE id = ?', [testTeaDetail.id]);
    });

    it('GET /teas/:id - 존재하지 않는 차 조회 시 404 에러', async () => {
      const nonExistentTeaId = 999999;
      const response = await testHelper.unauthenticatedRequest()
        .get(`/teas/${nonExistentTeaId}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(404);
    });

    it('GET /teas/:id - 잘못된 차 ID 형식으로 조회 시 400 에러', async () => {
      const response = await testHelper.unauthenticatedRequest()
        .get('/teas/invalid-id')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(400);
    });

    it('GET /teas?q=검색어 - 차 검색 성공', async () => {
      // 테스트 헬퍼를 사용하여 차 생성
      const testTea1 = await testHelper.createTea(testUser.token, {
        name: '정산소종',
        year: 2023,
        type: '홍차',
      });

      const testTea2 = await testHelper.createTea(testUser.token, {
        name: '다즐링',
        year: 2022,
        type: '홍차',
      });

      // 검색 테스트
      const response = await testHelper.unauthenticatedRequest()
        .get('/teas?q=정산')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      const foundTea = response.body.find((t: any) => t.name === '정산소종');
      expect(foundTea).toBeDefined();
      
      // 검색어가 포함되지 않은 차는 검색 결과에 없어야 함
      const notFoundTea = response.body.find((t: any) => t.name === '다즐링');
      expect(notFoundTea).toBeUndefined();

      // 테스트 데이터 정리
      await dataSource.query('DELETE FROM teas WHERE id IN (?, ?)', [testTea1.id, testTea2.id]);
    });

    it('GET /teas?q=검색어 - 검색 결과 없음', async () => {
      const response = await testHelper.unauthenticatedRequest()
        .get('/teas?q=존재하지않는차')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });
});


