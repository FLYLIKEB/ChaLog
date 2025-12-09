# E2E 테스트 파일 구조 리팩토링

## 문제점
- `backend/test/app.e2e-spec.ts` 파일이 1598줄로 너무 큼
- 모든 테스트가 하나의 파일에 있어 가독성 및 유지보수성 저하
- 특정 기능의 테스트만 수정하려면 큰 파일을 다뤄야 함

## 해결 방안
- 기능별로 테스트 파일 분리
- 공통 설정 및 헬퍼 함수 추출
- 각 테스트 스위트를 독립적으로 실행 가능하도록 구조화

## 변경 사항
- [x] 공통 테스트 설정 파일 생성 (`test/setup/test-setup.ts`)
- [x] 기능별 테스트 파일 분리 (`test/suites/`)
  - [x] `auth.e2e-spec.ts` - 인증 API 테스트
  - [x] `teas.e2e-spec.ts` - 차 API 테스트
  - [x] `notes-like.e2e-spec.ts` - 노트 좋아요 API 테스트
  - [x] `notes-bookmark.e2e-spec.ts` - 노트 북마크 API 테스트
  - [x] `users.e2e-spec.ts` - 사용자 프로필 API 테스트
  - [x] `notes-crud.e2e-spec.ts` - 노트 CRUD API 테스트
  - [x] `notes-schemas.e2e-spec.ts` - 평가 스키마 API 테스트
- [x] 메인 테스트 파일 리팩토링 (`app.e2e-spec.ts`)
- [x] 커서 룰 및 문서 업데이트

## 예상 효과
- 코드 가독성 향상
- 유지보수성 향상
- 특정 기능 테스트 수정 시 해당 파일만 수정하면 됨
- 각 테스트 스위트를 독립적으로 실행 가능

## 관련 이슈
- 없음

