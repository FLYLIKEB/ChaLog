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

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
DATABASE_URL=mysql://user:password@localhost:3306/chalog
# 개발 환경에서만 true로 설정 (데이터 손실 위험 있음)
DB_SYNCHRONIZE=false

JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=3000
FRONTEND_URL=http://localhost:5173
```

## 데이터베이스 설정

MySQL 데이터베이스를 생성하세요:

```sql
CREATE DATABASE chalog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

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

