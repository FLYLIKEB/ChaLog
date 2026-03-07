# ChaLog Backend

NestJS 기반 백엔드 API 서버입니다.

## 요구 사항

- Node.js 22 이상
- MySQL 8.0 이상 (Docker 권장)
- npm 9 이상

## 설치

```bash
npm install
```

## 환경 변수 설정

`.env` 파일을 생성하고 `.env.example` 파일을 참고하여 다음 변수들을 설정하세요:

```bash
# backend 디렉토리에서 .env.example 파일을 복사하여 .env 파일 생성
cd backend
cp .env.example .env
```

### 주요 환경 변수

- `DATABASE_URL`: 프로덕션 DB 연결 URL (Lightsail Docker MySQL: `mysql://chalog_user:password@chalog-mysql:3306/chalog`)
- `LOCAL_DATABASE_URL`: 로컬 개발용 DB URL (`mysql://root:changeme_root_password@127.0.0.1:3306/chalog`)
- `DB_SYNCHRONIZE`: 개발 환경에서만 `true`로 설정 (데이터 손실 위험)
- `DB_SSL_ENABLED`: 외부 DB 사용 시 SSL 연결 활성화 (`false` - Lightsail 내부 Docker는 SSL 불필요)
- `JWT_SECRET`: JWT 토큰 서명용 비밀키 (프로덕션에서는 반드시 변경)
- `JWT_EXPIRES_IN`: JWT 토큰 만료 시간
- `PORT`: 서버 포트 (기본값: 3000)
- `NODE_ENV`: 실행 환경 (`development` 또는 `production`)
- `FRONTEND_URL`: 프론트엔드 URL

## 데이터베이스 설정

### Lightsail Docker MySQL (프로덕션)

프로덕션에서는 Lightsail 인스턴스 내부에 Docker MySQL이 실행됩니다.

**서버 내부 연결:**
```env
DATABASE_URL=mysql://chalog_user:changeme_password@chalog-mysql:3306/chalog
```

자세한 설정 가이드는 [`docs/deployment/LIGHTSAIL_DOCKER_MYSQL.md`](../docs/deployment/LIGHTSAIL_DOCKER_MYSQL.md)를 참고하세요.

### 로컬 Docker MySQL 사용

```bash
cd backend
docker compose up -d
```

`.env` 파일:
```env
LOCAL_DATABASE_URL=mysql://root:changeme_root_password@127.0.0.1:3306/chalog
DB_SYNCHRONIZE=true
```

### 원격 DB 접속 (SSH 터널)

로컬에서 Lightsail Docker MySQL에 접속하려면 SSH 터널 사용:
```bash
./scripts/start-ssh-tunnel.sh
```

자세한 설정 가이드는 [`docs/infrastructure/DATABASE.md`](../docs/infrastructure/DATABASE.md)를 참고하세요.

## 스크립트

데이터베이스 연결을 위한 유틸리티 스크립트:

- `./scripts/start-ssh-tunnel.sh` - SSH 터널 시작 (원격 DB 연결용)
- `./scripts/stop-ssh-tunnel.sh` - SSH 터널 종료
- `./scripts/check-database.sh` - 데이터베이스 확인 및 생성
- `./scripts/sync-schema.sh` - 스키마 동기화 (Migration 실행)
- `./scripts/compare-schema.sh` - 테스트/프로덕션 DB 스키마 비교

자세한 사용법은 [`docs/SCRIPTS.md`](../docs/SCRIPTS.md)를 참고하세요.

## 데이터베이스 마이그레이션

이 프로젝트는 TypeORM Migrations를 사용하여 데이터베이스 스키마를 형상관리합니다.

### Migration 명령어

- `npm run migration:run` - Migration 실행
- `npm run migration:revert` - Migration 롤백
- `npm run migration:show` - Migration 상태 확인
- `npm run migration:generate` - 엔티티 변경사항으로부터 Migration 생성
- `npm run migration:create` - 빈 Migration 파일 생성

### 스키마 동기화

