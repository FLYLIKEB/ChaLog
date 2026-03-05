# 브라우저 SSH 명령어 모음

Lightsail 브라우저 SSH에서 사용할 수 있는 명령어 모음입니다.

## 기본 확인 명령어

### 시스템 상태 확인

```bash
# 시스템 정보
hostname
uptime
free -h
df -h

# CPU 및 메모리 사용량
top
# 또는
htop
```

### Docker 상태 확인

```bash
# Docker 버전 확인
docker --version

# Docker 서비스 상태
sudo systemctl status docker

# 실행 중인 컨테이너 확인
docker ps

# 모든 컨테이너 확인 (중지된 것 포함)
docker ps -a

# Docker MySQL 컨테이너 확인
docker ps | grep chalog-mysql
```

### MySQL 컨테이너 확인 스크립트 실행

```bash
cd /home/ubuntu/chalog-backend
./scripts/check-docker-mysql.sh
```

또는 스크립트가 없으면:

```bash
# 컨테이너 상태 확인
docker ps | grep chalog-mysql

# MySQL 연결 테스트
docker exec chalog-mysql mysqladmin ping -h localhost -uroot -pchangeme_root_password

# 데이터베이스 확인
docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "SHOW DATABASES;"

# 테이블 확인
docker exec chalog-mysql mysql -uroot -pchangeme_root_password chalog -e "SHOW TABLES;"
```

## 배포 후 확인 명령어

### PM2 상태 확인

```bash
# PM2 설치 확인
pm2 --version

# PM2 상태 확인
pm2 status

# PM2 프로세스 상세 정보
pm2 describe chalog-backend

# PM2 로그 확인
pm2 logs chalog-backend

# 최근 50줄 로그 확인
pm2 logs chalog-backend --lines 50

# 에러 로그만 확인
pm2 logs chalog-backend --err

# 실시간 모니터링
pm2 monit
```

### 애플리케이션 확인

```bash
# Health check (내부에서)
curl http://localhost:3000/health

# 포트 3000 리스닝 확인
sudo netstat -tlnp | grep :3000
# 또는
sudo ss -tlnp | grep :3000

# 프로세스 확인
ps aux | grep node
```

### 환경 변수 확인

```bash
# .env 파일 확인
cat /home/ubuntu/chalog-backend/.env

# 환경 변수 로드 후 확인
cd /home/ubuntu/chalog-backend
export $(cat .env | xargs)
echo $DATABASE_URL
```

## 데이터베이스 작업

### MySQL 연결

```bash
# Root로 연결
docker exec -it chalog-mysql mysql -uroot -pchangeme_root_password

# 사용자로 연결
docker exec -it chalog-mysql mysql -uchalog_user -pchangeme_password chalog
```

### 데이터베이스 쿼리 실행

```bash
# 데이터베이스 목록
docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "SHOW DATABASES;"

# 테이블 목록
docker exec chalog-mysql mysql -uroot -pchangeme_root_password chalog -e "SHOW TABLES;"

# 테이블 구조 확인
docker exec chalog-mysql mysql -uroot -pchangeme_root_password chalog -e "DESCRIBE users;"

# 데이터 확인
docker exec chalog-mysql mysql -uroot -pchangeme_root_password chalog -e "SELECT COUNT(*) FROM users;"
```

### 마이그레이션 실행

```bash
cd /home/ubuntu/chalog-backend

# 환경 변수 로드
export $(cat .env | xargs)

# 마이그레이션 실행
npx typeorm-ts-node-commonjs migration:run -d dist/src/database/data-source.ts

# 마이그레이션 상태 확인
npx typeorm-ts-node-commonjs migration:show -d dist/src/database/data-source.ts
```

## Nginx 설정

### Nginx 설치 및 확인

```bash
# Nginx 설치 확인
nginx -v

# Nginx 설치 (없는 경우)
sudo apt-get update
sudo apt-get install -y nginx

# Nginx 상태 확인
sudo systemctl status nginx

# Nginx 설정 테스트
sudo nginx -t
```

### Nginx 로그 확인

```bash
# 액세스 로그
sudo tail -f /var/log/nginx/chalog-backend-access.log

# 에러 로그
sudo tail -f /var/log/nginx/chalog-backend-error.log

# 최근 50줄 에러 로그
sudo tail -50 /var/log/nginx/chalog-backend-error.log
```

### Nginx 재시작

```bash
# 설정 검증
sudo nginx -t

# 재시작 (다운타임 있음)
sudo systemctl restart nginx

# 리로드 (다운타임 없음)
sudo systemctl reload nginx
```

## 문제 해결 명령어

### 애플리케이션 재시작

```bash
# PM2 재시작
pm2 restart chalog-backend

# PM2 삭제 후 재시작
pm2 delete chalog-backend
cd /home/ubuntu/chalog-backend
pm2 start ecosystem.config.js
pm2 save
```

### 로그 확인

```bash
# PM2 로그
pm2 logs chalog-backend --lines 100

# Docker MySQL 로그
docker logs chalog-mysql --tail 50

# 시스템 로그
sudo journalctl -u nginx -n 50
```

### 디스크 공간 확인

```bash
# 디스크 사용량
df -h

# Docker 디스크 사용량
docker system df

# 큰 파일 찾기
du -sh /home/ubuntu/chalog-backend/*
```

### 메모리 확인

```bash
# 메모리 사용량
free -h

# 프로세스별 메모리 사용량
ps aux --sort=-%mem | head -10

# Docker 리소스 사용량
docker stats chalog-mysql --no-stream
```

## 유용한 스크립트

### 전체 상태 확인

```bash
cd /home/ubuntu/chalog-backend

# Docker MySQL 확인
./scripts/check-docker-mysql.sh

# 또는 직접 확인
docker ps | grep chalog-mysql
pm2 status
curl http://localhost:3000/health
```

### 백업 확인

```bash
# 백업 디렉토리 확인
ls -lh /home/ubuntu/backups/mysql/

# 최근 백업 확인
ls -lt /home/ubuntu/backups/mysql/ | head -5
```

## 참고 문서

- [배포 체크리스트](./DEPLOYMENT_CHECKLIST.md)
- [테스트 가이드](./TESTING_GUIDE.md)
- [모니터링 가이드](./MONITORING_GUIDE.md)
- [Nginx 설정 가이드](./NGINX_SETUP_GUIDE.md)
