# AWS EC2 배포 가이드

ChaLog 백엔드를 AWS EC2에 배포하는 상세 가이드입니다.

## 왜 EC2를 선택해야 할까요?

### 장점 ✅

1. **AWS RDS와 같은 인프라**
   - 이미 RDS를 사용 중이라면 네트워크 연결이 간단함
   - 보안 그룹으로 쉽게 제어 가능
   - VPC 내부 통신으로 빠른 속도

2. **비용 효율적**
   - t2.micro 무료 티어 (1년간)
   - t3.small: 약 $15/월
   - 이미 RDS를 사용 중이라면 추가 인프라 비용만

3. **완전한 제어권**
   - 서버 설정 완전 제어
   - 로그 파일 직접 관리
   - 커스텀 설정 가능

4. **확장성**
   - Auto Scaling Group으로 자동 확장
   - Load Balancer로 로드 분산
   - 필요시 ECS로 마이그레이션 가능

### 단점 ⚠️

1. **설정 복잡도**
   - 서버 관리 필요
   - 보안 설정 직접 관리
   - SSL 인증서 설정 필요

2. **운영 부담**
   - 서버 모니터링 필요
   - 업데이트 및 패치 관리
   - 백업 관리

## 사전 준비사항

- AWS 계정
- EC2 인스턴스 (또는 생성할 준비)
- RDS 인스턴스 (이미 사용 중)
- 도메인 (선택사항, SSL 인증서용)

## 1단계: EC2 인스턴스 생성

### 1.1 인스턴스 시작

1. AWS 콘솔 → EC2 → Launch Instance
2. 설정:
   - **Name**: `chalog-backend`
   - **AMI**: Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Instance Type**: t2.micro (Free tier) 또는 t3.small
   - **Key Pair**: 기존 키 페어 선택 또는 새로 생성
   - **Network Settings**: 
     - VPC: RDS와 같은 VPC 선택
     - Subnet: Public subnet 선택
     - Auto-assign Public IP: Enable
     - Security Group: 새로 생성 (아래 참고)

### 1.2 보안 그룹 설정

