import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(404);
  });

  describe('/auth', () => {
    it('POST /auth/register - should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe('test@example.com');
        });
    });

    it('POST /auth/login - should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('POST /auth/login - should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('/teas', () => {
    let authToken: string;

    beforeAll(async () => {
      // 테스트용 사용자 등록 및 로그인
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'teatest@example.com',
          name: 'Tea Test User',
          password: 'password123',
        });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'teatest@example.com',
          password: 'password123',
        });

      authToken = loginResponse.body.access_token;
    });

    beforeEach(async () => {
      // 테스트 격리를 위해 각 테스트 전에 teas 및 관련 notes 데이터 정리
      // 외래키 제약으로 인해 notes를 먼저 삭제
      await dataSource.query('DELETE FROM notes');
      await dataSource.query('DELETE FROM teas');
    });

    it('GET /teas - should return empty array initially', async () => {
      const response = await request(app.getHttpServer())
        .get('/teas')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('POST /teas - should create a new tea with authentication', () => {
      return request(app.getHttpServer())
        .post('/teas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '정산소종',
          year: 2023,
          type: '홍차',
          seller: '차향',
          origin: '중국 푸젠',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('정산소종');
        });
    });

    it('POST /teas - should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/teas')
        .send({
          name: '정산소종',
          year: 2023,
          type: '홍차',
        })
        .expect(401);
    });
  });
});

