#!/bin/bash

# 브라우저 SSH 연결을 통한 마이그레이션 실행 가이드
# Lightsail 콘솔의 "브라우저에서 연결" 기능 사용

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

LIGHTSAIL_IP="${1:-3.39.48.139}"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🌐 브라우저 SSH를 통한 마이그레이션 실행${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📋 단계별 실행 방법:${NC}"
echo ""
echo "1. AWS Lightsail 콘솔 접속"
echo "   https://lightsail.aws.amazon.com/"
echo ""
echo "2. 인스턴스 선택 (IP: $LIGHTSAIL_IP)"
echo ""
echo "3. '브라우저에서 연결' 또는 'Connect using SSH' 클릭"
echo ""
echo "4. 브라우저 터미널에서 다음 명령어들을 순서대로 실행:"
echo ""

cat << 'COMMANDS'
# ============================================
# 1단계: 마이그레이션 스크립트 다운로드
# ============================================
cd /tmp
cat > migrate-rds-to-docker-mysql.sh << 'SCRIPT_EOF'
#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

RDS_ENDPOINT="${RDS_ENDPOINT:-database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com}"
RDS_USER="${RDS_USER:-admin}"
RDS_PASSWORD="${RDS_PASSWORD:-az980831}"
RDS_DATABASE="${RDS_DATABASE:-chalog}"

DOCKER_CONTAINER="${DOCKER_CONTAINER:-chalog-mysql}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-changeme_root_password}"
MYSQL_USER="${MYSQL_USER:-chalog_user}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-changeme_password}"
MYSQL_DATABASE="${MYSQL_DATABASE:-chalog}"

BACKUP_FILE="/tmp/chalog_backup_$(date +%Y%m%d_%H%M%S).sql"

echo -e "${BLUE}🔄 RDS → Docker MySQL 데이터 마이그레이션${NC}"
echo "RDS 엔드포인트: $RDS_ENDPOINT"
echo "Docker 컨테이너: $DOCKER_CONTAINER"
echo ""

# Docker MySQL 컨테이너 확인
if ! docker ps | grep -q "$DOCKER_CONTAINER"; then
    echo -e "${RED}❌ Docker MySQL 컨테이너가 실행 중이 아닙니다!${NC}"
    exit 1
fi

# RDS 연결 테스트
if mysql -h "$RDS_ENDPOINT" -u "$RDS_USER" -p"$RDS_PASSWORD" -e "SELECT 1" "$RDS_DATABASE" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ RDS 연결 성공${NC}"
else
    echo -e "${RED}❌ RDS 연결 실패${NC}"
    exit 1
fi

# 덤프 생성
echo "덤프 생성 중..."
mysqldump -h "$RDS_ENDPOINT" \
    -u "$RDS_USER" \
    -p"$RDS_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --add-drop-database \
    --databases "$RDS_DATABASE" > "$BACKUP_FILE" 2>&1

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo -e "${GREEN}✅ 덤프 생성 완료: $BACKUP_FILE (크기: $BACKUP_SIZE)${NC}"

# 데이터베이스 재생성
docker exec -i "$DOCKER_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" << EOF
DROP DATABASE IF EXISTS $MYSQL_DATABASE;
CREATE DATABASE $MYSQL_DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

# 복원
echo "복원 중..."
docker exec -i "$DOCKER_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" < "$BACKUP_FILE" 2>&1
echo -e "${GREEN}✅ 데이터 복원 완료${NC}"

# 사용자 권한 설정
docker exec -i "$DOCKER_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" << EOF
GRANT ALL PRIVILEGES ON $MYSQL_DATABASE.* TO '$MYSQL_USER'@'%';
FLUSH PRIVILEGES;
EOF

echo -e "${GREEN}✅ 마이그레이션 완료!${NC}"
SCRIPT_EOF

chmod +x migrate-rds-to-docker-mysql.sh

# ============================================
# 2단계: 마이그레이션 실행
# ============================================
/tmp/migrate-rds-to-docker-mysql.sh

# ============================================
# 3단계: Nginx 설정 (선택사항)
# ============================================
sudo tee /etc/nginx/sites-available/chalog-backend > /dev/null << 'NGINX_EOF'
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
    }
    
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        access_log off;
    }
}
NGINX_EOF

sudo ln -sf /etc/nginx/sites-available/chalog-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo "✅ Nginx 설정 완료"
COMMANDS

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 가이드 준비 완료${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 팁:${NC}"
echo "위 명령어들을 브라우저 터미널에 복사하여 실행하세요."
echo "각 단계가 완료되면 다음 단계로 진행하세요."
