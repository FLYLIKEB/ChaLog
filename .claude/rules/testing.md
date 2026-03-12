# Testing

## Frontend (Vitest + Testing Library)
- Test files: `src/**/__tests__/*.test.tsx`
- Setup: `src/test/setup.ts`
- Pattern: Arrange → Act → Assert

## Backend E2E (Jest)
```
backend/test/
├── app.e2e-spec.ts           # 메인 (모든 스위트 import)
├── setup/test-setup.ts       # setupTestApp(), teardownTestApp(), cleanupDatabase()
├── suites/                   # 기능별 테스트 (auth, teas, notes-crud, notes-bookmark, ...)
├── helpers/test-helper.ts    # createUser(), createTea(), createNote(), authenticatedRequest()
└── constants/test-constants.ts
```

## Test DB 격리
- 반드시 별도 테스트 DB 사용 (`TEST_DATABASE_URL` in `.env.test`)
- DB 이름에 반드시 `test` 포함 (예: `chalog_test`)
- Cleanup 순서: `note_bookmarks` → `note_likes` → `note_axis_value` → `note_tags` → `tags` → `notes` → `rating_axis` → `rating_schema` → `teas` → `user_authentications` → `users`
- Cleanup 전 `SET FOREIGN_KEY_CHECKS = 0`

## 실행
```bash
npm run test:run                    # 프론트엔드 (단일 실행)
cd backend && npm run test          # 백엔드 단위
cd backend && npm run test:e2e      # 백엔드 E2E
```

## Import 규칙
- supertest: 반드시 default import → `import request from 'supertest'`
- namespace import 금지: `import * as request` (TypeScript call signature 에러)

## 디버깅
- 실패 테스트 먼저 작성 → 원인 파악 → 수정 (TDD 순서)
- 백엔드 로그: `tail -f /tmp/chalog-backend.log`