**테스트 DB 동기화:**
```bash
cd backend
TEST_DATABASE_URL=mysql://... ./scripts/sync-schema.sh test
```

**프로덕션 DB 동기화:**
```bash
cd backend
DATABASE_URL=mysql://... ./scripts/sync-schema.sh prod
```

**스키마 비교:**
```bash
cd backend
DATABASE_URL=... TEST_DATABASE_URL=... ./scripts/compare-schema.sh
```

자세한 내용은 [`MIGRATIONS.md`](./MIGRATIONS.md)를 참고하세요.

## 실행

### 개발 모드

```bash
npm run start:dev
```

서버는 `http://localhost:3000`에서 실행됩니다.

### 프로덕션 빌드

```bash
npm run build
npm run start:prod
```

## API 엔드포인트

### 인증

- `POST /auth/register` - 회원가입
- `POST /auth/login` - 로그인
- `POST /auth/profile` - 프로필 조회 (JWT 필요)

### 차(Tea)

- `GET /teas` - 차 목록 조회
- `GET /teas?q=검색어` - 차 검색
- `GET /teas/:id` - 차 상세 조회
- `POST /teas` - 차 생성 (JWT 필요)

### 노트(Note)

- `GET /notes` - 노트 목록 조회
- `GET /notes?userId=사용자ID` - 특정 사용자의 노트 조회
- `GET /notes?public=true` - 공개 노트만 조회
- `GET /notes/:id` - 노트 상세 조회
- `POST /notes` - 노트 생성 (JWT 필요)
- `PATCH /notes/:id` - 노트 수정 (JWT 필요)
- `DELETE /notes/:id` - 노트 삭제 (JWT 필요)

## 프로젝트 구조

```text
src/
├── auth/              # 인증 모듈
│   ├── dto/          # 데이터 전송 객체
│   ├── strategies/   # Passport 전략
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/            # 사용자 모듈
│   ├── entities/     # TypeORM 엔티티
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── teas/             # 차 모듈
│   ├── dto/
│   ├── entities/
│   ├── teas.controller.ts
│   ├── teas.service.ts
│   └── teas.module.ts
├── notes/            # 노트 모듈
│   ├── dto/
│   ├── entities/
│   ├── notes.controller.ts
│   ├── notes.service.ts
│   └── notes.module.ts
├── database/         # 데이터베이스 설정
│   └── typeorm.config.ts
├── app.module.ts     # 루트 모듈
└── main.ts           # 애플리케이션 진입점
```

## 테스트

### 단위 테스트

```bash
npm run test
```

### E2E 테스트

**⚠️ 중요: E2E 테스트는 별도의 테스트 데이터베이스를 사용해야 합니다.**

테스트 실행 시 프로덕션 데이터베이스의 데이터가 삭제될 수 있으므로, 반드시 테스트 전용 데이터베이스를 설정하세요.

**테스트 DB 설정 방법:**

1. 테스트용 데이터베이스 생성:
```sql
CREATE DATABASE cha_log_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. `.env.test` 파일 생성 (`.env.test.example` 참고):
```bash
cp .env.test.example .env.test
```

3. `.env.test` 파일에 테스트 DB URL 설정:
```env
TEST_DATABASE_URL=mysql://username:password@localhost:3306/cha_log_test
```

또는 기존 `.env` 파일의 `DATABASE_URL`을 테스트 DB로 변경:
```env
DATABASE_URL=mysql://username:password@localhost:3306/cha_log_test
```

**테스트 실행:**

```bash
npm run test:e2e
```

**주의사항:**
- 테스트 DB 이름에 `test` 또는 `_test`가 포함되어 있지 않으면 경고가 표시됩니다
- 테스트 실행 후 테스트 DB의 모든 데이터가 삭제됩니다
- 프로덕션 DB를 사용하지 않도록 주의하세요

# GitHub Actions 자동 배포 테스트
# GitHub Actions 배포 테스트 - Wed Nov 26 23:06:23 KST 2025
