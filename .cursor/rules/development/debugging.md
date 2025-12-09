## Debugging Process (TDD-based)

### 1. Reproduce with Failing Test
- Write a **failing test** that reproduces the bug
- If reproduction fails, inform the user
- **Do not start fixing** until explicitly asked

### 2. Identify Root Cause
- Analyze possible causes and explain **why** and **when** it occurs
- Suggest verification methods (what to log, what to check)
- **Only explain**, don't execute yet

### 3. Fix with Ideal Flow
- Add test file to `.cursorignore`
- Create a **flowchart** of ideal behavior
- Fix code to make test pass
- Inform user if confirmation needed

### Key Principle
**Understand first, fix second** - Never fix without understanding root cause

## Backend Server Logging

### 서버 로그 확인 방법
백엔드 서버의 에러 로그를 확인할 때는 다음 방법을 사용:

1. **스크립트로 실행한 경우** (`start-local.sh` 사용):
   ```bash
   # 백엔드 로그 실시간 확인
   tail -f /tmp/chalog-backend.log
   
   # 프론트엔드 로그 실시간 확인
   tail -f /tmp/chalog-frontend.log
   ```
   `start-local.sh` 스크립트는 로그를 자동으로 `/tmp/chalog-backend.log`와 `/tmp/chalog-frontend.log`에 저장합니다.

2. **백엔드 서버를 포그라운드로 실행**:
   ```bash
   cd backend
   npm run start:dev
   ```
   이렇게 하면 서버 로그가 실시간으로 표시됩니다.

3. **로그 파일로 확인** (백그라운드 실행 시):
   ```bash
   # 서버를 로그 파일로 실행
   cd backend && npm run start:dev 2>&1 | tee /tmp/backend-logs.txt &
   
   # 로그 확인
   tail -f /tmp/backend-logs.txt
   ```

4. **포트 충돌 해결**:
   ```bash
   # 포트 3000을 사용하는 프로세스 종료
   lsof -ti:3000 | xargs kill -9 2>/dev/null
   ```

### 에러 발생 시 확인 사항
- 백엔드 서버가 실행 중인지 확인 (`http://localhost:3000/health`)
- 브라우저에서 요청을 보낼 때 백엔드 터미널에 에러 로그가 출력되는지 확인
- `enrichNotesWithLikesAndBookmarks` 같은 복잡한 메서드에서는 상세한 에러 로깅 추가
- TypeORM의 `getRawMany()` 결과는 다양한 키 형식으로 반환될 수 있으므로 안전하게 처리

## 테스트 구조

### E2E 테스트 파일 구조
백엔드 E2E 테스트는 기능별로 분리되어 있습니다:

```
backend/test/
├── app.e2e-spec.ts          # 메인 테스트 파일 (모든 스위트 import)
├── setup/
│   └── test-setup.ts        # 공통 테스트 설정 (앱 초기화, DB 정리 등)
├── suites/                  # 기능별 테스트 파일들
│   ├── auth.e2e-spec.ts     # 인증 API 테스트
│   ├── teas.e2e-spec.ts     # 차 API 테스트
│   ├── notes-like.e2e-spec.ts      # 노트 좋아요 API 테스트
│   ├── notes-bookmark.e2e-spec.ts  # 노트 북마크 API 테스트
│   ├── users.e2e-spec.ts    # 사용자 프로필 API 테스트
│   ├── notes-crud.e2e-spec.ts      # 노트 CRUD API 테스트
│   └── notes-schemas.e2e-spec.ts   # 평가 스키마 API 테스트
├── helpers/
│   └── test-helper.ts      # 테스트 헬퍼 클래스 (사용자/차/노트 생성 등)
└── constants/
    └── test-constants.ts    # 테스트 상수
```

### 테스트 디버깅 팁
- 특정 기능의 테스트만 실행하려면 해당 스위트 파일을 직접 실행
- 각 테스트 파일은 독립적으로 실행 가능 (자체 `beforeAll`/`afterAll` 포함)
- 공통 설정은 `test/setup/test-setup.ts`에서 관리
