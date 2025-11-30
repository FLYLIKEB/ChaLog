# 환경 변수 관리 가이드

ChaLog 프로젝트의 모든 환경 변수와 민감 정보를 중앙에서 관리하는 가이드입니다.

## 📋 목차

1. [개요](#개요)
2. [환경 변수 파일 구조](#환경-변수-파일-구조)
3. [프론트엔드 환경 변수](#프론트엔드-환경-변수)
4. [백엔드 환경 변수](#백엔드-환경-변수)
5. [배포 환경별 설정](#배포-환경별-설정)
6. [보안 가이드라인](#보안-가이드라인)

## 개요

ChaLog 프로젝트는 환경 변수를 통해 모든 민감 정보를 관리합니다. 실제 값은 코드나 문서에 하드코딩하지 않고, 환경 변수 파일과 배포 플랫폼의 환경 변수 설정을 통해 관리합니다.

### 환경 변수 관리 원칙

1. ✅ **중앙 집중식 관리**: 모든 환경 변수는 `.env.example` 파일에 정의
2. ✅ **버전 관리 제외**: 실제 값이 포함된 `.env` 파일은 `.gitignore`에 포함
3. ✅ **템플릿 제공**: `.env.example` 파일을 통해 필요한 환경 변수 목록 제공
4. ✅ **문서화**: 각 환경 변수의 용도와 설정 방법 문서화

## 환경 변수 파일 구조

```
ChaLog/
├── .env.example              # 프론트엔드 환경 변수 템플릿
├── .env                      # 프론트엔드 실제 환경 변수 (gitignore)
├── backend/
│   ├── .env.example          # 백엔드 환경 변수 템플릿
│   └── .env                  # 백엔드 실제 환경 변수 (gitignore)
└── docs/
    └── ENVIRONMENT_VARIABLES.md  # 이 문서
```

## 프론트엔드 환경 변수

### 파일 위치
- 템플릿: `.env.example`
- 실제 파일: `.env` (프로젝트 루트)

### 환경 변수 목록

| 변수명 | 설명 | 개발 환경 | 프로덕션 |
|--------|------|-----------|----------|
| `VITE_API_BASE_URL` | 백엔드 API 서버 URL | `http://localhost:3000` | Vercel 환경 변수에서 설정 |
| `VITE_KAKAO_APP_KEY` | 카카오 JavaScript SDK 앱 키 | 카카오 개발자 콘솔에서 발급 | Vercel 환경 변수에서 설정 |

### 설정 방법

#### 로컬 개발 환경

```bash
# 1. 템플릿 파일 복사
cp .env.example .env

# 2. .env 파일 편집
# VITE_API_BASE_URL=http://localhost:3000
```

#### 프로덕션 (Vercel)

1. Vercel 대시보드 → 프로젝트 선택
2. Settings → Environment Variables
3. 다음 환경 변수 추가:
   - **Key**: `VITE_API_BASE_URL`
     - **Value**: 백엔드 API 서버 URL (예: `http://your-ec2-ip:3000`)
   - **Key**: `VITE_KAKAO_APP_KEY`
     - **Value**: 카카오 JavaScript SDK 앱 키 (카카오 개발자 콘솔에서 발급)
   - **Environment**: Production, Preview, Development 모두 선택

## 백엔드 환경 변수

### 파일 위치
- 템플릿: `backend/.env.example`
- 실제 파일: `backend/.env`

### 환경 변수 목록

#### 데이터베이스 설정

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `DATABASE_URL` | 데이터베이스 연결 URL | `mysql://admin:password@localhost:3307/chalog` |
| `DB_SYNCHRONIZE` | DB 스키마 자동 동기화 | `false` (프로덕션에서는 반드시 false) |
| `DB_SSL_ENABLED` | SSL 연결 활성화 | `true` (RDS 사용 시) |
| `DB_SSL_REJECT_UNAUTHORIZED` | SSL 인증서 검증 | `true` (프로덕션 권장) |

#### JWT 인증 설정

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `JWT_SECRET` | JWT 토큰 서명용 비밀키 | 강력한 랜덤 문자열 (프로덕션 필수 변경) |
| `JWT_EXPIRES_IN` | JWT 토큰 만료 시간 | `7d` |

#### 서버 설정

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `PORT` | 서버 포트 | `3000` |
| `NODE_ENV` | 실행 환경 | `development` 또는 `production` |

#### 프론트엔드 URL 설정 (CORS)

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `FRONTEND_URL` | 프론트엔드 URL (단일) | `https://cha-log-gilt.vercel.app` |
| `FRONTEND_URLS` | 프론트엔드 URL 목록 (쉼표 구분) | `https://cha-log-gilt.vercel.app,http://localhost:5173` |

#### SSH 터널 설정 (로컬 개발용)

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `SSH_KEY_PATH` | SSH 키 파일 경로 | `~/.ssh/your-key.pem` |
| `EC2_HOST` | EC2 호스트 (Public IP) | `your-ec2-ip` |
| `EC2_USER` | EC2 사용자명 | `ubuntu` |
| `SSH_TUNNEL_LOCAL_PORT` | SSH 터널 로컬 포트 | `3307` |
| `SSH_TUNNEL_REMOTE_HOST` | RDS 엔드포인트 | `your-rds-endpoint.rds.amazonaws.com` |
| `SSH_TUNNEL_REMOTE_PORT` | RDS 포트 | `3306` |

### 설정 방법

#### 로컬 개발 환경

```bash
# 1. 템플릿 파일 복사
cd backend
cp .env.example .env

# 2. .env 파일 편집하여 실제 값으로 변경
nano .env
```

#### 프로덕션 (EC2)

EC2 서버의 `/home/ubuntu/chalog-backend/.env` 파일에 설정합니다.

GitHub Actions를 통한 자동 배포 시, GitHub Secrets를 통해 환경 변수가 자동으로 설정됩니다.

## 배포 환경별 설정

### 로컬 개발 환경

**프론트엔드:**
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_KAKAO_APP_KEY=your-kakao-app-key
```

**백엔드:**
```env
DATABASE_URL=mysql://admin:password@localhost:3307/chalog
DB_SYNCHRONIZE=false
DB_SSL_ENABLED=false
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 프로덕션 환경

**프론트엔드 (Vercel):**
- Vercel 대시보드에서 `VITE_API_BASE_URL` 환경 변수 설정

**백엔드 (EC2):**
```env
DATABASE_URL=mysql://admin:password@your-rds-endpoint.rds.amazonaws.com:3306/chalog
DB_SYNCHRONIZE=false
DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=true
JWT_SECRET=강력한-프로덕션-시크릿-키
NODE_ENV=production
FRONTEND_URL=https://cha-log-gilt.vercel.app
FRONTEND_URLS=https://cha-log-gilt.vercel.app,http://localhost:5173
```

## 보안 가이드라인

### ✅ 해야 할 것

1. **환경 변수 사용**: 모든 민감 정보는 환경 변수로 관리
2. **템플릿 파일 유지**: `.env.example` 파일을 최신 상태로 유지
3. **.gitignore 확인**: `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
4. **강력한 비밀번호**: 프로덕션 환경에서는 강력한 비밀번호와 시크릿 키 사용
5. **정기적 변경**: 프로덕션 비밀번호와 시크릿 키를 정기적으로 변경

### ❌ 하지 말아야 할 것

1. **코드에 하드코딩 금지**: IP 주소, 비밀번호, API 키 등을 코드에 직접 작성하지 않음
2. **문서에 실제 값 노출 금지**: 문서에는 예시 값만 사용하고 실제 값은 노출하지 않음
3. **Git 커밋 금지**: `.env` 파일을 Git에 커밋하지 않음
4. **공개 저장소에 노출 금지**: 실제 환경 변수 값을 공개 저장소에 노출하지 않음

### 비밀키 생성 방법

```bash
# JWT_SECRET 생성
openssl rand -base64 32

# 또는
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## GitHub Secrets (CI/CD)

GitHub Actions를 통한 자동 배포를 위해 다음 Secrets를 설정해야 합니다:

| Secret 이름 | 설명 | 설정 위치 |
|------------|------|-----------|
| `EC2_SSH_KEY` | EC2 SSH 개인 키 | GitHub → Settings → Secrets → Actions |
| `EC2_HOST` | EC2 Public IP | GitHub → Settings → Secrets → Actions |
| `EC2_USER` | EC2 사용자명 (보통 `ubuntu`) | GitHub → Settings → Secrets → Actions |
| `EC2_DATABASE_URL` | 프로덕션 데이터베이스 URL | GitHub → Settings → Secrets → Actions |
| `EC2_JWT_SECRET` | 프로덕션 JWT 시크릿 | GitHub → Settings → Secrets → Actions |
| `EC2_FRONTEND_URL` | 프론트엔드 URL | GitHub → Settings → Secrets → Actions |
| `EC2_FRONTEND_URLS` | 프론트엔드 URL 목록 | GitHub → Settings → Secrets → Actions |

자세한 내용은 [`docs/GITHUB_SECRETS_CHECKLIST.md`](./GITHUB_SECRETS_CHECKLIST.md)를 참고하세요.

## 문제 해결

### 환경 변수가 로드되지 않는 경우

1. `.env` 파일이 올바른 위치에 있는지 확인
2. 파일 이름이 정확한지 확인 (`.env` - 점으로 시작)
3. 환경 변수 이름이 정확한지 확인 (대소문자 구분)
4. 애플리케이션 재시작

### Vercel에서 환경 변수가 적용되지 않는 경우

1. Vercel 대시보드에서 환경 변수 확인
2. 환경 변수가 올바른 환경(Production/Preview/Development)에 설정되어 있는지 확인
3. 재배포 실행

### 백엔드 환경 변수 오류

1. `backend/.env` 파일 존재 확인
2. 필수 환경 변수가 모두 설정되어 있는지 확인
3. 환경 변수 형식이 올바른지 확인 (특히 `DATABASE_URL`)

## 관련 문서

- [`docs/DATABASE.md`](./DATABASE.md) - 데이터베이스 설정 가이드
- [`docs/AWS_EC2_DEPLOYMENT.md`](./AWS_EC2_DEPLOYMENT.md) - EC2 배포 가이드
- [`docs/GITHUB_SECRETS_CHECKLIST.md`](./GITHUB_SECRETS_CHECKLIST.md) - GitHub Secrets 설정 가이드
- [`docs/SECURITY.md`](./SECURITY.md) - 보안 가이드

