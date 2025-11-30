# HTTPS 사용 가이드

ChaLog 백엔드의 HTTPS 구조 및 사용 방법입니다.

## 현재 구조

### 인프라 구성

- **도메인**: `api.yourdomain.com` (실제 도메인으로 설정됨)
- **EC2 인스턴스**: Ubuntu Server 22.04 LTS
- **웹 서버**: Nginx (리버스 프록시)
- **SSL 인증서**: Let's Encrypt (자동 갱신)
- **백엔드 서버**: NestJS (포트 3000)

### 네트워크 흐름

```
클라이언트 (HTTPS)
    ↓
Nginx (포트 443) - SSL/TLS 종료
    ↓
백엔드 서버 (포트 3000) - HTTP
```

### 파일 구조

```
EC2 서버:
├── /etc/nginx/sites-available/chalog-backend  # Nginx 설정
├── /etc/nginx/sites-enabled/chalog-backend    # 활성화된 설정 (심볼릭 링크)
├── /etc/letsencrypt/live/api.yourdomain.com/   # SSL 인증서
│   ├── fullchain.pem
│   └── privkey.pem
└── /home/ubuntu/chalog-backend/               # 백엔드 애플리케이션
```

## Nginx 설정

### 현재 설정 위치

- 설정 파일: `/etc/nginx/sites-available/chalog-backend`
- 활성화: `/etc/nginx/sites-enabled/chalog-backend` (심볼릭 링크)

### 주요 기능

1. **HTTP → HTTPS 리다이렉트**
   - 포트 80의 모든 HTTP 요청을 HTTPS로 리다이렉트

2. **SSL/TLS 종료**
   - 포트 443에서 SSL/TLS 처리
   - Let's Encrypt 인증서 사용

3. **백엔드 프록시**
   - `/` 경로를 `localhost:3000`으로 프록시
   - 헤더 전달 (X-Real-IP, X-Forwarded-For 등)

4. **보안 헤더**
   - Strict-Transport-Security
   - X-Frame-Options
   - X-Content-Type-Options

### 설정 확인

```bash
# Nginx 설정 문법 확인
sudo nginx -t

# 설정 파일 보기
sudo cat /etc/nginx/sites-available/chalog-backend

# Nginx 상태 확인
sudo systemctl status nginx
```

### 설정 수정

```bash
# 설정 파일 편집
sudo nano /etc/nginx/sites-available/chalog-backend

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

## SSL 인증서 관리

### 현재 인증서 위치

- 인증서: `/etc/letsencrypt/live/api.yourdomain.com/`
- 자동 갱신: systemd timer로 설정됨

### 인증서 확인

```bash
# 인증서 만료일 확인
sudo certbot certificates

# 인증서 상세 정보
sudo openssl x509 -in /etc/letsencrypt/live/api.yourdomain.com/cert.pem -noout -dates
```

### 인증서 수동 갱신

```bash
# 인증서 갱신
sudo certbot renew

# 갱신 테스트 (실제 갱신 없이)
sudo certbot renew --dry-run

# 갱신 후 Nginx 재시작
sudo certbot renew && sudo systemctl reload nginx
```

### 자동 갱신 확인

```bash
# Certbot timer 상태 확인
sudo systemctl status certbot.timer

# 자동 갱신 로그 확인
sudo journalctl -u certbot.timer
```

## 모니터링

### Health Check

```bash
# HTTPS Health Check
curl https://api.yourdomain.com/health

# HTTP 리다이렉트 확인
curl -I http://api.yourdomain.com/health
# 예상: 301 Moved Permanently → Location: https://...
```

### 로그 확인

```bash
# Nginx 액세스 로그
sudo tail -f /var/log/nginx/chalog-backend-access.log

# Nginx 에러 로그
sudo tail -f /var/log/nginx/chalog-backend-error.log

# Certbot 로그
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### SSL 연결 테스트

```bash
# SSL 인증서 정보 확인
openssl s_client -connect api.yourdomain.com:443 -servername api.yourdomain.com

# SSL Labs 테스트 (온라인)
# https://www.ssllabs.com/ssltest/analyze.html?d=api.yourdomain.com
```

## 문제 해결

### Nginx 502 Bad Gateway

**원인**: 백엔드 서버가 실행되지 않음

**해결**:
```bash
# 백엔드 서버 상태 확인
pm2 status

# 백엔드 서버 재시작
pm2 restart chalog-backend

# 로컬 Health Check
curl http://localhost:3000/health
```

### SSL 인증서 만료

**원인**: 자동 갱신 실패

**해결**:
```bash
# 수동 갱신
sudo certbot renew

# Nginx 재시작
sudo systemctl reload nginx

# 갱신 로그 확인
sudo journalctl -u certbot.service
```

### DNS 전파 문제

**확인**:
```bash
# DNS 확인
dig api.yourdomain.com
nslookup api.yourdomain.com

# 여러 DNS 서버에서 확인
dig @8.8.8.8 api.yourdomain.com
dig @1.1.1.1 api.yourdomain.com
```

### Nginx 설정 오류

**확인**:
```bash
# 설정 문법 확인
sudo nginx -t

# 상세 에러 확인
sudo nginx -T 2>&1 | grep error
```

## Vercel 환경 변수

프론트엔드에서 HTTPS 백엔드를 사용하도록 설정:

- **변수명**: `VITE_API_BASE_URL`
- **값**: `https://api.yourdomain.com`
- **위치**: Vercel 대시보드 → Settings → Environment Variables

## 관련 문서

- [`docs/deployment/AWS_EC2_DEPLOYMENT.md`](./AWS_EC2_DEPLOYMENT.md) - EC2 배포 구조
- [`backend/nginx.conf.example`](../backend/nginx.conf.example) - Nginx 설정 예시
- [`backend/scripts/setup-https.sh`](../backend/scripts/setup-https.sh) - HTTPS 설정 스크립트
