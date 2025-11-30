# EC2 배포 구조 및 사용 가이드

ChaLog 백엔드의 EC2 배포 구조와 사용 방법입니다.

## 현재 인프라 구조

### 구성 요소

- **EC2 인스턴스**: Ubuntu Server 22.04 LTS (t3.small)
- **RDS 데이터베이스**: MySQL (AWS RDS)
- **웹 서버**: Nginx (리버스 프록시)
- **프로세스 관리**: PM2
- **배포**: GitHub Actions 자동 배포

### 네트워크 구조

```
인터넷
  ↓
EC2 인스턴스 (Public IP)
  ├── Nginx (포트 80, 443)
  │   └── 백엔드 서버 (포트 3000)
  └── RDS (VPC 내부, 포트 3306)
```

### 디렉토리 구조

```
/home/ubuntu/chalog-backend/
├── dist/                    # 빌드된 애플리케이션
├── node_modules/            # 프로덕션 의존성
├── package.json
├── package-lock.json
├── ecosystem.config.js      # PM2 설정
├── .env                     # 환경 변수 (gitignore)
└── logs/                    # PM2 로그
    ├── err.log
    └── out.log
```

## 배포 프로세스

### 자동 배포 (GitHub Actions)

**트리거 조건**:
- `main` 브랜치에 `backend/**` 경로 변경사항 푸시
- 수동 실행 (GitHub Actions UI)

**배포 단계**:
1. 코드 체크아웃
2. Node.js 20 설정
3. 의존성 설치 (`npm ci`)
4. 빌드 (`npm run build`)
5. 배포 패키지 생성
6. EC2에 SSH 연결
7. 배포 파일 전송
8. 환경 변수 설정 (`.env` 파일 생성)
9. PM2로 애플리케이션 재시작
10. Health Check 확인

**배포 확인**:
- GitHub 저장소 → Actions 탭
- 최근 워크플로우 실행 로그 확인

### 수동 배포

EC2에 SSH 접속하여:

```bash
# 프로젝트 디렉토리로 이동
cd /home/ubuntu/chalog-backend

# Git에서 최신 코드 가져오기 (선택사항)
# git pull origin main

# 의존성 설치
npm ci --legacy-peer-deps --production

# 빌드
npm run build

# PM2 재시작
pm2 restart chalog-backend

# 상태 확인
pm2 status
pm2 logs chalog-backend --lines 50
```

## PM2 관리

### 현재 설정

- **앱 이름**: `chalog-backend`
- **스크립트**: `./dist/src/main.js`
- **인스턴스**: 1개 (fork 모드)
- **메모리 제한**: 600MB
- **자동 재시작**: 활성화

### 기본 명령어

```bash
# 상태 확인
pm2 status

# 로그 확인
pm2 logs chalog-backend

# 최근 50줄 로그
pm2 logs chalog-backend --lines 50

# 재시작
pm2 restart chalog-backend

# 중지
pm2 stop chalog-backend

# 시작
pm2 start chalog-backend

# 삭제
pm2 delete chalog-backend

# 모니터링
pm2 monit

# 메모리 사용량 확인
pm2 list
```

### 로그 관리

```bash
# 로그 파일 위치
cat /home/ubuntu/chalog-backend/logs/out.log
cat /home/ubuntu/chalog-backend/logs/err.log

# 실시간 로그
pm2 logs chalog-backend --lines 0
```

## 환경 변수

### 현재 설정 위치

- 파일: `/home/ubuntu/chalog-backend/.env`
- 관리: GitHub Secrets를 통해 자동 생성

### 환경 변수 목록

```env
DATABASE_URL=mysql://admin:password@rds-endpoint:3306/chalog
DB_SYNCHRONIZE=false
DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=false
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://cha-log-gilt.vercel.app
FRONTEND_URLS=https://cha-log-gilt.vercel.app,http://localhost:5173
```

### 환경 변수 수정

