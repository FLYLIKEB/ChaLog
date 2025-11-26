# ChaLog Backend

NestJS 기반 백엔드 API 서버입니다.

## 요구 사항

- Node.js 20 이상
- MySQL 8.0 이상
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

- `DATABASE_URL`: 데이터베이스 연결 URL
  - 로컬: `mysql://user:password@localhost:3306/chalog`
  - AWS RDS/Aurora: `mysql://admin:password@your-rds-endpoint.region.rds.amazonaws.com:3306/chalog`
- `DB_SYNCHRONIZE`: 개발 환경에서만 `true`로 설정 (데이터 손실 위험)
- `DB_SSL_ENABLED`: AWS RDS/Aurora 사용 시 SSL 연결 활성화 (`true` 권장)
- `JWT_SECRET`: JWT 토큰 서명용 비밀키 (프로덕션에서는 반드시 변경)
- `JWT_EXPIRES_IN`: JWT 토큰 만료 시간
- `PORT`: 서버 포트 (기본값: 3000)
- `NODE_ENV`: 실행 환경 (`development` 또는 `production`)
- `FRONTEND_URL`: 프론트엔드 URL

## 데이터베이스 설정

### AWS RDS/Aurora 사용 (현재 설정)

현재 AWS RDS MariaDB를 사용하고 있습니다. SSH 터널을 통해 연결됩니다.

**연결 정보:**
- 포트: `3306` (SSH 터널: 로컬 `3307`)
- 데이터베이스: `chalog`

**SSH 터널 설정:**

`.env` 파일에 SSH 관련 설정이 포함되어 있습니다:
```env
SSH_KEY_PATH=~/.ssh/your-key.pem
EC2_HOST=YOUR_EC2_HOST
EC2_USER=YOUR_EC2_USER
SSH_TUNNEL_LOCAL_PORT=3307
SSH_TUNNEL_REMOTE_HOST=YOUR_RDS_ENDPOINT
```

> `.env.example` 파일을 참고하여 실제 값으로 설정하세요.

터널 시작/종료:
```bash
# 터널 시작
./scripts/start-ssh-tunnel.sh

# 터널 종료
./scripts/stop-ssh-tunnel.sh
```

자세한 설정 가이드는 [`docs/DATABASE.md`](../docs/DATABASE.md)를 참고하세요.

### 로컬 MySQL 사용 시

MySQL 데이터베이스를 생성하세요:

```sql
CREATE DATABASE chalog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### AWS RDS/Aurora 사용 시

자세한 설정 가이드는 [`docs/aws-rds-setup.md`](../docs/aws-rds-setup.md)를 참고하세요.

**주요 단계:**
1. AWS 콘솔에서 RDS/Aurora 인스턴스 생성
2. 보안 그룹 인바운드 규칙 설정 (MySQL 포트 3306)
3. 엔드포인트 주소 확인
4. `.env` 파일에 `DATABASE_URL` 설정
5. `DB_SSL_ENABLED=true` 설정 (권장)

## 스크립트

데이터베이스 연결을 위한 유틸리티 스크립트:

- `./scripts/start-ssh-tunnel.sh` - SSH 터널 시작 (RDS 연결용)
- `./scripts/stop-ssh-tunnel.sh` - SSH 터널 종료
- `./scripts/check-database.sh` - 데이터베이스 확인 및 생성

자세한 사용법은 [`docs/SCRIPTS.md`](../docs/SCRIPTS.md)를 참고하세요.

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

```bash
npm run test
```

# GitHub Actions 자동 배포 테스트
# GitHub Actions 배포 테스트 - Wed Nov 26 23:06:23 KST 2025
