#!/bin/bash

# 로컬 개발 환경 전체 시작 스크립트
# SSH 터널, 백엔드, 프론트엔드를 한 번에 실행합니다.

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

# 필수 도구 확인
if ! command -v curl > /dev/null 2>&1; then
    echo -e "${RED}❌ curl이 설치되어 있지 않습니다.${NC}"
    echo "   macOS: curl은 기본 설치되어 있습니다."
    echo "   Linux: sudo apt-get install curl 또는 sudo yum install curl"
    exit 1
fi

echo -e "${BLUE}🚀 로컬 개발 환경 시작 중...${NC}"
echo ""

# 1. 기존 프로세스 종료
echo -e "${YELLOW}📋 기존 프로세스 확인 및 종료 중...${NC}"

# SSH 터널 종료
if [ -f "$BACKEND_DIR/scripts/stop-ssh-tunnel.sh" ]; then
    cd "$BACKEND_DIR"
    bash scripts/stop-ssh-tunnel.sh > /dev/null 2>&1 || true
fi

# 백엔드 프로세스 종료 (포트 3000 기반)
if command -v lsof > /dev/null 2>&1; then
    lsof -ti:3000 | xargs kill -9 > /dev/null 2>&1 || true
else
    # lsof가 없는 경우 프로젝트 디렉토리 기반으로 매칭
    pkill -f "cd.*$BACKEND_DIR.*nest start" > /dev/null 2>&1 || true
fi

# 프론트엔드 프로세스 종료 (포트 5173 기반)
if command -v lsof > /dev/null 2>&1; then
    lsof -ti:5173 | xargs kill -9 > /dev/null 2>&1 || true
else
    # lsof가 없는 경우 프로젝트 디렉토리 기반으로 매칭
    pkill -f "cd.*$PROJECT_ROOT.*vite" > /dev/null 2>&1 || true
fi

sleep 2
echo -e "${GREEN}✅ 기존 프로세스 정리 완료${NC}"
echo ""

# 2. SSH 터널 시작
echo -e "${BLUE}🔗 SSH 터널 시작 중...${NC}"
cd "$BACKEND_DIR"
if [ -f scripts/start-ssh-tunnel.sh ]; then
    bash scripts/start-ssh-tunnel.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ SSH 터널 시작 실패${NC}"
        exit 1
    fi
    echo ""
    sleep 2
else
    echo -e "${YELLOW}⚠️  SSH 터널 스크립트를 찾을 수 없습니다. 건너뜁니다.${NC}"
    echo ""
fi

# 3. 백엔드 서버 시작
echo -e "${BLUE}🔧 백엔드 서버 시작 중...${NC}"
cd "$BACKEND_DIR"
npm run start:dev > /tmp/chalog-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ 백엔드 서버 시작됨 (PID: $BACKEND_PID)${NC}"
echo "   로그: tail -f /tmp/chalog-backend.log"
echo ""

# 4. 백엔드 서버가 시작될 때까지 대기
echo -e "${YELLOW}⏳ 백엔드 서버 시작 대기 중...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 백엔드 서버 준비 완료 (포트 3000)${NC}"
        echo ""
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ 백엔드 서버 시작 시간 초과${NC}"
        echo "   로그 확인: tail -f /tmp/chalog-backend.log"
        exit 1
    fi
    sleep 1
done

# 5. 프론트엔드 서버 시작
echo -e "${BLUE}🎨 프론트엔드 서버 시작 중...${NC}"
cd "$PROJECT_ROOT"
npm run dev > /tmp/chalog-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ 프론트엔드 서버 시작됨 (PID: $FRONTEND_PID)${NC}"
echo "   로그: tail -f /tmp/chalog-frontend.log"
echo ""

# 6. 프론트엔드 서버가 시작될 때까지 대기
echo -e "${YELLOW}⏳ 프론트엔드 서버 시작 대기 중...${NC}"
sleep 3
for i in {1..20}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 프론트엔드 서버 준비 완료 (포트 5173)${NC}"
        echo ""
        break
    fi
    if [ $i -eq 20 ]; then
        echo -e "${YELLOW}⚠️  프론트엔드 서버 시작 확인 실패 (계속 시도 중일 수 있습니다)${NC}"
        echo ""
    fi
    sleep 1
done

# 7. 최종 상태 출력
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 모든 서버가 실행되었습니다!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📍 접속 정보:${NC}"
echo -e "   프론트엔드: ${GREEN}http://localhost:5173${NC}"
echo -e "   백엔드 API: ${GREEN}http://localhost:3000${NC}"
echo -e "   Health Check: ${GREEN}http://localhost:3000/health${NC}"
echo ""
echo -e "${BLUE}📋 실행 중인 프로세스:${NC}"
echo -e "   백엔드 PID: ${YELLOW}$BACKEND_PID${NC}"
echo -e "   프론트엔드 PID: ${YELLOW}$FRONTEND_PID${NC}"
echo ""
echo -e "${BLUE}📝 로그 확인:${NC}"
echo -e "   백엔드: ${YELLOW}tail -f /tmp/chalog-backend.log${NC}"
echo -e "   프론트엔드: ${YELLOW}tail -f /tmp/chalog-frontend.log${NC}"
echo ""
echo -e "${BLUE}🛑 서버 종료:${NC}"
echo -e "   ${YELLOW}./scripts/stop-local.sh${NC} 또는"
echo -e "   ${YELLOW}pkill -f 'nest start' && pkill -f 'vite' && cd backend && ./scripts/stop-ssh-tunnel.sh${NC}"
echo ""

