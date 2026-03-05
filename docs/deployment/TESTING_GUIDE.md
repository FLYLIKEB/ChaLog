# 테스트 가이드

Lightsail Docker MySQL 배포 후 애플리케이션 테스트 가이드입니다.

## 사전 확인

### 1. 배포 상태 확인

```bash
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.39.48.139

# PM2 상태 확인
pm2 status

# 예상 출력:
# ┌─────┬──────────────────┬─────────┬─────────┬──────────┐
# │ id  │ name             │ status  │ restart │ uptime   │
# ├─────┼──────────────────┼─────────┼─────────┼──────────┤
# │ 0   │ chalog-backend   │ online  │ 0       │ 5m       │
# └─────┴──────────────────┴─────────┴─────────┴──────────┘
```

### 2. Docker MySQL 컨테이너 확인

```bash
docker ps | grep chalog-mysql

# 예상 출력:
# CONTAINER ID   IMAGE       STATUS         PORTS                      NAMES
# abc123def456   mysql:8.0   Up 10 minutes  127.0.0.1:3306->3306/tcp  chalog-mysql
```

### 3. 포트 리스닝 확인

```bash
# 백엔드 포트 (3000)
sudo netstat -tlnp | grep :3000

# Nginx 포트 (80)
sudo netstat -tlnp | grep :80
```

## Health Check 테스트

### 1. 직접 접근 (포트 3000)

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

### 2. Nginx를 통한 접근 (포트 80)

```bash
curl http://3.39.48.139/health
```

예상 응답: 동일

### 3. 브라우저에서 확인

- 직접 접근: `http://3.39.48.139:3000/health`
- Nginx를 통한 접근: `http://3.39.48.139/health`

## 데이터베이스 연결 테스트

### 1. Docker MySQL 연결 확인

```bash
docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "SELECT 1"
```

### 2. 애플리케이션에서 데이터베이스 연결 확인

애플리케이션 로그에서 데이터베이스 연결 메시지 확인:

```bash
pm2 logs chalog-backend --lines 50 | grep -i "database\|mysql\|connected"
```

예상 출력:

```
[Nest] INFO [TypeOrmModule] Database connection established
```

### 3. 데이터베이스 테이블 확인

```bash
docker exec chalog-mysql mysql -uroot -pchangeme_root_password chalog -e "SHOW TABLES;"
```

## API 엔드포인트 테스트

### 1. 기본 엔드포인트

```bash
# 루트 엔드포인트
curl http://3.39.48.139/

# 또는 Nginx를 통한 접근
curl http://3.39.48.139/
```

### 2. 인증이 필요한 엔드포인트

```bash
# 로그인 (예시)
curl -X POST http://3.39.48.139/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test"}'

# JWT 토큰으로 보호된 엔드포인트
curl http://3.39.48.139/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. 데이터베이스 작업 테스트

```bash
# 데이터 생성 (예시)
curl -X POST http://3.39.48.139/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title": "Test Note", "content": "Test Content"}'

# 데이터 조회
curl http://3.39.48.139/api/notes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 성능 테스트

### 1. 응답 시간 측정

```bash
time curl -s http://3.39.48.139/health > /dev/null
```

### 2. 동시 요청 테스트

```bash
# Apache Bench 사용 (설치 필요: sudo apt-get install apache2-utils)
ab -n 100 -c 10 http://3.39.48.139/health
```

### 3. 부하 테스트

```bash
# 여러 요청 동시 실행
for i in {1..10}; do
  curl -s http://3.39.48.139/health &
done
wait
```

## 로그 확인

### 1. PM2 로그

```bash
# 실시간 로그
pm2 logs chalog-backend

# 최근 100줄
pm2 logs chalog-backend --lines 100

# 에러만 확인
pm2 logs chalog-backend --err
```

### 2. Nginx 로그

```bash
# 액세스 로그
sudo tail -f /var/log/nginx/chalog-backend-access.log

# 에러 로그
sudo tail -f /var/log/nginx/chalog-backend-error.log
```

### 3. Docker MySQL 로그

```bash
docker logs chalog-mysql --tail 50
```

## 모니터링

### 1. 시스템 리소스 확인

```bash
# CPU 및 메모리 사용량
top

# 또는
htop

# 메모리만 확인
free -h

# 디스크 사용량
df -h
```

### 2. PM2 모니터링

```bash
# 실시간 모니터링
pm2 monit

# 상세 정보
pm2 describe chalog-backend
```

### 3. Docker 리소스 확인

```bash
# 컨테이너 리소스 사용량
docker stats chalog-mysql

# Docker 디스크 사용량
docker system df
```

## 문제 해결

### Health Check 실패

1. PM2 상태 확인:
   ```bash
   pm2 status
   ```

2. 애플리케이션 재시작:
   ```bash
   pm2 restart chalog-backend
   ```

3. 로그 확인:
   ```bash
   pm2 logs chalog-backend --lines 100
   ```

### 데이터베이스 연결 실패

1. Docker MySQL 컨테이너 확인:
   ```bash
   docker ps | grep chalog-mysql
   ```

2. MySQL 연결 테스트:
   ```bash
   docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "SELECT 1"
   ```

3. 환경 변수 확인:
   ```bash
   cat /home/ubuntu/chalog-backend/.env | grep DATABASE_URL
   ```

### API 엔드포인트 응답 없음

1. 포트 확인:
   ```bash
   sudo netstat -tlnp | grep :3000
   ```

2. 방화벽 확인:
   ```bash
   sudo ufw status
   ```

3. Nginx 설정 확인:
   ```bash
   sudo nginx -t
   sudo cat /etc/nginx/sites-available/chalog-backend
   ```

## 테스트 체크리스트

배포 후 다음 항목을 확인하세요:

- [ ] Health check 엔드포인트 응답 (`/health`)
- [ ] 데이터베이스 연결 정상
- [ ] PM2 프로세스 실행 중
- [ ] Nginx 리버스 프록시 작동
- [ ] API 엔드포인트 응답
- [ ] 로그에 에러 없음
- [ ] 메모리 사용량 정상
- [ ] 디스크 공간 충분

## 참고 문서

- [배포 실행 가이드](./DEPLOYMENT_EXECUTION_GUIDE.md)
- [Nginx 설정 가이드](./NGINX_SETUP_GUIDE.md)
- [모니터링 가이드](./MONITORING_GUIDE.md)