**방법 1: GitHub Secrets 수정** (권장)
- GitHub 저장소 → Settings → Secrets and variables → Actions
- Secret 수정 후 재배포

**방법 2: EC2에서 직접 수정**
```bash
# .env 파일 편집
nano /home/ubuntu/chalog-backend/.env

# PM2 재시작
pm2 restart chalog-backend
```

## 모니터링

### Health Check

```bash
# 로컬 Health Check
curl http://localhost:3000/health

# 외부 Health Check (HTTPS)
curl https://api.yourdomain.com/health
```

### 리소스 모니터링

```bash
# CPU 및 메모리 사용량
top
htop  # 설치 필요: sudo apt install htop

# 메모리 사용량
free -h

# 디스크 사용량
df -h

# PM2 모니터링
pm2 monit
```

### 로그 모니터링

```bash
# PM2 로그
pm2 logs chalog-backend --lines 100

# Nginx 로그
sudo tail -f /var/log/nginx/chalog-backend-access.log
sudo tail -f /var/log/nginx/chalog-backend-error.log

# 시스템 로그
sudo journalctl -u nginx -f
```

## EC2 접속

### 방법 1: EC2 Instance Connect (권장)

1. AWS 콘솔 → EC2 → Instances
2. 인스턴스 선택 → **Connect** 버튼
3. **EC2 Instance Connect** 탭 → **Connect**

**장점**: SSH 키 불필요, 브라우저에서 바로 접속

### 방법 2: SSH 클라이언트

```bash
ssh -i ~/.ssh/summy.pem ubuntu@your-ec2-ip
```

## 문제 해결

### 배포 실패

**확인 사항**:
1. GitHub Actions 로그 확인
2. EC2에서 수동 빌드 테스트:
   ```bash
   cd /home/ubuntu/chalog-backend
   npm ci --legacy-peer-deps
   npm run build
   ```

### 백엔드 서버가 시작되지 않음

**확인**:
```bash
# PM2 상태
pm2 status

# 로그 확인
pm2 logs chalog-backend --lines 100

# 환경 변수 확인
cat /home/ubuntu/chalog-backend/.env

# 포트 확인
sudo netstat -tlnp | grep 3000
```

### 데이터베이스 연결 실패

**확인**:
```bash
# RDS 보안 그룹 확인
# AWS 콘솔 → RDS → 데이터베이스 → Connectivity & security

# 연결 테스트
mysql -h rds-endpoint -u admin -p
```

### 메모리 부족

**확인**:
```bash
# 메모리 사용량
free -h
pm2 list

# PM2 메모리 제한 확인
cat /home/ubuntu/chalog-backend/ecosystem.config.js
```

## 백업

### 자동 백업 (배포 시)

배포 시 자동으로 백업 생성:
- 위치: `/home/ubuntu/backups/`
- 형식: `backup-YYYYMMDD-HHMMSS.tar.gz`

### 수동 백업

```bash
# 백업 디렉토리 생성
mkdir -p /home/ubuntu/backups

# 백업 생성
tar -czf /home/ubuntu/backups/backup-$(date +%Y%m%d-%H%M%S).tar.gz \
    /home/ubuntu/chalog-backend/dist \
    /home/ubuntu/chalog-backend/package.json \
    /home/ubuntu/chalog-backend/ecosystem.config.js

# 오래된 백업 삭제 (7일 이상)
find /home/ubuntu/backups -name "*.tar.gz" -mtime +7 -delete
```

## 관련 문서

- [`docs/GITHUB_ACTIONS_SETUP.md`](./GITHUB_ACTIONS_SETUP.md) - GitHub Actions 사용 가이드
- [`docs/HTTPS_SETUP_GUIDE.md`](./HTTPS_SETUP_GUIDE.md) - HTTPS 사용 가이드
- [`docs/ENVIRONMENT_VARIABLES.md`](./ENVIRONMENT_VARIABLES.md) - 환경 변수 가이드
- [`backend/ecosystem.config.js`](../backend/ecosystem.config.js) - PM2 설정 파일
