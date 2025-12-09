# 데이터베이스 설정 가이드

ChaLog 프로젝트의 데이터베이스 설정 및 연결 가이드입니다.

## 목차

1. [빠른 시작](#빠른-시작)
2. [AWS RDS 설정](#aws-rds-설정)
3. [EC2를 통한 연결 (SSH 터널)](#ec2를-통한-연결-ssh-터널)
4. [문제 해결](#문제-해결)
5. [비밀번호 관리](#비밀번호-관리)

## 빠른 시작

### 1. SSH 터널 시작

```bash
cd backend
./scripts/start-ssh-tunnel.sh
```

### 2. 환경 변수 확인

`backend/.env` 파일에 다음 설정이 있는지 확인:

```env
DATABASE_URL=mysql://admin:password@localhost:3307/chalog
SSH_KEY_PATH=~/.ssh/your-key.pem
EC2_HOST=YOUR_EC2_HOST
EC2_USER=YOUR_EC2_USER
```

### 3. 백엔드 실행

```bash
npm run start:dev
```

## AWS RDS 설정

### 현재 설정

- **포트**: 3306
- **데이터베이스**: `chalog`
- **엔진**: MariaDB

> RDS 엔드포인트는 `.env` 파일의 `SSH_TUNNEL_REMOTE_HOST` 또는 `DATABASE_URL`에서 확인하세요.

### 초기 설정 (이미 완료됨)

RDS 인스턴스 생성 및 기본 설정은 이미 완료되었습니다. 

**새로운 RDS 인스턴스를 생성해야 하는 경우:** [`AWS_RDS_SETUP.md`](./AWS_RDS_SETUP.md) 참고

## EC2를 통한 연결 (SSH 터널)

로컬 개발 환경에서 RDS에 연결하려면 SSH 터널을 사용합니다.

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

**터널 상태 확인:**
```bash
ps aux | grep "ssh.*3307"
```

### 수동 터널 생성

```bash
ssh -i ~/.ssh/your-key.pem \
    -L 3307:YOUR_RDS_ENDPOINT:3306 \
    -N -f \
    YOUR_EC2_USER@YOUR_EC2_HOST
```

> 실제 값은 `.env` 파일에서 확인하세요.

### 환경 변수 설정

`backend/.env` 파일:

```env
# Database
DATABASE_URL=mysql://admin:password@localhost:3307/chalog
DB_SYNCHRONIZE=false
DB_SSL_ENABLED=false

# SSH Tunnel
SSH_KEY_PATH=~/.ssh/your-key.pem
EC2_HOST=YOUR_EC2_HOST
EC2_USER=YOUR_EC2_USER
SSH_TUNNEL_LOCAL_PORT=3307
SSH_TUNNEL_REMOTE_HOST=YOUR_RDS_ENDPOINT
SSH_TUNNEL_REMOTE_PORT=3306
```

> `.env.example` 파일을 참고하여 실제 값으로 설정하세요.

## 문제 해결

### 연결 타임아웃 (ERROR 2003)

**원인:**
- SSH 터널이 실행되지 않음
- 보안 그룹 설정 문제
- 네트워크 연결 문제

**해결 방법:**

1. **SSH 터널 확인**
   ```bash
   ps aux | grep "ssh.*3307"
   # 없으면 시작: ./scripts/start-ssh-tunnel.sh
   ```

2. **연결 테스트**
   ```bash
   mysql -h localhost -P 3307 -u admin -p
   ```

3. **EC2 연결 확인**
   ```bash
   ssh -i ~/.ssh/your-key.pem YOUR_EC2_USER@YOUR_EC2_HOST "echo '연결 성공'"
   ```

### 인증 실패 (ERROR 1045)

**원인:**
- 잘못된 비밀번호
- 사용자명 오류

**해결 방법:**
- `.env` 파일의 `DATABASE_URL` 확인
- 비밀번호 재설정 (아래 "비밀번호 관리" 참고)

### SSH 터널이 자동으로 종료됨

**원인:**
- 네트워크 연결 불안정
- EC2 인스턴스 재시작

**해결 방법:**
- 스크립트에 `ServerAliveInterval` 옵션 포함 (이미 설정됨)
- 터널 재시작: `./scripts/start-ssh-tunnel.sh`

## 비밀번호 관리

### 비밀번호 확인

AWS RDS의 마스터 비밀번호는 **보안상의 이유로 생성 후에는 확인할 수 없습니다**.

### 비밀번호 재설정

1. **AWS 콘솔 → RDS**
   - 데이터베이스 → 해당 RDS 인스턴스 선택
   - "수정" 버튼 클릭

2. **비밀번호 재설정**
   - "연결" 섹션 → "마스터 암호"
   - "새 마스터 암호 입력" 선택
   - 새 비밀번호 입력 및 확인

3. **변경사항 적용**
   - "즉시 적용" 선택
   - "DB 인스턴스 수정" 클릭
   - 재부팅 완료 대기 (약 2-5분)

4. **환경 변수 업데이트**
   ```env
   DATABASE_URL=mysql://admin:새비밀번호@localhost:3307/chalog
   ```

### 보안 권장사항

- ✅ 강력한 비밀번호 사용 (최소 8자, 대소문자, 숫자, 특수문자)
- ✅ 비밀번호 관리자에 안전하게 저장
- ✅ 정기적인 비밀번호 변경 (프로덕션)
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

### 스키마 비교

테스트 DB와 프로덕션 DB의 스키마를 비교:
```bash
cd backend
DATABASE_URL=... TEST_DATABASE_URL=... ./scripts/compare-schema.sh
```

### Migration 생성

엔티티 변경사항으로부터 자동 생성:
```bash
cd backend
npm run migration:generate -- migrations/MigrationName
```

빈 Migration 파일 생성:
```bash
cd backend
npm run migration:create -- migrations/MigrationName
```

자세한 내용은 [`backend/MIGRATIONS.md`](../../backend/MIGRATIONS.md)를 참고하세요.

## 추가 리소스

- [AWS RDS 공식 문서](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/)
- [`docs/security/SECURITY.md`](../security/SECURITY.md) - 보안 가이드
- [`backend/MIGRATIONS.md`](../../backend/MIGRATIONS.md) - TypeORM Migrations 가이드

