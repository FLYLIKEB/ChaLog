#!/bin/bash

# 로컬 개발 환경 전체 종료 스크립트
# SSH 터널, 백엔드, 프론트엔드를 모두 종료합니다.

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 프로젝트 루트 디렉토리
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo -e "${BLUE}🛑 로컬 개발 환경 종료 중...${NC}"
echo ""

# 1. 프론트엔드 종료
echo -e "${YELLOW}🎨 프론트엔드 서버 종료 중...${NC}"
FRONTEND_PIDS=$(ps aux | grep -E "vite|node.*vite" | grep -v grep | awk '{print $2}' || true)
if [ -n "$FRONTEND_PIDS" ]; then
    echo "$FRONTEND_PIDS" | xargs kill > /dev/null 2>&1 || true
    echo -e "${GREEN}✅ 프론트엔드 서버 종료됨${NC}"
else
    echo -e "${YELLOW}ℹ️  실행 중인 프론트엔드 서버가 없습니다${NC}"
fi
echo ""

# 2. 백엔드 종료
echo -e "${YELLOW}🔧 백엔드 서버 종료 중...${NC}"
BACKEND_PIDS=$(ps aux | grep -E "nest start|node.*nest" | grep -v grep | awk '{print $2}' || true)
if [ -n "$BACKEND_PIDS" ]; then
    echo "$BACKEND_PIDS" | xargs kill > /dev/null 2>&1 || true
    echo -e "${GREEN}✅ 백엔드 서버 종료됨${NC}"
else
    echo -e "${YELLOW}ℹ️  실행 중인 백엔드 서버가 없습니다${NC}"
fi
echo ""

# 3. SSH 터널 종료
echo -e "${YELLOW}🔗 SSH 터널 종료 중...${NC}"
cd "$BACKEND_DIR"
if [ -f scripts/stop-ssh-tunnel.sh ]; then
    bash scripts/stop-ssh-tunnel.sh
else
    echo -e "${YELLOW}ℹ️  SSH 터널 스크립트를 찾을 수 없습니다${NC}"
fi
echo ""

# 4. 최종 확인
sleep 1
REMAINING=$(ps aux | grep -E "nest start|vite|ssh.*3307" | grep -v grep | wc -l | tr -d ' ')
if [ "$REMAINING" -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 모든 서버가 종료되었습니다${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    echo -e "${YELLOW}⚠️  일부 프로세스가 아직 실행 중일 수 있습니다${NC}"
    echo -e "${YELLOW}   남은 프로세스 확인: ps aux | grep -E 'nest|vite|ssh.*3307'${NC}"
fi
echo ""