**인바운드 규칙:**
- SSH (22) - 내 IP만 허용
- HTTP (80) - 0.0.0.0/0 (Let's Encrypt용)
- HTTPS (443) - 0.0.0.0/0
- Custom TCP (3000) - 선택사항 (직접 접근용)

**아웃바운드 규칙:**
- All traffic - 0.0.0.0/0

### 1.3 RDS 보안 그룹 수정

RDS 보안 그룹에 EC2 보안 그룹을 추가:

1. AWS 콘솔 → RDS → 데이터베이스 선택
2. Connectivity & security → VPC security groups
3. 보안 그룹 편집
4. EC2 보안 그룹 추가 (MySQL/Aurora 포트 3306)

## 2단계: EC2 서버 초기 설정

### 2.1 SSH 접속

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
```

### 2.2 시스템 업데이트

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.3 Node.js 설치

```bash
# Node.js 20 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 버전 확인
node --version  # v20.x.x
npm --version
```

### 2.4 PM2 설치

```bash
sudo npm install -g pm2

# PM2 부팅 시 자동 시작 설정
pm2 startup
# 출력된 명령어 실행 (sudo 권한 필요)
```

### 2.5 Nginx 설치 (선택사항, 리버스 프록시용)

```bash
sudo apt-get install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2.6 프로젝트 디렉토리 생성

```bash
mkdir -p /home/ubuntu/chalog-backend
cd /home/ubuntu/chalog-backend
```

## 3단계: 프로젝트 배포

### 3.1 Git 클론 (방법 1: 직접 클론)

```bash
# GitHub 저장소 클론
git clone https://github.com/your-username/ChaLog.git
cd ChaLog/backend

# 의존성 설치
npm install --production

# 빌드
npm run build
```

### 3.2 배포 스크립트 사용 (방법 2: 권장)

로컬에서 배포 스크립트 실행:

```bash
cd backend
chmod +x deploy.sh
./deploy.sh your-ec2-ip ubuntu ~/.ssh/your-key.pem
```

### 3.3 환경 변수 설정

EC2에서 `.env` 파일 생성:

```bash
nano /home/ubuntu/chalog-backend/.env
```

```env
# 데이터베이스 (RDS 직접 연결, SSH 터널 불필요)
DATABASE_URL=mysql://admin:password@your-rds-endpoint.rds.amazonaws.com:3306/chalog
DB_SYNCHRONIZE=false
DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=false

# JWT
JWT_SECRET=your-production-secret-key-change-this
JWT_EXPIRES_IN=7d

# 서버 설정
PORT=3000
NODE_ENV=production

# 프론트엔드 URL
FRONTEND_URL=https://cha-log-gilt.vercel.app
FRONTEND_URLS=https://cha-log-gilt.vercel.app,http://localhost:5173
```

### 3.4 PM2로 실행

```bash
cd /home/ubuntu/chalog-backend

# PM2로 앱 시작
pm2 start ecosystem.config.js

# 상태 확인
pm2 status

# 로그 확인
pm2 logs chalog-backend

# 부팅 시 자동 시작 저장
pm2 save
```

## 4단계: Nginx 리버스 프록시 설정 (권장)

### 4.1 Nginx 설정 파일 생성

```bash
sudo nano /etc/nginx/sites-available/chalog-backend
```

`backend/nginx.conf.example` 파일 내용 복사하여 수정

### 4.2 도메인 설정

도메인이 있다면:
- A 레코드: `api.yourdomain.com` → EC2 Public IP

도메인이 없다면:
- EC2 Public IP로 직접 접근 (SSL 인증서 없이)

### 4.3 SSL 인증서 설정 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt-get install certbot python3-certbot-nginx -y

# SSL 인증서 발급 (도메인 필요)
sudo certbot --nginx -d api.yourdomain.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

### 4.4 Nginx 활성화 및 재시작

```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/chalog-backend /etc/nginx/sites-enabled/

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

## 5단계: 배포 확인

### 5.1 Health Check

```bash
# 직접 포트로 확인
curl http://localhost:3000/health

# Nginx를 통한 확인 (도메인 설정 시)
curl https://api.yourdomain.com/health
```

### 5.2 로그 확인

```bash
# PM2 로그
pm2 logs chalog-backend

# Nginx 로그
sudo tail -f /var/log/nginx/chalog-backend-access.log
sudo tail -f /var/log/nginx/chalog-backend-error.log
```

### 5.3 프론트엔드 환경 변수 업데이트

Vercel 대시보드에서:

```env
VITE_API_BASE_URL=https://api.yourdomain.com
# 또는 IP 사용 시
VITE_API_BASE_URL=http://your-ec2-ip:3000
```

## 6단계: 모니터링 및 유지보수

### 6.1 PM2 모니터링

```bash
# 실시간 모니터링
pm2 monit

# 메모리 사용량 확인
pm2 list

# 재시작
pm2 restart chalog-backend

# 중지
pm2 stop chalog-backend
```

### 6.2 로그 로테이션 설정

```bash
# PM2 모듈 설치
pm2 install pm2-logrotate

# 설정
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 6.3 자동 백업 (선택사항)

```bash
# 백업 스크립트 생성
nano /home/ubuntu/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/chalog-backend-$DATE.tar.gz /home/ubuntu/chalog-backend

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
chmod +x /home/ubuntu/backup.sh

# Crontab에 추가 (매일 새벽 2시)
crontab -e
# 추가: 0 2 * * * /home/ubuntu/backup.sh
```

## 업데이트 배포

### 방법 1: 배포 스크립트 사용

```bash
cd backend
./deploy.sh your-ec2-ip ubuntu ~/.ssh/your-key.pem
```

### 방법 2: 수동 배포

```bash
# EC2에 SSH 접속
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# 프로젝트 업데이트
cd /home/ubuntu/chalog-backend
git pull origin main

# 의존성 업데이트
npm install --production

# 빌드
npm run build

# PM2 재시작
pm2 restart chalog-backend
```

## 비용 예상

### t2.micro (Free Tier)
- **1년간 무료** (월 750시간)
- 이후: 약 $8-10/월

### t3.small
- **약 $15/월** (2 vCPU, 2GB RAM)
- 더 나은 성능

### 추가 비용
- 데이터 전송: 첫 1GB 무료, 이후 $0.09/GB
- EBS 스토리지: $0.10/GB/월 (기본 8GB 포함)

## 보안 체크리스트

- [ ] SSH 키 페어 보안 관리
- [ ] 보안 그룹 최소 권한 원칙 적용
- [ ] SSL 인증서 설정 (HTTPS)
- [ ] 환경 변수 안전하게 관리
- [ ] 정기적인 시스템 업데이트
- [ ] PM2 로그 모니터링
- [ ] 방화벽 설정 확인
- [ ] RDS 보안 그룹 제한

## 문제 해결

### 연결 실패
```bash
# PM2 상태 확인
pm2 status

# 로그 확인
pm2 logs chalog-backend --lines 50

# 포트 확인
sudo netstat -tlnp | grep 3000
```

### RDS 연결 실패
- RDS 보안 그룹에 EC2 보안 그룹 추가 확인
- `DATABASE_URL` 형식 확인
- SSL 설정 확인

### Nginx 502 Bad Gateway
- 백엔드가 실행 중인지 확인: `pm2 status`
- 포트 확인: `curl http://localhost:3000/health`
- Nginx 설정 확인: `sudo nginx -t`

## 다음 단계

1. **Auto Scaling Group 설정** (트래픽 증가 시)
2. **Application Load Balancer 추가** (고가용성)
3. **CloudWatch 모니터링 설정**
4. **CI/CD 파이프라인 구축** (GitHub Actions 등)

## 참고 자료

- [AWS EC2 문서](https://docs.aws.amazon.com/ec2/)
- [PM2 문서](https://pm2.keymetrics.io/)
- [Nginx 문서](https://nginx.org/en/docs/)
- [Let's Encrypt 문서](https://letsencrypt.org/docs/)

