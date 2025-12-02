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

### Serverless Proxy (Vercel API 프록시)

| 변수명 | 설명 | 개발 환경 | 프로덕션 |
|--------|------|-----------|----------|
| `BACKEND_URL` | Serverless Function이 프록시할 실제 백엔드 URL | `http://localhost:3000` | `http://52.78.150.124:3000` (Vercel 환경 변수에서 설정) |
| `BACKEND_TIMEOUT_MS` | 백엔드 요청 타임아웃(밀리초) | `10000` | 선택적으로 조정 |
| `LOG_PROXY_REQUESTS` | 프록시 요청/응답 로깅 여부 | `true` | 필요 시 `false`로 비활성화 |

> **Vercel 설정:** Settings → Environment Variables에서 `BACKEND_URL`, `BACKEND_TIMEOUT_MS(옵션)`을 설정하세요.

### 사용 방법

#### 로컬 개발 환경

현재 개발 환경에서는 Vite 프록시를 사용하므로 `.env` 파일에서 `VITE_API_BASE_URL`을 주석 처리합니다:

```bash
# .env 파일
# VITE_API_BASE_URL=http://localhost:3000  # Vite 프록시 사용으로 주석 처리
VITE_KAKAO_APP_KEY=your-kakao-app-key
```

프록시 설정은 `vite.config.ts`에 정의되어 있습니다:
- `/api` 요청이 `http://localhost:3000`으로 프록시됨

#### 프로덕션 (Vercel)

Vercel 대시보드에서 환경 변수 설정:
- 위치: Settings → Environment Variables
- `VITE_API_BASE_URL`: 백엔드 HTTPS URL (예: `https://api.yourdomain.com`)
- `VITE_KAKAO_APP_KEY`: 카카오 JavaScript SDK 앱 키

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

### 사용 방법

#### 로컬 개발 환경

```bash
# 템플릿 파일 복사
cd backend
cp .env.example .env

# .env 파일 편집하여 실제 값으로 변경
nano .env
```

**주요 설정**:
- `DATABASE_URL`: SSH 터널을 통한 RDS 연결 (포트 3307)
- `DB_SYNCHRONIZE`: `false` (프로덕션과 동일)
- `NODE_ENV`: `development`

#### 프로덕션 (EC2)

**현재 구조**:
- 파일 위치: `/home/ubuntu/chalog-backend/.env`
- 관리 방법: GitHub Secrets를 통해 자동 생성
- 배포 시: GitHub Actions가 `.env` 파일을 자동 생성

**수동 수정** (필요 시):
```bash
# EC2에 SSH 접속
ssh -i ~/.ssh/summy.pem ubuntu@your-ec2-ip

# .env 파일 편집
nano /home/ubuntu/chalog-backend/.env

# PM2 재시작
pm2 restart chalog-backend
```

## 배포 환경별 설정

### 로컬 개발 환경

**프론트엔드:**
```env
VITE_API_BASE_URL=http://localhost:3000
# JavaScript 키 사용 (REST API 키가 아님!)
# 카카오 개발자 콘솔(https://developers.kakao.com/)에서 JavaScript 키 발급 후 설정
VITE_KAKAO_APP_KEY=your-kakao-javascript-key
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

GitHub Actions 자동 배포를 위해 사용되는 Secrets입니다.

### 현재 설정된 Secrets

GitHub 저장소 → Settings → Secrets and variables → Actions

| Secret 이름 | 용도 | 자동 배포 시 사용 |
|------------|------|------------------|
| `EC2_SSH_KEY` | EC2 SSH 접속 | ✅ |
| `EC2_HOST` | EC2 호스트 주소 | ✅ |
| `EC2_USER` | EC2 사용자명 | ✅ |
| `EC2_DATABASE_URL` | `.env` 파일 생성 | ✅ |
| `EC2_JWT_SECRET` | `.env` 파일 생성 | ✅ |
| `EC2_FRONTEND_URL` | `.env` 파일 생성 (선택) | ✅ |
| `EC2_FRONTEND_URLS` | `.env` 파일 생성 (선택) | ✅ |

### Secrets 확인 및 수정

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. Secret 목록 확인
3. 수정: Secret 클릭 → Update
4. 삭제: Secret 클릭 → Delete

**주의**: Secret 수정 후 다음 배포부터 적용됩니다.

자세한 내용은 [`docs/deployment/GITHUB_ACTIONS_SETUP.md`](../deployment/GITHUB_ACTIONS_SETUP.md)를 참고하세요.

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

- [`docs/infrastructure/DATABASE.md`](../infrastructure/DATABASE.md) - 데이터베이스 구조 및 사용 가이드
- [`docs/deployment/AWS_EC2_DEPLOYMENT.md`](../deployment/AWS_EC2_DEPLOYMENT.md) - EC2 배포 구조 및 사용 가이드
- [`docs/deployment/GITHUB_ACTIONS_SETUP.md`](../deployment/GITHUB_ACTIONS_SETUP.md) - GitHub Actions 사용 가이드
- [`docs/security/SECURITY.md`](../security/SECURITY.md) - 보안 가이드
