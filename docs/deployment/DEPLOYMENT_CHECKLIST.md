# 배포 체크리스트

Lightsail Docker MySQL 배포를 위한 빠른 체크리스트입니다.

## 사전 준비

### 1. GitHub Secrets 설정

GitHub 저장소 → Settings → Secrets and variables → Actions

필수 Secrets:
- [ ] `EC2_HOST`: Lightsail Public IP (예: `3.39.48.139`)
- [ ] `EC2_USER`: `ubuntu` (Lightsail SSH 사용자명)
- [ ] `EC2_SSH_KEY`: Lightsail SSH 키 전체 내용
  - 확인: `cat LightsailDefaultKey-ap-northeast-2.pem`
- [ ] `EC2_DATABASE_URL`: `mysql://chalog_user:changeme_password@localhost:3306/chalog`
- [ ] `EC2_JWT_SECRET`: JWT Secret 값

선택적 Secrets:
- [ ] `EC2_FRONTEND_URL`: `https://cha-log-gilt.vercel.app`
- [ ] `EC2_FRONTEND_URLS`: `https://cha-log-gilt.vercel.app,http://localhost:5173,http://localhost:5174`

### 2. 배포 준비 스크립트 실행

```bash
./scripts/prepare-deployment.sh
```

이 스크립트는 다음을 확인합니다:
- SSH 키 파일 존재 및 형식
- GitHub Secrets 체크리스트 표시
- 배포 실행 방법 안내

## 배포 실행

### 방법 1: GitHub Actions 수동 실행 (권장)

1. GitHub 저장소 → **Actions** 탭
2. "Deploy Backend to Lightsail" 워크플로우 선택
3. **Run workflow** 버튼 클릭
4. 브랜치 선택 (`main`)
5. **Run workflow** 클릭
6. 배포 완료 대기 (약 5-10분)

### 방법 2: 코드 푸시로 자동 실행

```bash
git add backend/
git commit -m "feat: 배포 준비"
git push origin main
```

## 배포 후 확인

### 1. GitHub Actions 로그 확인

워크플로우 실행 로그에서 확인:
- [ ] SSH 연결 성공
- [ ] 빌드 성공
- [ ] 마이그레이션 실행 성공
- [ ] Health check 통과

### 2. 브라우저 SSH에서 확인

Lightsail 콘솔 → "브라우저에서 연결":

```bash
# PM2 상태 확인
pm2 status

# 애플리케이션 로그 확인
pm2 logs chalog-backend --lines 50

# Health check (내부에서)
curl http://localhost:3000/health

# Docker MySQL 컨테이너 확인
docker ps | grep chalog-mysql
```

### 3. 외부에서 Health Check

```bash
curl http://3.39.48.139:3000/health
```

예상 응답:
```json
{
  "status": "ok",
  "timestamp": "2026-03-05T12:00:00.000Z"
}
```

## Nginx 설정

### 로컬 SSH가 가능한 경우

```bash
./scripts/setup-nginx.sh 3.39.48.139
```

### 브라우저 SSH를 사용하는 경우

브라우저 SSH에서 다음 명령어 실행:

```bash
# Nginx 설치 확인
sudo apt-get update
sudo apt-get install -y nginx

# 설정 파일 생성
sudo tee /etc/nginx/sites-available/chalog-backend > /dev/null << 'EOF'
server {
    listen 80;
    server_name 3.39.48.139;
    
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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
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

## 최종 테스트

- [ ] Health check 통과 (포트 3000)
- [ ] Health check 통과 (Nginx를 통한 접근)
- [ ] API 엔드포인트 테스트
- [ ] 데이터베이스 연결 확인
- [ ] PM2 프로세스 실행 중
- [ ] 로그에 에러 없음

## 문제 해결

### 배포 실패

1. GitHub Actions 로그 확인
2. SSH 연결 실패: `EC2_SSH_KEY` Secret (Lightsail SSH 키) 확인
3. 빌드 실패: 로컬에서 빌드 테스트
4. 마이그레이션 실패: 브라우저 SSH에서 수동 실행

### Health Check 실패

1. 브라우저 SSH에서 PM2 상태 확인: `pm2 status`
2. 로그 확인: `pm2 logs chalog-backend`
3. 데이터베이스 연결 확인: `docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "SELECT 1"`

## 관련 문서

- [GitHub Secrets 체크리스트](./GITHUB_SECRETS_CHECKLIST.md)
- [배포 실행 가이드](./DEPLOYMENT_EXECUTION_GUIDE.md)
- [빠른 배포 시작 가이드](./QUICK_START_DEPLOYMENT.md)
- [Nginx 설정 가이드](./NGINX_SETUP_GUIDE.md)
- [테스트 가이드](./TESTING_GUIDE.md)
