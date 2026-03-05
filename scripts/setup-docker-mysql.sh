#!/bin/bash

# Lightsail에 Docker MySQL 설정 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

LIGHTSAIL_IP="${1:-54.116.108.157}"
SSH_KEY="${SSH_KEY_PATH:-LightsailDefaultKey-ap-northeast-2.pem}"

echo -e "${BLUE}🐳 Lightsail Docker MySQL 설정${NC}"
echo "Lightsail IP: $LIGHTSAIL_IP"
echo ""

# SSH 키 경로 확인
if [[ "$SSH_KEY" == ~* ]]; then
    SSH_KEY="${SSH_KEY/#\~/$HOME}"
fi

if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH 키 파일을 찾을 수 없습니다: $SSH_KEY${NC}"
    exit 1
fi

echo -e "${BLUE}📋 1단계: Docker 설치 확인${NC}"
ssh -i "$SSH_KEY" ubuntu@$LIGHTSAIL_IP << 'ENDSSH'
if command -v docker &> /dev/null; then
    echo "✅ Docker 이미 설치됨: $(docker --version)"
else
    echo "📦 Docker 설치 중..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    echo "✅ Docker 설치 완료"
fi

if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose 이미 설치됨: $(docker-compose --version)"
else
    echo "📦 Docker Compose 설치 중..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose 설치 완료"
fi
ENDSSH

echo ""
echo -e "${BLUE}📋 2단계: Docker Compose 파일 생성${NC}"
ssh -i "$SSH_KEY" ubuntu@$LIGHTSAIL_IP << 'ENDSSH'
cd /home/ubuntu/chalog-backend || mkdir -p /home/ubuntu/chalog-backend && cd /home/ubuntu/chalog-backend

cat > docker-compose.yml << 'COMPOSE'
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: chalog-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-changeme_root_password}
      MYSQL_DATABASE: chalog
      MYSQL_USER: chalog_user
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-changeme_password}
    ports:
      - "127.0.0.1:3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mysql_data:
    driver: local
COMPOSE

echo "✅ docker-compose.yml 생성 완료"
ENDSSH

echo ""
echo -e "${BLUE}📋 3단계: MySQL 컨테이너 시작${NC}"
ssh -i "$SSH_KEY" ubuntu@$LIGHTSAIL_IP << 'ENDSSH'
cd /home/ubuntu/chalog-backend

# Docker 그룹 권한 적용 (재로그인 없이)
newgrp docker << 'DOCKER_GROUP'
docker-compose up -d mysql
sleep 5
docker-compose ps
DOCKER_GROUP

echo ""
echo "MySQL 로그 확인 중..."
docker logs chalog-mysql 2>&1 | tail -10
ENDSSH

echo ""
echo -e "${GREEN}✅ Docker MySQL 설정 완료!${NC}"
echo ""
echo "다음 단계:"
echo "1. .env 파일에서 DATABASE_URL을 localhost:3306으로 변경"
echo "2. RDS에서 데이터 마이그레이션"
echo "3. 애플리케이션 연결 테스트"
