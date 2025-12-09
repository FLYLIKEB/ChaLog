## Testing

### Test Structure
- Frontend: Vitest + Testing Library (`*.test.tsx` in `__tests__/`)
- Backend: Jest (`*.spec.ts` alongside source, E2E in `test/`)
- Pattern: Arrange → Act → Assert

### Backend E2E Test Structure
백엔드 E2E 테스트는 기능별로 분리되어 있습니다:

```
backend/test/
├── app.e2e-spec.ts          # 메인 테스트 파일 (모든 스위트 import)
├── setup/
│   └── test-setup.ts        # 공통 테스트 설정
│       - setupTestApp()      # 앱 초기화
│       - teardownTestApp()  # 앱 종료 및 정리
│       - ensureDefaultSchema()  # 기본 스키마 생성
│       - cleanupDatabase()  # DB 정리 헬퍼
├── suites/                  # 기능별 테스트 파일들
│   ├── auth.e2e-spec.ts     # 인증 API
│   ├── teas.e2e-spec.ts     # 차 API
│   ├── notes-like.e2e-spec.ts      # 노트 좋아요 API
│   ├── notes-bookmark.e2e-spec.ts  # 노트 북마크 API
│   ├── users.e2e-spec.ts    # 사용자 프로필 API
│   ├── notes-crud.e2e-spec.ts      # 노트 CRUD API
│   └── notes-schemas.e2e-spec.ts   # 평가 스키마 API
├── helpers/
│   └── test-helper.ts      # 테스트 헬퍼 클래스
│       - createUser()       # 사용자 생성
│       - createTea()        # 차 생성
│       - createNote()       # 노트 생성
│       - getActiveSchema()  # 활성 스키마 조회
│       - authenticatedRequest()  # 인증된 요청
│       - unauthenticatedRequest()  # 인증 없는 요청
└── constants/
    └── test-constants.ts    # 테스트 상수
```

### Test Database Isolation (Backend E2E)
- Always use separate test database (never use production DB)
- Test DB name must contain `test` or `_test` (e.g., `chalog_test`)
- Use `TEST_DATABASE_URL` in `.env.test` file
- Test DB is automatically cleaned up after all tests complete
- Each test suite (`describe`) cleans up its own data in `beforeEach`
- Foreign key constraints are handled during cleanup

### Test Execution
- Backend E2E: `cd backend && npm run test:e2e`
- Tests automatically load `.env.test` if available
- Verify test DB name in console output before running tests
- If test DB name doesn't contain `test`, fix `.env.test` configuration
- 각 테스트 스위트는 독립적으로 실행 가능 (자체 `beforeAll`/`afterAll` 포함)

### Test Isolation Requirements
- Each test suite must clean up data in `beforeEach` or `afterEach`
- Use `cleanupDatabase()` helper function from `test/setup/test-setup.ts` for consistent cleanup order
- Cleanup order (used by `cleanupDatabase()`): child tables first → parent tables
  - `note_bookmarks` → `note_likes` → `note_axis_value` → `note_tags` → `tags` → `notes` → `rating_axis` → `rating_schema` → `teas` → `user_authentications` → `users`
- Note: Individual test suites may perform more granular cleanup in their `beforeEach` handlers
- Disable foreign key checks during cleanup: `SET FOREIGN_KEY_CHECKS = 0`

### Writing New Tests
1. **새 테스트 스위트 추가**:
   - `test/suites/` 디렉토리에 새 파일 생성 (예: `new-feature.e2e-spec.ts`)
   - `test/app.e2e-spec.ts`에 import 추가
   - `setupTestApp()`로 context 초기화
   - `teardownTestApp()`로 정리

2. **테스트 헬퍼 사용**:
   ```typescript
   import { TestContext, setupTestApp, teardownTestApp } from '../setup/test-setup';
   
   describe('New Feature', () => {
     let context: TestContext;
     
     beforeAll(async () => {
       context = await setupTestApp();
     });
     
     afterAll(async () => {
       await teardownTestApp(context);
     });
     
     it('should work', async () => {
       const user = await context.testHelper.createUser('Test User');
       // 테스트 코드...
     });
   });
   ```

### Before Writing Tests
- Ensure test database exists and has all required tables
- Verify `.env.test` file is configured correctly
- Check that test DB name contains `test` or `_test`
- Use `TestHelper` class for common operations (user/tea/note creation)

### Import Rules
- Always use default import for `supertest`: `import request from 'supertest'`
- Never use namespace import: `import * as request from 'supertest'` (causes TypeScript call signature errors)
- Import test setup from `'../setup/test-setup'` or `'./setup/test-setup'` depending on file location

