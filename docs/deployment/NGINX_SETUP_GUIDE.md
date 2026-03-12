# Nginx 설정 가이드

Lightsail 인스턴스에 Nginx 리버스 프록시를 설정하는 가이드입니다.

## 개요

Nginx는 포트 80(HTTP)에서 들어오는 요청을 포트 3000에서 실행 중인 백엔드 애플리케이션으로 프록시합니다.

## 자동 설정 (권장)

### 스크립트 실행

```bash
./scripts/setup-nginx.sh YOUR_LIGHTSAIL_IP
```

또는 SSH 키 경로 지정:

```bash
SSH_KEY_PATH=~/.ssh/your-key.pem ./scripts/setup-nginx.sh YOUR_LIGHTSAIL_IP
```

### 스크립트가 수행하는 작업

1. ✅ Nginx 설치 확인 및 설치 (없는 경우)
2. ✅ Nginx 설정 파일 생성 (`/etc/nginx/sites-available/chalog-backend`)
3. ✅ 설정 활성화 (심볼릭 링크 생성)
4. ✅ Nginx 설정 검증
5. ✅ Nginx 재시작 및 자동 시작 설정

## 수동 설정

### 1. Nginx 설치

```bash
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@YOUR_LIGHTSAIL_IP

sudo apt-get update
sudo apt-get install -y nginx
```

### 2. 설정 파일 생성

```bash
sudo tee /etc/nginx/sites-available/chalog-backend > /dev/null << 'EOF'
server {
    listen 80;
    server_name YOUR_LIGHTSAIL_IP;
    
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

### 3. 설정 활성화

```bash
# 기존 심볼릭 링크 제거 (있으면)
sudo rm -f /etc/nginx/sites-enabled/chalog-backend

# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/chalog-backend /etc/nginx/sites-enabled/

# 기본 설정 비활성화 (있으면)
sudo rm -f /etc/nginx/sites-enabled/default
```

### 4. 설정 검증

```bash
sudo nginx -t
```

예상 출력:

```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. Nginx 재시작

```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 6. 상태 확인

```bash
sudo systemctl status nginx
```

## 설정 확인

### Nginx 실행 상태

```bash
sudo systemctl is-active nginx
# 출력: active
```

### 포트 리스닝 확인

```bash
sudo netstat -tlnp | grep :80
# 또는
sudo ss -tlnp | grep :80
```

예상 출력:

```
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      12345/nginx: master
```

### Health Check 테스트

```bash
# 직접 접근
curl http://YOUR_LIGHTSAIL_IP:3000/health

# Nginx를 통한 접근
curl http://YOUR_LIGHTSAIL_IP/health
```

## 로그 확인

### 액세스 로그

```bash
sudo tail -f /var/log/nginx/chalog-backend-access.log
```

### 에러 로그

```bash
sudo tail -f /var/log/nginx/chalog-backend-error.log
```

### 전체 로그

```bash
sudo tail -f /var/log/nginx/chalog-backend-*.log
```

## 문제 해결

### Nginx가 시작되지 않음

1. 설정 파일 검증:
   ```bash
   sudo nginx -t
   ```

2. 에러 로그 확인:
   ```bash
   sudo tail -50 /var/log/nginx/error.log
   ```

3. 포트 충돌 확인:
   ```bash
   sudo netstat -tlnp | grep :80
   ```

### 502 Bad Gateway

**원인**: 백엔드 애플리케이션이 포트 3000에서 실행되지 않음

**해결 방법**:
1. 백엔드 애플리케이션 상태 확인:
   ```bash
   pm2 status
   curl http://localhost:3000/health
   ```

2. 백엔드 재시작:
   ```bash
   pm2 restart chalog-backend
   ```

3. 포트 확인:
   ```bash
   sudo netstat -tlnp | grep :3000
   ```

### 504 Gateway Timeout

**원인**: 백엔드 애플리케이션이 응답하지 않음

**해결 방법**:
1. 백엔드 로그 확인:
   ```bash
   pm2 logs chalog-backend --lines 100
   ```

2. 타임아웃 설정 증가:
   ```bash
   sudo nano /etc/nginx/sites-available/chalog-backend
   # proxy_read_timeout을 120s로 증가
   ```

3. Nginx 재시작:
   ```bash
   sudo systemctl restart nginx
   ```

### 설정 파일 수정 후 적용 안 됨

1. 설정 검증:
   ```bash
   sudo nginx -t
   ```

2. Nginx 재시작:
   ```bash
   sudo systemctl restart nginx
   ```

3. 또는 리로드 (다운타임 없음):
   ```bash
   sudo systemctl reload nginx
   ```

## 고급 설정

### SSL/TLS 설정 (HTTPS)

Let's Encrypt를 사용한 SSL 인증서 설정:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Rate Limiting

Nginx 설정에 rate limiting 추가:

```nginx
# /etc/nginx/sites-available/chalog-backend
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

server {
    # ...
    
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://localhost:3000;
        # ...
    }
}
```

### Gzip 압축

```nginx
server {
    # ...
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

## 참고 문서

- [Nginx 공식 문서](https://nginx.org/en/docs/)
- [배포 실행 가이드](./DEPLOYMENT_EXECUTION_GUIDE.md)
- [Lightsail Docker MySQL 가이드](./LIGHTSAIL_DOCKER_MYSQL.md)
