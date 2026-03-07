# AWS Lightsail 마이그레이션 가이드

EC2에서 Lightsail로 전환하여 비용을 절감하는 가이드입니다.

## 목차

1. [비용 비교](#비용-비교)
2. [마이그레이션 전 준비사항](#마이그레이션-전-준비사항)
3. [Lightsail 인스턴스 생성](#lightsail-인스턴스-생성)
4. [데이터 마이그레이션](#데이터-마이그레이션)
5. [애플리케이션 배포](#애플리케이션-배포)
6. [배포 스크립트 수정](#배포-스크립트-수정)
7. [검증 및 전환](#검증-및-전환)
8. [EC2 인스턴스 종료](#ec2-인스턴스-종료)

## 비용 비교

### 현재 (EC2 t3.small)

| 항목 | 월 비용 |
|------|---------|
| EC2 인스턴스 (t3.small) | $15-30 |
| 데이터 전송 (100GB 이후) | $9-18 |
| EBS 스토리지 (20GB) | $2 |
| **총 예상 비용** | **$26-50/월** |

### Lightsail 전환 후

| 플랜 | 사양 | 월 비용 | 데이터 전송 포함 |
|------|------|---------|------------------|
| 2GB 플랜 | 1 vCPU, 2GB RAM | $10 | 3TB |
| 4GB 플랜 | 2 vCPU, 4GB RAM | $20 | 4TB |

**예상 절감액**: $10-30/월 (50-70% 절감)

## 마이그레이션 전 준비사항

### 1. 현재 상태 확인

```bash
# EC2에서 현재 애플리케이션 상태 확인
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.39.48.139

# PM2 상태 확인
pm2 status
pm2 logs chalog-backend --lines 50

# 디스크 사용량 확인
df -h
du -sh /home/ubuntu/chalog-backend/*
```

### 2. 백업

```bash
# 데이터베이스 백업 (Lightsail Docker MySQL인 경우)
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.39.48.139 \
  "docker exec chalog-mysql mysqldump -uroot -p\${MYSQL_ROOT_PASSWORD} chalog" > chalog-backup-$(date +%Y%m%d).sql

# 애플리케이션 파일 백업
tar -czf chalog-backend-backup-$(date +%Y%m%d).tar.gz \
  /home/ubuntu/chalog-backend/
```

### 3. 환경 변수 확인

EC2 서버의 `.env` 파일을 로컬로 복사:

```bash
# EC2에서 .env 파일 다운로드
scp -i LightsailDefaultKey-ap-northeast-2.pem \
  ubuntu@3.39.48.139:/home/ubuntu/chalog-backend/.env \
  ./backend/.env.backup
```

## Lightsail 인스턴스 생성

### 1. SSH 키 준비

Lightsail 인스턴스 생성 전에 SSH 키를 준비해야 합니다.

#### 방법 1: Lightsail 기본 키 쌍 사용 (권장)

1. **Lightsail 콘솔에서 SSH 키 다운로드**
   - https://lightsail.aws.amazon.com/ 접속
   - 상단 메뉴에서 **Account** 클릭
   - **SSH keys** 탭 선택
   - 리전 선택 (예: `ap-northeast-2` - 서울)
   - 기본 키 쌍이 없으면 자동 생성됨
   - 다운로드 아이콘 클릭하여 `.pem` 파일 다운로드
   - 파일명 예: `LightsailDefaultKey-ap-northeast-2.pem`

2. **SSH 키 권한 설정**
   ```bash
   # 다운로드한 키 파일에 적절한 권한 설정
   chmod 400 ~/Downloads/LightsailDefaultKey-ap-northeast-2.pem
   
   # ~/.ssh 디렉토리로 이동 (선택사항)
   mv ~/Downloads/LightsailDefaultKey-ap-northeast-2.pem ~/.ssh/lightsail-key.pem
   chmod 400 ~/.ssh/lightsail-key.pem
   ```

#### 방법 2: AWS CLI로 기본 키 쌍 다운로드

```bash
# AWS CLI 설치 필요 (없는 경우)
# brew install awscli  # macOS
# 또는 https://aws.amazon.com/cli/

# 기본 키 쌍 다운로드
aws lightsail download-default-key-pair \
  --region ap-northeast-2 \
  --output text > ~/.ssh/lightsail-key.pem

# 권한 설정
chmod 400 ~/.ssh/lightsail-key.pem
```

#### 방법 3: 기존 EC2 키 사용

EC2에서 사용 중인 키를 Lightsail에서도 사용할 수 있습니다:

1. **Lightsail 콘솔 → Account → SSH keys**
2. **"Create new key pair"** 클릭
3. **"Import your own key"** 선택
4. Lightsail 키의 **공개 키** (`LightsailDefaultKey-ap-northeast-2.pem.pub` 또는 `~/.ssh/id_rsa.pub`) 내용을 붙여넣기
5. 키 이름 설정 (예: `chalog-key`)
6. 저장

**주의**: Lightsail에서 사용하는 **개인 키** (`LightsailDefaultKey-ap-northeast-2.pem`)를 그대로 사용할 수 있습니다.

### 2. AWS 콘솔에서 인스턴스 생성

1. **AWS Lightsail 콘솔 접속**
   - https://lightsail.aws.amazon.com/

2. **인스턴스 생성**
   - "인스턴스 만들기" 클릭
   - 플랫폼: Linux/Unix
   - 블루프린트: Ubuntu 22.04 LTS
   - 인스턴스 플랜: **4GB RAM, 2 vCPU** ($20/월) 권장
     - 또는 2GB RAM, 1 vCPU ($10/월) - 트래픽이 적은 경우

3. **인스턴스 이름 설정**
   - 예: `chalog-backend`

4. **SSH 키 쌍 선택**
   - **기본 키 쌍 사용** (방법 1에서 다운로드한 키)
   - 또는 **기존 키 쌍 선택** (방법 3에서 생성한 키)
   - **중요**: 선택한 키의 개인 키를 안전하게 보관하세요

5. **네트워크 설정**
   - 고정 IP 생성 (추가 비용 없음) - **반드시 생성하세요**
   - 방화벽 규칙:
     - HTTP (포트 80)
     - HTTPS (포트 443)
     - SSH (포트 22)

6. **인스턴스 시작**

### 3. SSH 접속 확인

#### 방법 1: SSH 명령어 사용

```bash
# 프로젝트 루트에 있는 Lightsail 키 사용
ssh -i /Users/jwp/Documents/programming/ChaLog/LightsailDefaultKey-ap-northeast-2.pem \
    ubuntu@your-lightsail-ip

# 또는 ~/.ssh로 이동한 경우
ssh -i ~/.ssh/LightsailDefaultKey-ap-northeast-2.pem ubuntu@your-lightsail-ip
```

#### 방법 2: Lightsail 콘솔에서 브라우저 연결 (가장 쉬움)

1. Lightsail 콘솔 → 인스턴스 선택
2. **"Connect using SSH"** 또는 **"브라우저에서 연결"** 버튼 클릭
3. 브라우저에서 터미널이 열림 (SSH 키 불필요)

**장점**: SSH 키 설정 없이 바로 접속 가능

### 3. 초기 설정

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y curl git build-essential

# Node.js 20 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 설치
sudo npm install -g pm2

# Nginx 설치
sudo apt install -y nginx

# 방화벽 설정
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 데이터 마이그레이션

### 1. Lightsail Docker MySQL 확인

Lightsail 인스턴스에서 Docker MySQL이 실행 중인지 확인:

```bash
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.39.48.139
docker ps | grep chalog-mysql
```

### 2. 애플리케이션 디렉토리 생성

```bash
# Lightsail 인스턴스에서
mkdir -p /home/ubuntu/chalog-backend
cd /home/ubuntu/chalog-backend
```

## 애플리케이션 배포

### 1. 환경 변수 설정

EC2에서 백업한 `.env` 파일을 Lightsail에 업로드:

```bash
# 로컬에서
scp -i ~/.ssh/your-lightsail-key.pem \
  ./backend/.env.backup \
  ubuntu@your-lightsail-ip:/home/ubuntu/chalog-backend/.env

# Lightsail에서 확인
cat /home/ubuntu/chalog-backend/.env
```

**중요**: `DATABASE_URL`이 Lightsail Docker MySQL을 가리키는지 확인:
```env
DATABASE_URL=mysql://chalog_user:changeme_password@chalog-mysql:3306/chalog
```

### 2. 애플리케이션 배포

#### 방법 1: GitHub Actions 사용 (권장)

GitHub Secrets 업데이트:
- `EC2_HOST`: Lightsail 인스턴스의 Public IP
- `EC2_USER`: `ubuntu` (동일)
- SSH 키: Lightsail SSH 키를 GitHub Secrets에 추가

#### 방법 2: 수동 배포

```bash
# Lightsail 인스턴스에서
cd /home/ubuntu/chalog-backend

# Git 클론 (또는 파일 전송)
git clone https://github.com/your-username/ChaLog.git .
cd backend

# 의존성 설치
npm ci --production

# 빌드
npm run build

# PM2 시작
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # 시스템 재시작 시 자동 시작 설정
```

### 3. Nginx 설정

```bash
# Nginx 설정 파일 생성
sudo nano /etc/nginx/sites-available/chalog-backend
```

다음 내용 추가:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 또는 Lightsail IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 설정 활성화
sudo ln -s /etc/nginx/sites-available/chalog-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL 인증서 설정 (선택사항)

Let's Encrypt 사용:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 배포 스크립트 수정

### 1. GitHub Actions 워크플로우 수정

`.github/workflows/deploy-backend.yml` 파일 수정:

```yaml
# EC2_HOST를 Lightsail IP로 변경
env:
  EC2_HOST: ${{ secrets.LIGHTSAIL_HOST }}  # 또는 EC2_HOST 유지
  EC2_USER: ubuntu
  # ... 기타 환경 변수
```

GitHub Secrets에 `LIGHTSAIL_HOST` 추가하거나 기존 `EC2_HOST` 값을 Lightsail IP로 변경.

### 2. SSH 키 설정

Lightsail SSH 키를 GitHub Secrets에 추가:
- Settings → Secrets and variables → Actions
- `EC2_SSH_KEY` 또는 새로 `LIGHTSAIL_SSH_KEY` 추가

### 3. 배포 스크립트 확인

기존 배포 스크립트는 그대로 사용 가능합니다. SSH 연결만 Lightsail로 변경됩니다.

## 검증 및 전환

### 1. 기능 테스트

```bash
# Health Check
curl http://your-lightsail-ip/health

# API 엔드포인트 테스트
curl http://your-lightsail-ip/api/notes
```

### 2. 프론트엔드 설정 변경

Vercel 환경 변수 또는 프론트엔드 설정에서 백엔드 URL 변경:

```env
# 기존
BACKEND_URL=http://3.39.48.139:3000

# 변경
BACKEND_URL=http://your-lightsail-ip:3000
# 또는 도메인 사용 시
BACKEND_URL=https://api.yourdomain.com
```

### 3. DNS 설정 (도메인 사용 시)

도메인을 사용하는 경우 DNS 레코드를 Lightsail IP로 변경:

```
A 레코드: api.yourdomain.com → Lightsail IP
```

### 4. 모니터링

```bash
# PM2 모니터링
pm2 monit

# 로그 확인
pm2 logs chalog-backend

# 시스템 리소스 확인
htop
```

## EC2 인스턴스 종료

### 1. 최종 확인

- Lightsail에서 모든 기능이 정상 작동하는지 확인
- 트래픽이 Lightsail로 전환되었는지 확인
- 데이터베이스 연결이 안정적인지 확인

### 2. EC2 인스턴스 중지 (테스트)

```bash
# AWS 콘솔에서 EC2 인스턴스 중지
# 또는
aws ec2 stop-instances --instance-ids i-xxxxx
```

몇 일간 모니터링 후 문제가 없으면 종료합니다.

### 3. EC2 인스턴스 종료

```bash
# AWS 콘솔에서 EC2 인스턴스 종료
# 또는
aws ec2 terminate-instances --instance-ids i-xxxxx
```

**주의**: 인스턴스 종료 전 모든 데이터가 백업되었는지 확인하세요.

## 마이그레이션 체크리스트

- [ ] Lightsail 인스턴스 생성
- [ ] Docker MySQL 컨테이너 실행 확인
- [ ] 데이터베이스 연결 테스트
- [ ] 애플리케이션 배포
- [ ] Nginx 설정
- [ ] SSL 인증서 설정 (선택사항)
- [ ] GitHub Actions 배포 테스트
- [ ] 프론트엔드 백엔드 URL 변경
- [ ] DNS 설정 변경 (도메인 사용 시)
- [ ] 기능 테스트 완료
- [ ] EC2 인스턴스 중지 (테스트)
- [ ] 모니터링 (1-2일)
- [ ] EC2 인스턴스 종료

## 문제 해결

### Docker MySQL 연결 실패

```bash
# 컨테이너 확인
docker ps | grep chalog-mysql

# 연결 테스트 (Lightsail 내부에서)
docker exec -it chalog-mysql mysql -uchalog_user -p -e "SHOW DATABASES;"
```

### PM2 프로세스가 시작되지 않음

```bash
# PM2 로그 확인
pm2 logs chalog-backend

# 환경 변수 확인
pm2 env chalog-backend

# 수동 시작
cd /home/ubuntu/chalog-backend
pm2 start ecosystem.config.js
```

### Nginx 502 에러

```bash
# 백엔드 서버 상태 확인
pm2 status

# 포트 확인
sudo netstat -tlnp | grep 3000

# Nginx 에러 로그 확인
sudo tail -f /var/log/nginx/error.log
```

## 비용 모니터링

마이그레이션 후 AWS 비용 대시보드에서 비용 절감 효과를 확인하세요:

- AWS Cost Explorer에서 Lightsail 비용 확인
- EC2 비용과 비교
- 예상 절감액: $10-30/월

## 추가 최적화

### Lightsail Docker MySQL

현재 Lightsail 인스턴스 내부에 Docker MySQL을 사용하여 비용을 절감하고 있습니다.

## 참고 자료

- [AWS Lightsail 공식 문서](https://docs.aws.amazon.com/lightsail/)
- [Lightsail 가격](https://aws.amazon.com/lightsail/pricing/)
- [EC2에서 Lightsail로 마이그레이션](https://lightsail.aws.amazon.com/ls/docs/en_us/articles/amazon-lightsail-migrating-from-amazon-ec2)
