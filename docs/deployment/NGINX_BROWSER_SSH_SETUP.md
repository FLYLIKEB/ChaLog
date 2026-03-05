# 브라우저 SSH에서 Nginx 설정 가이드

로컬 SSH가 안 될 때 브라우저 SSH를 사용하여 Nginx를 설정하는 방법입니다.

## 사전 준비

1. Lightsail 콘솔 → 인스턴스 선택 → "브라우저에서 연결"
2. 브라우저 터미널이 열림

## Nginx 설정 단계

### 1단계: Nginx 설치 확인

```bash
# Nginx 설치 확인
nginx -v

# 설치되지 않은 경우
sudo apt-get update
sudo apt-get install -y nginx
```

### 2단계: 설정 파일 생성

```bash
sudo tee /etc/nginx/sites-available/chalog-backend > /dev/null << 'EOF'
server {
    listen 80;
    server_name 3.39.48.139;
    
    # 로그 설정
    access_log /var/log/nginx/chalog-backend-access.log;
    error_log /var/log/nginx/chalog-backend-error.log;
    
    # 클라이언트 최대 본문 크기 (파일 업로드용)
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
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check 엔드포인트 (캐싱 없이)
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        access_log off;
    }
}
EOF
```

### 3단계: 설정 활성화

```bash
# 기존 심볼릭 링크 제거 (있으면)
sudo rm -f /etc/nginx/sites-enabled/chalog-backend

# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/chalog-backend /etc/nginx/sites-enabled/

# 기본 설정 비활성화 (있으면)
sudo rm -f /etc/nginx/sites-enabled/default
```

### 4단계: 설정 검증

```bash
# Nginx 설정 테스트
sudo nginx -t
```

예상 출력:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5단계: Nginx 재시작

```bash
# Nginx 재시작
sudo systemctl restart nginx

# 부팅 시 자동 시작 설정
sudo systemctl enable nginx

# 상태 확인
sudo systemctl status nginx
```

### 6단계: 설정 확인

```bash
# Nginx 실행 상태 확인
sudo systemctl is-active nginx

# 포트 80 리스닝 확인
sudo netstat -tlnp | grep :80
# 또는
sudo ss -tlnp | grep :80
```

## 테스트

### Health Check 테스트

```bash
# 내부에서 테스트
curl http://localhost/health

# 외부에서 테스트 (다른 터미널에서)
curl http://3.39.48.139/health
```

예상 응답:
```json
{
  "status": "ok",
  "timestamp": "2026-03-05T12:00:00.000Z"
}
```

### 로그 확인

```bash
# 액세스 로그
sudo tail -f /var/log/nginx/chalog-backend-access.log

# 에러 로그
sudo tail -f /var/log/nginx/chalog-backend-error.log
```

## 문제 해결

### Nginx가 시작되지 않음

```bash
# 설정 파일 검증
sudo nginx -t

# 에러 로그 확인
sudo tail -50 /var/log/nginx/error.log

# Nginx 상태 확인
sudo systemctl status nginx
```

### 502 Bad Gateway

**원인**: 백엔드 애플리케이션이 포트 3000에서 실행되지 않음

**해결 방법**:
```bash
# PM2 상태 확인
pm2 status

# 애플리케이션 재시작
pm2 restart chalog-backend

# 포트 확인
sudo netstat -tlnp | grep :3000
```

### 504 Gateway Timeout

**원인**: 백엔드 애플리케이션이 응답하지 않음

**해결 방법**:
```bash
# PM2 로그 확인
pm2 logs chalog-backend --lines 100

# 타임아웃 설정 증가 (필요시)
sudo nano /etc/nginx/sites-available/chalog-backend
# proxy_read_timeout을 120s로 증가

# Nginx 재시작
sudo systemctl restart nginx
```

## 한 번에 실행하는 스크립트

브라우저 SSH에서 다음 명령어를 한 번에 실행:

```bash
# Nginx 설치
sudo apt-get update && sudo apt-get install -y nginx

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
sudo rm -f /etc/nginx/sites-enabled/chalog-backend
sudo ln -s /etc/nginx/sites-available/chalog-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 설정 검증 및 재시작
sudo nginx -t && sudo systemctl restart nginx && sudo systemctl enable nginx

# 상태 확인
sudo systemctl status nginx
```

## 참고 문서

- [Nginx 설정 가이드](./NGINX_SETUP_GUIDE.md)
- [배포 체크리스트](./DEPLOYMENT_CHECKLIST.md)
- [브라우저 SSH 명령어 모음](./BROWSER_SSH_COMMANDS.md)
