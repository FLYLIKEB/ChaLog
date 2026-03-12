# Lightsail Docker MySQL 설정 가이드

Lightsail 인스턴스 내부에 Docker를 사용하여 MySQL을 설치하는 가이드입니다.

## 장단점 분석

### ✅ 장점

1. **비용 절감**
   - 관리형 DB 비용 제거 (월 $15-50+ 절감)
   - Lightsail 인스턴스만 유지하면 됨

2. **관리 단순화**
   - 하나의 인스턴스에서 모든 것 관리
   - 네트워크 설정 단순화 (보안 그룹 불필요)
   - 배포 및 백업 프로세스 단순화

3. **성능**
   - 같은 서버 내 통신으로 네트워크 지연 최소화
   - 로컬 연결로 빠른 응답 시간

4. **유연성**
   - Docker로 쉽게 버전 관리 및 업그레이드
   - 백업/복원이 더 단순

### ⚠️ 단점

1. **고가용성 부족**
   - 단일 인스턴스 (SPOF - Single Point of Failure)
   - 인스턴스 장애 시 전체 서비스 중단

2. **리소스 경쟁**
   - 애플리케이션과 DB가 같은 서버에서 실행
   - 현재 인스턴스: 1GB RAM, 2 CPU (작은 규모)

3. **자동 백업 부족**
   - 관리형 DB의 자동 백업 기능 없음
   - 수동 백업 스크립트 필요

4. **확장성 제한**
   - 수직 확장만 가능 (인스턴스 업그레이드)
   - 수평 확장 어려움

## 현재 인스턴스 사양

- **메모리**: 914MB (약 1GB)
- **디스크**: 39GB (37GB 여유)
- **CPU**: 2코어
- **추천**: 최소 2GB RAM 인스턴스 권장 (DB + 앱 동시 실행)

## 구현 단계

### 1. Docker 설치

```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Docker 그룹에 사용자 추가
sudo usermod -aG docker ubuntu

# 재로그인 필요
exit
```

### 2. MySQL Docker 컨테이너 설정

`/home/ubuntu/chalog-backend/docker-compose.yml` 생성:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: chalog-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-your_secure_root_password}
      MYSQL_DATABASE: chalog
      MYSQL_USER: chalog_user
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-your_secure_password}
    ports:
      - "127.0.0.1:3306:3306"  # localhost만 접근 가능
    volumes:
      - mysql_data:/var/lib/mysql
      - ./mysql-init:/docker-entrypoint-initdb.d  # 초기 스크립트
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mysql_data:
    driver: local
```

### 3. 환경 변수 설정

`/home/ubuntu/chalog-backend/.env` 수정:

```env
# Lightsail Docker MySQL 연결
DATABASE_URL=mysql://chalog_user:your_secure_password@localhost:3306/chalog
DB_SYNCHRONIZE=false
DB_SSL_ENABLED=false

# Docker MySQL 설정
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_PASSWORD=your_secure_password
```

### 4. MySQL 컨테이너 시작

```bash
cd /home/ubuntu/chalog-backend
docker-compose up -d mysql

# 상태 확인
docker-compose ps
docker-compose logs mysql
```

### 5. 데이터 마이그레이션 (TypeORM Migration)

RDS가 없는 경우, TypeORM Migration으로 테이블 생성:

```bash
cd /home/ubuntu/chalog-backend
export $(cat .env | xargs)
npx typeorm-ts-node-commonjs migration:run -d dist/src/database/data-source.js
```

#### 기존 데이터가 있는 경우: mysqldump 사용

```bash
# 원본 DB에서 덤프 생성 (로컬에서 실행)
mysqldump -h your-source-db-host \
  -u admin -p \
  --single-transaction \
  --routines \
  --triggers \
  chalog > chalog_backup.sql

# Lightsail로 전송
scp -i LightsailDefaultKey-ap-northeast-2.pem \
  chalog_backup.sql \
  ubuntu@YOUR_LIGHTSAIL_IP:/tmp/

# Lightsail에서 복원
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@YOUR_LIGHTSAIL_IP
docker exec -i chalog-mysql mysql -uroot -p${MYSQL_ROOT_PASSWORD} chalog < /tmp/chalog_backup.sql
```

#### 옵션 2: 애플리케이션 마이그레이션 실행

```bash
# Lightsail에서
cd /home/ubuntu/chalog-backend
npm run migration:run
```

### 6. 백업 스크립트 설정

`/home/ubuntu/chalog-backend/scripts/backup-mysql.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/chalog_$DATE.sql"

mkdir -p "$BACKUP_DIR"

docker exec chalog-mysql mysqldump -uroot -p${MYSQL_ROOT_PASSWORD} \
  --single-transaction \
  --routines \
  --triggers \
  chalog > "$BACKUP_FILE"

# 7일 이상 된 백업 삭제
find "$BACKUP_DIR" -name "chalog_*.sql" -mtime +7 -delete

echo "백업 완료: $BACKUP_FILE"
```

Crontab 설정 (매일 새벽 2시 백업):

```bash
crontab -e
# 추가:
0 2 * * * /home/ubuntu/chalog-backend/scripts/backup-mysql.sh >> /var/log/mysql-backup.log 2>&1
```

## 주의사항

1. **인스턴스 업그레이드 고려**
   - 현재 1GB RAM은 부족할 수 있음
   - 최소 2GB RAM 인스턴스 권장 ($10/월)

2. **보안**
   - MySQL 포트는 localhost만 접근 가능하도록 설정 (`127.0.0.1:3306`)
   - 강력한 비밀번호 사용
   - 정기적인 백업 필수

3. **모니터링**
   - 메모리 사용량 모니터링
   - 디스크 공간 확인
   - MySQL 로그 확인

4. **성능 튜닝**
   - MySQL 설정 최적화 (`my.cnf`)
   - 인덱스 최적화
   - 쿼리 성능 모니터링

## 비용 비교

### 이전 (관리형 DB 사용 시)
- Lightsail: $5/월
- 관리형 DB: $15-50/월
- **총: $20-55/월**

### Docker MySQL 사용
- Lightsail (2GB): $10/월
- **총: $10/월**

**월 $10-45 절감 가능**

## 마이그레이션 체크리스트

- [ ] Docker 및 Docker Compose 설치
- [ ] MySQL 컨테이너 설정 및 시작
- [ ] 환경 변수 업데이트
- [ ] 데이터 백업
- [ ] 데이터 마이그레이션
- [ ] 애플리케이션 연결 테스트
- [ ] 백업 스크립트 설정
- [ ] 모니터링 설정
