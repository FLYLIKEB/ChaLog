#!/bin/bash

# 로컬 DB에서 TypeORM 마이그레이션 실행
# 사용법: ./scripts/run-local-migrations.sh

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

# 백엔드 .env 로드
if [ -f "$BACKEND_DIR/.env" ]; then
    set -a
    source "$BACKEND_DIR/.env"
    set +a
fi

if [ -z "$LOCAL_DATABASE_URL" ] && [ -n "$DATABASE_URL" ]; then
    LOCAL_DATABASE_URL="${DATABASE_URL/_test/}"
    export LOCAL_DATABASE_URL
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  로컬 DB 마이그레이션 실행${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  백엔드: $BACKEND_DIR"
echo "  DB: ${LOCAL_DATABASE_URL:-$DATABASE_URL}"
echo ""

# .env 확인
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${RED}❌ .env 파일이 없습니다: $BACKEND_DIR/.env${NC}"
    exit 1
fi

# 마이그레이션 상태 확인
echo -e "${BLUE}[1/2] 현재 마이그레이션 상태 확인 중...${NC}"
cd "$BACKEND_DIR"
npm run migration:show
echo ""

# 마이그레이션 실행
echo -e "${BLUE}[2/2] 마이그레이션 실행 중...${NC}"
npm run migration:run
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 마이그레이션 완료${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
