#!/bin/bash

# 브라우저 SSH 연결을 통한 마이그레이션 실행 가이드
# Lightsail 콘솔의 "브라우저에서 연결" 기능 사용
# Lightsail Docker MySQL에 테이블 생성 (migration:run)

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

LIGHTSAIL_IP="${1:-${LIGHTSAIL_IP}}"

if [ -z "$LIGHTSAIL_IP" ]; then
    echo -e "${RED}❌ Lightsail IP가 필요합니다.${NC}"
    echo "사용법: $0 <LIGHTSAIL_IP>"
    echo "또는 환경 변수: LIGHTSAIL_IP=<IP> $0"
    exit 1
fi

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
# 1단계: 백엔드 디렉터리로 이동
# ============================================
cd /home/ubuntu/chalog-backend

# ============================================
# 2단계: .env 확인
# ============================================
if [ ! -f ".env" ]; then
    echo "❌ .env 파일이 없습니다! DATABASE_URL을 설정하세요."
    echo "   DATABASE_URL=mysql://chalog_user:changeme_password@chalog-mysql:3306/chalog"
    exit 1
fi

# 환경 변수 로드
export $(cat .env | xargs)

# ============================================
# 3단계: Lightsail Docker MySQL 마이그레이션 실행
# ============================================
echo "🔄 마이그레이션 실행 중..."

if [ -f "dist/src/database/data-source.js" ]; then
    npx typeorm-ts-node-commonjs migration:run -d dist/src/database/data-source.js
elif [ -f "dist/src/database/data-source.ts" ]; then
    npx typeorm-ts-node-commonjs migration:run -d dist/src/database/data-source.ts
elif [ -f "src/database/data-source.ts" ]; then
    npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
else
    echo "❌ data-source 파일을 찾을 수 없습니다."
    exit 1
fi

echo "✅ 마이그레이션 완료!"

# ============================================
# 4단계: Nginx 설정 (선택사항)
# ============================================
# sudo tee /etc/nginx/sites-available/chalog-backend > /dev/null << 'NGINX_EOF'
# server {
#     listen 80;
#     server_name 3.39.48.139;
#     ...
# }
# NGINX_EOF
# sudo ln -sf /etc/nginx/sites-available/chalog-backend /etc/nginx/sites-enabled/
# sudo nginx -t && sudo systemctl restart nginx
COMMANDS

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 가이드 준비 완료${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 팁:${NC}"
echo "위 명령어들을 브라우저 터미널에 복사하여 실행하세요."
echo "Docker MySQL 컨테이너(chalog-mysql)가 실행 중인지 확인하세요: docker ps"
echo ""
