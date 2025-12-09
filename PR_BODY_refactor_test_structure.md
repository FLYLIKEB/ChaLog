# E2E 테스트 파일 구조 리팩토링

## 변경 사항
1598줄의 큰 테스트 파일을 기능별로 분리하여 가독성과 유지보수성을 향상시켰습니다.

### 주요 변경사항

#### 1. 공통 설정 파일 생성
- `backend/test/setup/test-setup.ts` 생성
  - `setupTestApp()`: 테스트 앱 초기화
  - `teardownTestApp()`: 테스트 앱 종료 및 정리
  - `ensureDefaultSchema()`: 기본 스키마 생성 헬퍼
  - `cleanupDatabase()`: 데이터베이스 정리 헬퍼

#### 2. 기능별 테스트 파일 분리
- `backend/test/suites/` 디렉토리 생성
  - `auth.e2e-spec.ts` - 인증 API 테스트
  - `teas.e2e-spec.ts` - 차 API 테스트
  - `notes-like.e2e-spec.ts` - 노트 좋아요 API 테스트
  - `notes-bookmark.e2e-spec.ts` - 노트 북마크 API 테스트
  - `users.e2e-spec.ts` - 사용자 프로필 API 테스트
  - `notes-crud.e2e-spec.ts` - 노트 CRUD API 테스트
  - `notes-schemas.e2e-spec.ts` - 평가 스키마 API 테스트

#### 3. 메인 테스트 파일 리팩토링
- `backend/test/app.e2e-spec.ts`를 간소화
  - 모든 테스트 스위트를 import하여 실행
  - 기본 라우트 테스트만 유지

#### 4. 문서 업데이트
- `.cursor/rules/development/debugging.md`: 테스트 구조 섹션 추가
- `.cursor/rules/development/testing.md`: 새로운 테스트 구조 문서화
- `backend/test/test-code-analysis.md`: 리팩토링 완료 상태 반영
- `backend/test/test-isolation-check.md`: 새로운 구조에 맞게 업데이트

## 파일 구조

```
backend/test/
├── app.e2e-spec.ts          # 메인 테스트 파일 (모든 스위트 import)
├── setup/
│   └── test-setup.ts        # 공통 테스트 설정
├── suites/                  # 기능별 테스트 파일들
│   ├── auth.e2e-spec.ts
│   ├── teas.e2e-spec.ts
│   ├── notes-like.e2e-spec.ts
│   ├── notes-bookmark.e2e-spec.ts
│   ├── users.e2e-spec.ts
│   ├── notes-crud.e2e-spec.ts
│   └── notes-schemas.e2e-spec.ts
├── helpers/
│   └── test-helper.ts      # 테스트 헬퍼 클래스
└── constants/
    └── test-constants.ts    # 테스트 상수
```

## 장점

1. **가독성 향상**: 각 파일이 단일 기능에 집중
2. **유지보수성 향상**: 특정 기능 테스트 수정 시 해당 파일만 수정
3. **독립 실행**: 각 테스트 스위트를 독립적으로 실행 가능
4. **재사용성**: 공통 설정을 재사용하여 코드 중복 감소

## 테스트

- [x] 모든 기존 테스트가 정상 동작하는지 확인
- [x] 각 테스트 스위트가 독립적으로 실행 가능한지 확인
- [x] 테스트 격리가 유지되는지 확인

## 체크리스트

- [x] 코드 스타일 가이드 준수
- [x] 기존 테스트 동작 확인
- [x] 문서 업데이트
- [x] 커서 룰 업데이트

