#!/bin/bash

# Docker MySQL 컨테이너 상태 확인 스크립트
# Lightsail 브라우저 SSH에서 실행하거나 로컬 SSH가 가능한 경우 실행

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

CONTAINER_NAME="chalog-mysql"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-changeme_root_password}"
MYSQL_USER="${MYSQL_USER:-chalog_user}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-changeme_password}"
MYSQL_DATABASE="${MYSQL_DATABASE:-chalog}"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🐳 Docker MySQL 컨테이너 상태 확인${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Docker 설치 확인
echo -e "${BLUE}📋 1단계: Docker 설치 확인${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker 설치됨: $(docker --version)${NC}"
else
    echo -e "${RED}❌ Docker가 설치되지 않았습니다${NC}"
    echo "설치 방법:"
    echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "  sudo sh get-docker.sh"
    exit 1
fi

# Docker 서비스 확인
if systemctl is-active --quiet docker 2>/dev/null || service docker status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker 서비스 실행 중${NC}"
else
    echo -e "${YELLOW}⚠️  Docker 서비스가 실행되지 않았습니다${NC}"
    echo "시작 방법:"
    echo "  sudo systemctl start docker"
    echo "  sudo systemctl enable docker"
fi

echo ""

# 컨테이너 상태 확인
echo -e "${BLUE}📋 2단계: MySQL 컨테이너 상태 확인${NC}"
if docker ps -a | grep -q "$CONTAINER_NAME"; then
    CONTAINER_STATUS=$(docker ps -a | grep "$CONTAINER_NAME" | awk '{print $7}')
    
    if docker ps | grep -q "$CONTAINER_NAME"; then
        echo -e "${GREEN}✅ 컨테이너 실행 중: $CONTAINER_NAME${NC}"
        docker ps | grep "$CONTAINER_NAME"
    else
        echo -e "${YELLOW}⚠️  컨테이너가 중지되어 있습니다${NC}"
        docker ps -a | grep "$CONTAINER_NAME"
        echo ""
        echo "시작 방법:"
        echo "  cd /home/ubuntu/chalog-backend"
        echo "  docker-compose up -d mysql"
        echo ""
        echo "또는 직접 시작:"
        echo "  docker start $CONTAINER_NAME"
        exit 1
    fi
else
    echo -e "${RED}❌ 컨테이너를 찾을 수 없습니다: $CONTAINER_NAME${NC}"
    echo ""
    echo "생성 방법:"
    echo "  cd /home/ubuntu/chalog-backend"
    echo "  docker-compose up -d mysql"
    exit 1
fi

echo ""

# 컨테이너 헬스 체크
echo -e "${BLUE}📋 3단계: 컨테이너 헬스 체크${NC}"
HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "no-healthcheck")
if [ "$HEALTH_STATUS" != "no-healthcheck" ]; then
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo -e "${GREEN}✅ 컨테이너 헬스 상태: $HEALTH_STATUS${NC}"
    else
        echo -e "${YELLOW}⚠️  컨테이너 헬스 상태: $HEALTH_STATUS${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  헬스 체크 설정 없음 (정상)${NC}"
fi

echo ""

# MySQL 연결 테스트
echo -e "${BLUE}📋 4단계: MySQL 연결 테스트${NC}"
if docker exec "$CONTAINER_NAME" mysqladmin ping -h localhost -uroot -p"$MYSQL_ROOT_PASSWORD" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MySQL 연결 성공${NC}"
else
    echo -e "${RED}❌ MySQL 연결 실패${NC}"
    echo "컨테이너 로그 확인:"
    echo "  docker logs $CONTAINER_NAME --tail 50"
    exit 1
fi

echo ""

# 데이터베이스 확인
echo -e "${BLUE}📋 5단계: 데이터베이스 확인${NC}"
DB_EXISTS=$(docker exec "$CONTAINER_NAME" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW DATABASES LIKE '$MYSQL_DATABASE';" 2>/dev/null | grep -c "$MYSQL_DATABASE" || echo "0")

if [ "$DB_EXISTS" -gt 0 ]; then
    echo -e "${GREEN}✅ 데이터베이스 존재: $MYSQL_DATABASE${NC}"
    
    # 테이블 개수 확인
    TABLE_COUNT=$(docker exec "$CONTAINER_NAME" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$MYSQL_DATABASE';" 2>/dev/null || echo "0")
    echo "   테이블 개수: $TABLE_COUNT"
else
    echo -e "${YELLOW}⚠️  데이터베이스가 없습니다: $MYSQL_DATABASE${NC}"
    echo "생성 방법:"
    echo "  docker exec -i $CONTAINER_NAME mysql -uroot -p$MYSQL_ROOT_PASSWORD -e \"CREATE DATABASE IF NOT EXISTS $MYSQL_DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""
fi

echo ""

# 사용자 권한 확인
echo -e "${BLUE}📋 6단계: 사용자 권한 확인${NC}"
USER_EXISTS=$(docker exec "$CONTAINER_NAME" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT User FROM mysql.user WHERE User='$MYSQL_USER';" 2>/dev/null | grep -c "$MYSQL_USER" || echo "0")

if [ "$USER_EXISTS" -gt 0 ]; then
    echo -e "${GREEN}✅ 사용자 존재: $MYSQL_USER${NC}"
    
    # 사용자 연결 테스트
    if docker exec "$CONTAINER_NAME" mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 1" "$MYSQL_DATABASE" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 사용자 연결 테스트 성공${NC}"
    else
        echo -e "${YELLOW}⚠️  사용자 연결 테스트 실패 (root로는 정상 작동)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  사용자가 없습니다: $MYSQL_USER${NC}"
    echo "생성 방법:"
    echo "  docker exec -i $CONTAINER_NAME mysql -uroot -p$MYSQL_ROOT_PASSWORD << EOF"
    echo "  CREATE USER IF NOT EXISTS '$MYSQL_USER'@'%' IDENTIFIED BY '$MYSQL_PASSWORD';"
    echo "  GRANT ALL PRIVILEGES ON $MYSQL_DATABASE.* TO '$MYSQL_USER'@'%';"
    echo "  FLUSH PRIVILEGES;"
    echo "  EOF"
fi

echo ""

# 포트 확인
echo -e "${BLUE}📋 7단계: 포트 확인${NC}"
PORT_CHECK=$(docker port "$CONTAINER_NAME" 2>/dev/null | grep "3306" || echo "")
if [ -n "$PORT_CHECK" ]; then
    echo -e "${GREEN}✅ 포트 매핑 확인됨${NC}"
    echo "  $PORT_CHECK"
else
    echo -e "${YELLOW}⚠️  포트 매핑 확인 실패${NC}"
fi

echo ""

# 리소스 사용량 확인
echo -e "${BLUE}📋 8단계: 리소스 사용량 확인${NC}"
docker stats --no-stream "$CONTAINER_NAME" 2>/dev/null | tail -1 || echo "리소스 정보를 가져올 수 없습니다"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Docker MySQL 컨테이너 확인 완료${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "다음 단계:"
echo "  1. GitHub Actions 배포 실행"
echo "  2. 배포 후 Health check 확인"
echo "  3. Nginx 설정"
echo ""
