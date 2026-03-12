#!/bin/bash

# RDS에서 Docker MySQL로 데이터 마이그레이션 스크립트
# Lightsail 인스턴스에서 실행

set -e

# 비대화형 모드 지원 (환경 변수로 제어)
NON_INTERACTIVE="${NON_INTERACTIVE:-false}"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# RDS 설정 (계획 파일에서 가져옴)
RDS_ENDPOINT="${RDS_ENDPOINT:-database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com}"
RDS_USER="${RDS_USER:-admin}"
RDS_PASSWORD="${RDS_PASSWORD:?RDS_PASSWORD is required}"
RDS_DATABASE="${RDS_DATABASE:-chalog}"

# Docker MySQL 설정
DOCKER_CONTAINER="${DOCKER_CONTAINER:-chalog-mysql}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-changeme_root_password}"
MYSQL_USER="${MYSQL_USER:-chalog_user}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-changeme_password}"
MYSQL_DATABASE="${MYSQL_DATABASE:-chalog}"

BACKUP_FILE="/tmp/chalog_backup_$(date +%Y%m%d_%H%M%S).sql"

echo -e "${BLUE}🔄 RDS → Docker MySQL 데이터 마이그레이션${NC}"
echo ""
echo "RDS 엔드포인트: $RDS_ENDPOINT"
echo "Docker 컨테이너: $DOCKER_CONTAINER"
echo "백업 파일: $BACKUP_FILE"
echo ""

# 1. Docker MySQL 컨테이너 확인
echo -e "${BLUE}📋 1단계: Docker MySQL 컨테이너 확인${NC}"
if ! docker ps | grep -q "$DOCKER_CONTAINER"; then
    echo -e "${RED}❌ Docker MySQL 컨테이너가 실행 중이 아닙니다!${NC}"
    echo "다음 명령어로 컨테이너를 시작하세요:"
    echo "  cd /home/ubuntu/chalog-backend"
    echo "  docker-compose up -d mysql"
    exit 1
fi

echo -e "${GREEN}✅ Docker MySQL 컨테이너 실행 중${NC}"
docker ps | grep "$DOCKER_CONTAINER"

# 2. RDS 연결 테스트
echo ""
echo -e "${BLUE}📋 2단계: RDS 연결 테스트${NC}"
if mysql -h "$RDS_ENDPOINT" -u "$RDS_USER" -p"$RDS_PASSWORD" -e "SELECT 1" "$RDS_DATABASE" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ RDS 연결 성공${NC}"
else
    echo -e "${RED}❌ RDS 연결 실패${NC}"
    echo "RDS 보안 그룹에 현재 IP가 추가되어 있는지 확인하세요."
    exit 1
fi

# 3. RDS 데이터 덤프 생성
echo ""
echo -e "${BLUE}📋 3단계: RDS 데이터 덤프 생성${NC}"
echo "덤프 생성 중... (시간이 걸릴 수 있습니다)"
if mysqldump -h "$RDS_ENDPOINT" \
    -u "$RDS_USER" \
    -p"$RDS_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --add-drop-database \
    --databases "$RDS_DATABASE" > "$BACKUP_FILE" 2>&1; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ 덤프 생성 완료: $BACKUP_FILE (크기: $BACKUP_SIZE)${NC}"
else
    echo -e "${RED}❌ 덤프 생성 실패${NC}"
    exit 1
fi

# 4. 덤프 파일 검증
echo ""
echo -e "${BLUE}📋 4단계: 덤프 파일 검증${NC}"
if [ -s "$BACKUP_FILE" ]; then
    LINE_COUNT=$(wc -l < "$BACKUP_FILE")
    echo -e "${GREEN}✅ 덤프 파일 유효 (줄 수: $LINE_COUNT)${NC}"
else
    echo -e "${RED}❌ 덤프 파일이 비어있거나 손상되었습니다${NC}"
    exit 1
fi

# 5. Docker MySQL에 데이터 복원
echo ""
echo -e "${BLUE}📋 5단계: Docker MySQL에 데이터 복원${NC}"
echo "복원 중... (시간이 걸릴 수 있습니다)"

# 기존 데이터베이스가 있으면 삭제하고 재생성
docker exec -i "$DOCKER_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" << EOF
DROP DATABASE IF EXISTS $MYSQL_DATABASE;
CREATE DATABASE $MYSQL_DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

# 덤프 파일 복원
if docker exec -i "$DOCKER_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" < "$BACKUP_FILE" 2>&1; then
    echo -e "${GREEN}✅ 데이터 복원 완료${NC}"
else
    echo -e "${RED}❌ 데이터 복원 실패${NC}"
    exit 1
fi

# 6. 데이터 무결성 확인
echo ""
echo -e "${BLUE}📋 6단계: 데이터 무결성 확인${NC}"

# 테이블 개수 확인
TABLE_COUNT=$(docker exec "$DOCKER_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$MYSQL_DATABASE';" 2>/dev/null)
echo "테이블 개수: $TABLE_COUNT"

# 각 테이블의 레코드 수 확인
echo ""
echo "테이블별 레코드 수:"
docker exec "$DOCKER_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "
SELECT 
    table_name AS '테이블명',
    table_rows AS '레코드 수'
FROM information_schema.tables 
WHERE table_schema = '$MYSQL_DATABASE'
ORDER BY table_name;
" 2>/dev/null || echo "테이블 정보 조회 실패"

# 7. 사용자 권한 설정
echo ""
echo -e "${BLUE}📋 7단계: 사용자 권한 설정${NC}"
docker exec -i "$DOCKER_CONTAINER" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" << EOF
GRANT ALL PRIVILEGES ON $MYSQL_DATABASE.* TO '$MYSQL_USER'@'%';
FLUSH PRIVILEGES;
EOF

echo -e "${GREEN}✅ 사용자 권한 설정 완료${NC}"

# 8. 연결 테스트
echo ""
echo -e "${BLUE}📋 8단계: 연결 테스트${NC}"
if docker exec "$DOCKER_CONTAINER" mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 1" "$MYSQL_DATABASE" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker MySQL 연결 테스트 성공${NC}"
else
    echo -e "${YELLOW}⚠️  사용자 연결 테스트 실패 (root로는 정상 작동)${NC}"
fi

# 9. 백업 파일 정리 (선택사항)
echo ""
echo -e "${BLUE}📋 9단계: 백업 파일 정리${NC}"
if [[ "$NON_INTERACTIVE" == "true" ]]; then
    KEEP_BACKUP="y"
    echo -e "${GREEN}✅ 백업 파일 유지: $BACKUP_FILE (비대화형 모드)${NC}"
else
    read -p "백업 파일을 유지하시겠습니까? (y/n, 기본값: y): " KEEP_BACKUP
    KEEP_BACKUP=${KEEP_BACKUP:-y}
    if [[ "$KEEP_BACKUP" != "y" ]]; then
        rm -f "$BACKUP_FILE"
        echo -e "${GREEN}✅ 백업 파일 삭제 완료${NC}"
    else
        echo -e "${GREEN}✅ 백업 파일 유지: $BACKUP_FILE${NC}"
    fi
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 마이그레이션 완료!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "다음 단계:"
echo "1. .env 파일에서 DATABASE_URL을 localhost:3306으로 변경"
echo "   DATABASE_URL=mysql://$MYSQL_USER:$MYSQL_PASSWORD@localhost:3306/$MYSQL_DATABASE"
echo "2. 애플리케이션 연결 테스트"
echo "3. 모든 기능이 정상 작동하는지 확인 후 RDS 종료 고려"
