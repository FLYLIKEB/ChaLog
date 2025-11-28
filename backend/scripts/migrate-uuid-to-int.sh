#!/bin/bash

# UUID에서 INT AUTO_INCREMENT로 마이그레이션하는 스크립트
# 사용법: ./scripts/migrate-uuid-to-int.sh

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  경고: 이 스크립트는 데이터베이스의 ID 타입을 UUID에서 INT로 변경합니다.${NC}"
echo -e "${YELLOW}⚠️  실행 전 반드시 데이터베이스 백업을 수행하세요!${NC}"
echo ""
read -p "계속하시겠습니까? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "마이그레이션이 취소되었습니다."
    exit 0
fi

# 스크립트 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Node.js 스크립트 실행
if command -v node &> /dev/null; then
    echo -e "${GREEN}🔄 Node.js 마이그레이션 스크립트 실행 중...${NC}"
    node scripts/migrate-uuid-to-int.js
    echo -e "${GREEN}✅ 마이그레이션이 완료되었습니다.${NC}"
else
    echo -e "${RED}❌ Node.js가 설치되어 있지 않습니다.${NC}"
    echo -e "${YELLOW}SQL 파일을 직접 실행하세요:${NC}"
    echo "  mysql -h HOST -P PORT -u USER -p DATABASE < scripts/migrate-uuid-to-int.sql"
    exit 1
fi

