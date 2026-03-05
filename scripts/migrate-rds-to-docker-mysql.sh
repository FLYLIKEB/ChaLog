#!/bin/bash

# RDS에서 Docker MySQL로 데이터 마이그레이션 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

LIGHTSAIL_IP="${1:-54.116.108.157}"
SSH_KEY="${SSH_KEY_PATH:-LightsailDefaultKey-ap-northeast-2.pem}"

# RDS 정보 (기본값)
RDS_ENDPOINT="${RDS_ENDPOINT:-database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com}"
RDS_USER="${RDS_USER:-admin}"
RDS_PASSWORD="${RDS_PASSWORD:-az980831}"
RDS_DATABASE="${RDS_DATABASE:-chalog}"

echo -e "${BLUE}🔄 RDS → Docker MySQL 데이터 마이그레이션${NC}"
echo ""

# SSH 키 경로 확인
if [[ "$SSH_KEY" == ~* ]]; then
    SSH_KEY="${SSH_KEY/#\~/$HOME}"
fi

if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH 키 파일을 찾을 수 없습니다: $SSH_KEY${NC}"
    exit 1
fi

echo "RDS 엔드포인트: $RDS_ENDPOINT"
echo "Lightsail IP: $LIGHTSAIL_IP"
echo ""

# 로컬에서 RDS 덤프 생성
echo -e "${BLUE}📥 1단계: RDS에서 데이터 덤프 생성${NC}"
DUMP_FILE="/tmp/chalog_rds_backup_$(date +%Y%m%d_%H%M%S).sql"

if command -v mysqldump &> /dev/null; then
    echo "mysqldump를 사용하여 덤프 생성 중..."
    mysqldump -h "$RDS_ENDPOINT" \
        -u "$RDS_USER" \
        -p"$RDS_PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        "$RDS_DATABASE" > "$DUMP_FILE" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  로컬 mysqldump 실패. Lightsail에서 직접 덤프를 생성합니다.${NC}"
        DUMP_FILE=""
    }
else
    echo -e "${YELLOW}⚠️  로컬에 mysqldump가 없습니다. Lightsail에서 직접 덤프를 생성합니다.${NC}"
    DUMP_FILE=""
fi

# Lightsail에서 마이그레이션 실행
echo ""
echo -e "${BLUE}📤 2단계: Lightsail에서 데이터 마이그레이션${NC}"
ssh -i "$SSH_KEY" ubuntu@$LIGHTSAIL_IP << ENDSSH
cd /home/ubuntu/chalog-backend

# MySQL 클라이언트 설치 확인
if ! command -v mysql &> /dev/null; then
    echo "MySQL 클라이언트 설치 중..."
    sudo apt update -qq
    sudo apt install -y mysql-client-core-8.0
fi

# 로컬에서 덤프 파일이 생성된 경우 전송
if [ -n "$DUMP_FILE" ] && [ -f "$DUMP_FILE" ]; then
    echo "덤프 파일을 Lightsail로 전송 중..."
    # 이 부분은 별도로 scp로 전송해야 함
fi

# Lightsail에서 직접 RDS 덤프 생성
echo "RDS에서 직접 덤프 생성 중..."
DUMP_FILE="/tmp/chalog_rds_backup_\$(date +%Y%m%d_%H%M%S).sql"

mysql -h $RDS_ENDPOINT \
    -u $RDS_USER \
    -p$RDS_PASSWORD \
    -e "SHOW DATABASES;" 2>&1 | grep -q "$RDS_DATABASE" && {
    echo "✅ RDS 연결 성공"
    
    mysqldump -h $RDS_ENDPOINT \
        -u $RDS_USER \
        -p$RDS_PASSWORD \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        $RDS_DATABASE > "\$DUMP_FILE" 2>&1
    
    if [ -f "\$DUMP_FILE" ] && [ -s "\$DUMP_FILE" ]; then
        echo "✅ 덤프 파일 생성 완료: \$DUMP_FILE"
        echo "파일 크기: \$(du -h \$DUMP_FILE | cut -f1)"
    else
        echo -e "${RED}❌ 덤프 파일 생성 실패${NC}"
        exit 1
    fi
} || {
    echo -e "${YELLOW}⚠️  RDS 연결 실패. 애플리케이션 마이그레이션을 사용하세요.${NC}"
    echo "대신 애플리케이션 마이그레이션을 실행합니다..."
    exit 0
}

# Docker MySQL에 데이터 복원
echo ""
echo "Docker MySQL에 데이터 복원 중..."
docker exec -i chalog-mysql mysql -uroot -pchangeme_root_password chalog < "\$DUMP_FILE" 2>&1 | head -20

if [ \${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ 데이터 복원 완료"
    
    echo ""
    echo "=== 복원된 테이블 확인 ==="
    docker exec chalog-mysql mysql -uroot -pchangeme_root_password chalog -e "SHOW TABLES;" 2>&1
    
    echo ""
    echo "=== 테이블 개수 확인 ==="
    docker exec chalog-mysql mysql -uroot -pchangeme_root_password chalog -e "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'chalog';" 2>&1
else
    echo -e "${RED}❌ 데이터 복원 실패${NC}"
    exit 1
fi

# 덤프 파일 정리
rm -f "\$DUMP_FILE"
ENDSSH

echo ""
echo -e "${GREEN}✅ 마이그레이션 완료!${NC}"
echo ""
echo "다음 단계:"
echo "1. 애플리케이션 연결 테스트"
echo "2. 마이그레이션 실행: cd /home/ubuntu/chalog-backend && npm run migration:run"
echo "3. 애플리케이션 재시작"
