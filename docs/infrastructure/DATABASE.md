# 데이터베이스 설정 가이드

ChaLog 프로젝트의 데이터베이스 설정 및 연결 가이드입니다.

## 목차

1. [빠른 시작](#빠른-시작)
2. [Lightsail Docker MySQL](#lightsail-docker-mysql)
3. [로컬 개발 환경](#로컬-개발-환경)
4. [원격 DB 연결 (SSH 터널)](#원격-db-연결-ssh-터널)
5. [문제 해결](#문제-해결)
6. [비밀번호 관리](#비밀번호-관리)

## 빠른 시작

### 1. 로컬 개발 (Docker MySQL)

```bash
cd backend
docker compose up -d
# 또는 ./scripts/start-local.sh
```

### 2. 환경 변수 확인

`backend/.env` 파일에 다음 설정이 있는지 확인:

```env
LOCAL_DATABASE_URL=mysql://root:changeme_root_password@127.0.0.1:3306/chalog
DB_SYNCHRONIZE=true
```

### 3. 백엔드 실행

```bash
npm run start:dev
```

## Lightsail Docker MySQL

### 현재 설정

- **포트**: 3306
- **데이터베이스**: `chalog`
- **엔진**: MySQL 8.0 (Docker)
- **컨테이너**: `chalog-mysql`

프로덕션 환경에서는 Lightsail 인스턴스 내부에 Docker MySQL이 실행됩니다.

**서버 내부 연결:**
```env
DATABASE_URL=mysql://chalog_user:changeme_password@chalog-mysql:3306/chalog
```

### 테이블 생성 (Migration)

```bash
cd backend
npm run migration:run
```

자세한 내용은 [`docs/deployment/LIGHTSAIL_DOCKER_MYSQL.md`](../deployment/LIGHTSAIL_DOCKER_MYSQL.md)를 참고하세요.

## 로컬 개발 환경

### Docker MySQL 사용 (권장)

```bash
cd backend
docker compose up -d
```

`LOCAL_DATABASE_URL`이 설정되어 있으면 자동으로 로컬 DB에 연결됩니다.

### 환경 변수 설정

`backend/.env` 파일:

```env
# 로컬 개발
NODE_ENV=development
LOCAL_DATABASE_URL=mysql://root:changeme_root_password@127.0.0.1:3306/chalog
DB_SYNCHRONIZE=true
DB_SSL_ENABLED=false
```

## 원격 DB 연결 (SSH 터널)

로컬에서 Lightsail Docker MySQL에 연결하려면 SSH 터널을 사용합니다.

### SSH 터널 자동 관리

**터널 시작:**
```bash
cd backend
./scripts/start-ssh-tunnel.sh
```

**터널 종료:**
```bash
./scripts/stop-ssh-tunnel.sh
```

### 수동 터널 생성

```bash
ssh -i ~/.ssh/your-key.pem \
    -L 3307:localhost:3306 \
    -N -f \
    ubuntu@3.39.48.139
```

연결 후 `DATABASE_URL=mysql://chalog_user:password@localhost:3307/chalog` 사용

### 환경 변수 설정

```env
SSH_KEY_PATH=~/.ssh/your-key.pem
EC2_HOST=3.39.48.139
EC2_USER=ubuntu
SSH_TUNNEL_LOCAL_PORT=3307
SSH_TUNNEL_REMOTE_HOST=localhost
SSH_TUNNEL_REMOTE_PORT=3306
```

## 문제 해결

### 연결 타임아웃 (ERROR 2003)

**원인:**
- SSH 터널이 실행되지 않음
- Docker MySQL 컨테이너 미실행
- 네트워크 연결 문제

**해결 방법:**

1. **로컬 Docker MySQL 확인**
   ```bash
   docker ps | grep chalog-mysql
   ```

2. **연결 테스트**
   ```bash
   mysql -h 127.0.0.1 -P 3306 -u root -pchangeme_root_password chalog
   ```

3. **SSH 터널 확인** (원격 접속 시)
   ```bash
   ps aux | grep "ssh.*3307"
   ```

### 인증 실패 (ERROR 1045)

**원인:**
- 잘못된 비밀번호
- 사용자명 오류

**해결 방법:**
- `.env` 파일의 `LOCAL_DATABASE_URL` 또는 `DATABASE_URL` 확인
- Docker 볼륨 초기화: `docker compose down -v && docker compose up -d`

### Access denied for user 'root'@'localhost'

**해결 방법:**
1. `127.0.0.1` 사용 (localhost 대신)
2. Docker 볼륨 재생성: `docker compose down -v && docker compose up -d`
3. `--default-authentication-plugin=mysql_native_password` 확인 (docker-compose.yml)

## 비밀번호 관리

### 비밀번호 확인

Docker MySQL의 root 비밀번호는 `docker-compose.yml`의 `MYSQL_ROOT_PASSWORD`에서 확인합니다.

### 비밀번호 재설정

1. **Docker 볼륨 초기화**
   ```bash
   cd backend
   docker compose down -v
   docker compose up -d
   ```

2. **환경 변수 업데이트**
   ```env
   LOCAL_DATABASE_URL=mysql://root:새비밀번호@127.0.0.1:3306/chalog
   ```

### 보안 권장사항

- ✅ 강력한 비밀번호 사용 (최소 8자, 대소문자, 숫자, 특수문자)
- ✅ 비밀번호 관리자에 안전하게 저장
- ✅ 환경 변수로 관리 (코드에 하드코딩 금지)

## TypeORM Migrations

이 프로젝트는 TypeORM Migrations를 사용하여 데이터베이스 스키마를 형상관리합니다.

### Migration 실행

**로컬 개발 환경:**
```bash
cd backend
npm run migration:run
```

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

### Migration 생성

엔티티 변경사항으로부터 자동 생성:
```bash
cd backend
npm run migration:generate -- migrations/MigrationName
```

자세한 내용은 [`backend/MIGRATIONS.md`](../../backend/MIGRATIONS.md)를 참고하세요.

## 추가 리소스

- [MySQL 공식 문서](https://dev.mysql.com/doc/)
- [`docs/deployment/LIGHTSAIL_DOCKER_MYSQL.md`](../deployment/LIGHTSAIL_DOCKER_MYSQL.md) - Lightsail Docker MySQL 가이드
- [`backend/MIGRATIONS.md`](../../backend/MIGRATIONS.md) - TypeORM Migrations 가이드
