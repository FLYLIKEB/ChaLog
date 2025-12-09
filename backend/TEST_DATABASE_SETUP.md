# 테스트 데이터베이스 설정 가이드

## ⚠️ 중요 경고

E2E 테스트는 **별도의 테스트 데이터베이스**를 사용해야 합니다. 테스트 실행 시 데이터베이스의 모든 데이터가 삭제되므로, 프로덕션 데이터베이스를 사용하면 안 됩니다.

## 테스트 DB 설정 방법

### 1. 테스트용 데이터베이스 생성

MySQL에 테스트용 데이터베이스를 생성합니다:

```sql
CREATE DATABASE cha_log_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 테스트 환경 변수 설정

#### 방법 A: `.env.test` 파일 생성 (권장)

```bash
cd backend
cp .env.test.example .env.test
```

`.env.test` 파일을 열어 테스트 DB URL을 설정:

```env
TEST_DATABASE_URL=mysql://username:password@localhost:3306/cha_log_test
DB_SSL_ENABLED=false
DB_SSL_REJECT_UNAUTHORIZED=false
DB_SYNCHRONIZE=false
NODE_ENV=test
```

#### 방법 B: 환경 변수 직접 설정

```bash
export TEST_DATABASE_URL=mysql://username:password@localhost:3306/cha_log_test
export NODE_ENV=test
```

### 3. 테스트 실행

```bash
npm run test:e2e
```

## 테스트 DB 격리 동작 방식

1. **테스트 시작 시:**
   - `TEST_DATABASE_URL`이 설정되어 있으면 우선 사용
   - 없으면 `DATABASE_URL` 사용
   - DB 이름에 `test` 또는 `_test`가 포함되어 있지 않으면 경고 표시

2. **테스트 실행 중:**
   - 각 테스트 그룹(`describe`)의 `beforeEach`에서 관련 데이터만 정리
   - 테스트 간 데이터 격리 유지

3. **테스트 종료 시:**
   - `afterAll`에서 테스트 DB의 모든 데이터 정리
   - 외래키 제약 조건을 일시적으로 비활성화하여 정리

## 주의사항

- ✅ 테스트 DB 이름에 `test` 또는 `_test` 포함 권장
- ✅ 프로덕션 DB와 완전히 분리된 테스트 DB 사용 필수
- ❌ 프로덕션 DB를 테스트에 사용하지 마세요
- ❌ 테스트 실행 중 프로덕션 서버와 같은 DB를 사용하지 마세요

## 데이터베이스 마이그레이션

테스트 DB에도 프로덕션과 동일한 스키마를 적용해야 합니다.

### Migration 실행

**테스트 DB에 Migration 적용:**
```bash
cd backend
TEST_DATABASE_URL=mysql://username:password@localhost:3306/cha_log_test npm run migration:run
```

또는 스키마 동기화 스크립트 사용:
```bash
cd backend
TEST_DATABASE_URL=mysql://username:password@localhost:3306/cha_log_test ./scripts/sync-schema.sh test
```

### 스키마 비교

테스트 DB와 프로덕션 DB의 스키마가 일치하는지 확인:
```bash
cd backend
DATABASE_URL=mysql://... TEST_DATABASE_URL=mysql://... ./scripts/compare-schema.sh
```

자세한 내용은 [`MIGRATIONS.md`](./MIGRATIONS.md)를 참고하세요.

## 문제 해결

### 테스트가 프로덕션 DB를 사용하는 경우

1. `.env.test` 파일이 올바르게 설정되었는지 확인
2. `TEST_DATABASE_URL` 환경 변수가 설정되었는지 확인
3. 테스트 실행 시 콘솔에 표시되는 DB 이름 확인

### 테스트 DB가 정리되지 않는 경우

- 테스트가 중단된 경우 수동으로 정리:
```sql
USE cha_log_test;
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM note_bookmarks;
DELETE FROM note_likes;
DELETE FROM note_tags;
DELETE FROM tags;
DELETE FROM notes;
DELETE FROM teas;
DELETE FROM user_authentications;
DELETE FROM users;
SET FOREIGN_KEY_CHECKS = 1;
```

### 테스트 DB 스키마가 프로덕션과 다른 경우

1. 스키마 비교 실행:
```bash
cd backend
DATABASE_URL=... TEST_DATABASE_URL=... ./scripts/compare-schema.sh
```

2. 테스트 DB에 Migration 적용:
```bash
cd backend
TEST_DATABASE_URL=... ./scripts/sync-schema.sh test
```

