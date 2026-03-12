# Lightsail Docker MySQL 마이그레이션 실행 가이드

계획 파일의 모든 단계를 실행하기 위한 상세 가이드입니다.

## 준비된 스크립트

다음 스크립트들이 준비되었습니다:

1. **`scripts/setup-nginx.sh`** - Nginx 설정 및 활성화
2. **`scripts/execute-migration-plan.sh`** - 전체 마이그레이션 프로세스 자동화
3. **`scripts/run-migration-via-browser.sh`** - 브라우저 SSH용 마이그레이션 명령어 생성

## 실행 단계

### 1. Lightsail Docker MySQL 마이그레이션

Lightsail 인스턴스에 SSH 접속 후 실행:

```bash
# SSH 접속
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@YOUR_LIGHTSAIL_IP

cd /home/ubuntu/chalog-backend

# .env 확인
export $(cat .env | xargs)

# 마이그레이션 실행
npx typeorm-ts-node-commonjs migration:run -d dist/src/database/data-source.js
```

**주의사항:**
- Docker MySQL 컨테이너가 실행 중이어야 합니다 (`docker ps | grep chalog-mysql`)
- `DATABASE_URL`이 `mysql://chalog_user:password@chalog-mysql:3306/chalog` 형식이어야 합니다

### 2. GitHub Actions 워크플로우 확인

GitHub Secrets가 올바르게 설정되어 있는지 확인:

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. 다음 Secrets 확인:
   - `EC2_HOST`: `YOUR_LIGHTSAIL_IP`
   - `EC2_USER`: `ubuntu`
   - `EC2_SSH_KEY`: Lightsail SSH 키 전체 내용
   - `EC2_DATABASE_URL`: `mysql://chalog_user:changeme_password@chalog-mysql:3306/chalog`
   - `EC2_JWT_SECRET`: 기존 JWT Secret 값

자세한 내용: `docs/deployment/GITHUB_SECRETS_SETUP.md`

### 3. 애플리케이션 배포

#### 방법 1: GitHub Actions 사용 (권장)

1. GitHub 저장소 → Actions 탭
2. "Deploy Backend to EC2" 워크플로우 선택
3. "Run workflow" 클릭
4. 배포 완료 대기

#### 방법 2: 수동 배포

Lightsail 인스턴스에서 직접 배포:

```bash
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@YOUR_LIGHTSAIL_IP

cd /home/ubuntu/chalog-backend

# .env 파일 생성 (DATABASE_URL을 localhost:3306으로 변경)
cat > .env << EOF
DATABASE_URL=mysql://chalog_user:changeme_password@chalog-mysql:3306/chalog
DB_SYNCHRONIZE=false
DB_SSL_ENABLED=false
DB_SSL_REJECT_UNAUTHORIZED=false
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://cha-log-gilt.vercel.app
FRONTEND_URLS=https://cha-log-gilt.vercel.app,http://localhost:5173,http://localhost:5174
EOF

# Git에서 최신 코드 가져오기 (또는 배포 파일 압축 해제)
# ...

# 의존성 설치
npm ci --legacy-peer-deps --production

# 빌드 (로컬에서 빌드한 경우)
# npm run build

# PM2로 시작
pm2 start ecosystem.config.js
pm2 save
```

### 4. 데이터베이스 마이그레이션 실행

애플리케이션 배포 후 TypeORM 마이그레이션 실행:

```bash
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@YOUR_LIGHTSAIL_IP

cd /home/ubuntu/chalog-backend

# 환경 변수 로드
export $(cat .env | xargs)

# 마이그레이션 실행
if [ -f "dist/src/database/data-source.ts" ]; then
    npx typeorm-ts-node-commonjs migration:run -d dist/src/database/data-source.ts
elif [ -f "src/database/data-source.ts" ]; then
    npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
fi
```

### 5. Nginx 설정

로컬에서 실행:

```bash
cd /Users/jwp/Documents/programming/ChaLog
./scripts/setup-nginx.sh YOUR_LIGHTSAIL_IP
```

또는 수동으로:

```bash
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@YOUR_LIGHTSAIL_IP

# Nginx 설정 파일 생성
sudo tee /etc/nginx/sites-available/chalog-backend > /dev/null << 'EOF'
server {
    listen 80;
    server_name YOUR_LIGHTSAIL_IP;
    
    access_log /var/log/nginx/chalog-backend-access.log;
    error_log /var/log/nginx/chalog-backend-error.log;
    
    client_max_body_size 50M;
    
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
    
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        access_log off;
    }
}
EOF

# 설정 활성화
sudo ln -s /etc/nginx/sites-available/chalog-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 설정 검증 및 재시작
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 6. 애플리케이션 테스트

```bash
# Health check (직접 포트)
curl http://YOUR_LIGHTSAIL_IP:3000/health

# Health check (Nginx를 통한)
curl http://YOUR_LIGHTSAIL_IP/health

# PM2 상태 확인
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@YOUR_LIGHTSAIL_IP "pm2 status"

# PM2 로그 확인
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@YOUR_LIGHTSAIL_IP "pm2 logs chalog-backend --lines 50"

# MySQL 연결 확인
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@YOUR_LIGHTSAIL_IP \
    "docker exec chalog-mysql mysql -uchalog_user -pchangeme_password -e 'SELECT 1' chalog"
```

## 전체 프로세스 자동화

모든 단계를 자동으로 실행하려면:

```bash
cd /Users/jwp/Documents/programming/ChaLog
./scripts/execute-migration-plan.sh
```

이 스크립트는 각 단계를 순차적으로 실행하며, 사용자 확인이 필요한 부분에서 멈춥니다.

## 문제 해결

### SSH 연결 실패

- Lightsail 인스턴스가 실행 중인지 확인
- 네트워크 연결 확인
- SSH 키 권한 확인: `chmod 400 LightsailDefaultKey-ap-northeast-2.pem`

### Docker MySQL 연결 실패

- 컨테이너 실행 상태 확인: `docker ps | grep chalog-mysql`
- 컨테이너 로그 확인: `docker logs chalog-mysql`
- 포트 확인: `docker port chalog-mysql`

### 애플리케이션 시작 실패

- PM2 로그 확인: `pm2 logs chalog-backend`
- 환경 변수 확인: `cat /home/ubuntu/chalog-backend/.env`
- 데이터베이스 연결 확인
- 포트 충돌 확인: `sudo netstat -tulpn | grep 3000`

## 체크리스트

- [ ] Docker MySQL 컨테이너 실행 중
- [ ] Docker MySQL 컨테이너 실행 확인
- [ ] GitHub Secrets 설정 완료
- [ ] 애플리케이션 배포 완료
- [ ] 데이터베이스 마이그레이션 실행 완료
- [ ] Nginx 설정 완료
- [ ] Health check 통과
- [ ] 모든 기능 테스트 완료
## 다음 단계

마이그레이션이 완료되면:

1. 모든 기능이 정상 작동하는지 확인
2. 데이터 무결성 확인
3. 백업 스크립트 설정 확인
4. 모니터링 설정
