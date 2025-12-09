import request from 'supertest';
import { TestContext, setupTestApp, teardownTestApp } from './setup/test-setup';
import { TEST_CONSTANTS } from './constants/test-constants';

// 모든 테스트 스위트 import
import './suites/auth.e2e-spec';
import './suites/teas.e2e-spec';
import './suites/notes-like.e2e-spec';
import './suites/notes-bookmark.e2e-spec';
import './suites/users.e2e-spec';
import './suites/notes-crud.e2e-spec';
import './suites/notes-schemas.e2e-spec';

describe('AppController (e2e)', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await setupTestApp();
  }, TEST_CONSTANTS.TEST_TIMEOUT);

  afterAll(async () => {
    await teardownTestApp(context);
  });

  it('/ (GET)', () => {
    return request(context.app.getHttpServer())
      .get('/')
      .expect(404);
  });
});
