# 모니터링 가이드

Lightsail Docker MySQL 배포 후 시스템 모니터링 가이드입니다.

## 시스템 리소스 모니터링

### 1. 메모리 사용량

```bash
# 현재 메모리 사용량
free -h

# 실시간 모니터링
watch -n 1 free -h
```

**주의사항**: 
- 현재 인스턴스: 1GB RAM
- Docker MySQL + 애플리케이션 동시 실행 시 부족할 수 있음
- 권장: 2GB RAM 인스턴스로 업그레이드 고려

### 2. CPU 사용량

```bash
# 현재 CPU 사용량
top

# 또는
htop

# 간단한 확인
uptime
```

### 3. 디스크 사용량

```bash
# 전체 디스크 사용량
df -h

# 특정 디렉토리 사용량
du -sh /home/ubuntu/chalog-backend
du -sh /var/lib/docker
```

### 4. 네트워크 사용량

```bash
# 네트워크 인터페이스 통계
ifconfig

# 또는
ip -s link
```

## PM2 모니터링

### 1. 프로세스 상태

```bash
# 상태 확인
pm2 status

# 상세 정보
pm2 describe chalog-backend

# 실시간 모니터링
pm2 monit
```

### 2. 로그 모니터링

```bash
# 실시간 로그
pm2 logs chalog-backend

# 최근 100줄
pm2 logs chalog-backend --lines 100

# 에러만 확인
pm2 logs chalog-backend --err

# 특정 시간 이후 로그
pm2 logs chalog-backend --since "2026-03-05 12:00:00"
```

### 3. 성능 메트릭

```bash
# CPU 및 메모리 사용량
pm2 describe chalog-backend | grep -E "cpu|memory"

# 또는 실시간 모니터링
pm2 monit
```

### 4. 재시작 횟수 확인

```bash
pm2 status

# 재시작 횟수가 많으면 문제가 있을 수 있음
# 예: restart: 10 이상이면 로그 확인 필요
```

## Docker MySQL 모니터링

### 1. 컨테이너 상태

```bash
# 실행 중인 컨테이너 확인
docker ps | grep chalog-mysql

# 컨테이너 리소스 사용량
docker stats chalog-mysql
```

### 2. MySQL 로그

```bash
# 최근 로그
docker logs chalog-mysql --tail 50

# 실시간 로그
docker logs -f chalog-mysql

# 특정 시간 이후 로그
docker logs chalog-mysql --since "2026-03-05T12:00:00"
```

### 3. MySQL 성능 확인

```bash
# 프로세스 목록
docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "SHOW PROCESSLIST;"

# 연결 수 확인
docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "SHOW STATUS LIKE 'Threads_connected';"

# 쿼리 통계
docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "SHOW STATUS LIKE 'Queries';"
```

### 4. 데이터베이스 크기 확인

```bash
# 데이터베이스 크기
docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'chalog'
GROUP BY table_schema;"

# 테이블별 크기
docker exec chalog-mysql mysql -uroot -pchangeme_root_password chalog -e "
SELECT 
    table_name AS 'Table',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'chalog'
ORDER BY (data_length + index_length) DESC;"
```

## Nginx 모니터링

### 1. 액세스 로그 분석

```bash
# 최근 요청
sudo tail -f /var/log/nginx/chalog-backend-access.log

# 특정 IP의 요청
sudo grep "192.168.1.1" /var/log/nginx/chalog-backend-access.log

# 에러 상태 코드 (4xx, 5xx)
sudo grep -E " (4|5)[0-9]{2} " /var/log/nginx/chalog-backend-access.log
```

### 2. 에러 로그 확인

```bash
# 최근 에러
sudo tail -f /var/log/nginx/chalog-backend-error.log

# 특정 에러 검색
sudo grep -i "error\|warn" /var/log/nginx/chalog-backend-error.log
```

### 3. 요청 통계

```bash
# 시간대별 요청 수
sudo awk '{print $4}' /var/log/nginx/chalog-backend-access.log | cut -d: -f1 | uniq -c

# 가장 많이 요청된 엔드포인트
sudo awk '{print $7}' /var/log/nginx/chalog-backend-access.log | sort | uniq -c | sort -rn | head -10
```

## 자동 모니터링 스크립트

### 시스템 리소스 체크 스크립트

`scripts/check-system-resources.sh` 생성:

```bash
#!/bin/bash

echo "=== 시스템 리소스 확인 ==="
echo ""
echo "메모리 사용량:"
free -h
echo ""
echo "디스크 사용량:"
df -h
echo ""
echo "CPU 사용량:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "CPU 사용률: " 100 - $1 "%"}'
echo ""
echo "PM2 상태:"
pm2 status
echo ""
echo "Docker 컨테이너:"
docker ps
echo ""
echo "MySQL 연결 수:"
docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "SHOW STATUS LIKE 'Threads_connected';" 2>/dev/null | tail -1
```

실행:

```bash
chmod +x scripts/check-system-resources.sh
./scripts/check-system-resources.sh
```

## 알림 설정

### 1. 메모리 부족 알림

Crontab에 추가:

```bash
crontab -e

# 매시간 메모리 사용량 확인 (80% 이상이면 알림)
0 * * * * /home/ubuntu/chalog-backend/scripts/check-memory.sh
```

`scripts/check-memory.sh`:

```bash
#!/bin/bash
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ $MEMORY_USAGE -gt 80 ]; then
    echo "경고: 메모리 사용량이 ${MEMORY_USAGE}%입니다." | mail -s "메모리 부족 경고" your-email@example.com
fi
```

### 2. 디스크 공간 알림

```bash
#!/bin/bash
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "경고: 디스크 사용량이 ${DISK_USAGE}%입니다." | mail -s "디스크 부족 경고" your-email@example.com
fi
```

## 성능 최적화

### 1. 메모리 최적화

**PM2 메모리 제한** (`backend/ecosystem.config.js`):

```javascript
max_memory_restart: '600M', // 현재 설정
```

**MySQL 메모리 설정** (필요시):

```bash
# Docker MySQL 컨테이너에 메모리 제한 추가
# docker-compose.yml 수정
```

### 2. 디스크 공간 정리

```bash
# Docker 이미지 정리
docker system prune -a

# 오래된 로그 파일 삭제
sudo find /var/log -name "*.log" -mtime +30 -delete

# PM2 로그 정리
pm2 flush
```

### 3. MySQL 최적화

```bash
# 테이블 최적화
docker exec chalog-mysql mysql -uroot -pchangeme_root_password chalog -e "OPTIMIZE TABLE your_table_name;"

# 인덱스 확인
docker exec chalog-mysql mysql -uroot -pchangeme_root_password chalog -e "SHOW INDEX FROM your_table_name;"
```

## 모니터링 체크리스트

정기적으로 확인할 항목:

- [ ] 메모리 사용량 (80% 미만 권장)
- [ ] 디스크 사용량 (80% 미만 권장)
- [ ] CPU 사용량 (정상 범위)
- [ ] PM2 프로세스 상태 (online)
- [ ] PM2 재시작 횟수 (10회 미만)
- [ ] Docker MySQL 컨테이너 상태 (Up)
- [ ] MySQL 연결 수 (정상 범위)
- [ ] Nginx 에러 로그 (에러 없음)
- [ ] 애플리케이션 로그 (에러 없음)

## 참고 문서

- [테스트 가이드](./TESTING_GUIDE.md)
- [배포 실행 가이드](./DEPLOYMENT_EXECUTION_GUIDE.md)
- [Lightsail Docker MySQL 가이드](./LIGHTSAIL_DOCKER_MYSQL.md)
