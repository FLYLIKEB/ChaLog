#!/bin/bash

# 배포 후 확인 스크립트
# 브라우저 SSH에서 실행하거나 로컬 SSH가 가능한 경우 실행

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

LIGHTSAIL_IP="${1:-${LIGHTSAIL_IP}}"
BACKEND_DIR="/home/ubuntu/chalog-backend"

if [ -z "$LIGHTSAIL_IP" ]; then
    echo -e "${RED}❌ Lightsail IP가 필요합니다.${NC}"
    echo "사용법: $0 <LIGHTSAIL_IP>"
    echo "또는 환경 변수: LIGHTSAIL_IP=<IP> $0"
    exit 1
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}✅ 배포 후 확인${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# PM2 상태 확인
echo -e "${BLUE}📋 1단계: PM2 상태 확인${NC}"
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 status 2>/dev/null | grep chalog-backend || echo "")
    if [ -n "$PM2_STATUS" ]; then
        echo -e "${GREEN}✅ PM2 프로세스 발견${NC}"
        pm2 status | grep chalog-backend
        echo ""
        
        # PM2 상세 정보
        echo "PM2 상세 정보:"
        pm2 describe chalog-backend 2>/dev/null | head -20 || echo "상세 정보를 가져올 수 없습니다"
    else
        echo -e "${RED}❌ PM2 프로세스를 찾을 수 없습니다: chalog-backend${NC}"
        echo ""
        echo "PM2 전체 상태:"
        pm2 status
        exit 1
    fi
else
    echo -e "${RED}❌ PM2가 설치되지 않았습니다${NC}"
    exit 1
fi

echo ""

# 애플리케이션 로그 확인
echo -e "${BLUE}📋 2단계: 애플리케이션 로그 확인${NC}"
echo "최근 20줄 로그:"
pm2 logs chalog-backend --lines 20 --nostream 2>/dev/null || echo "로그를 가져올 수 없습니다"

echo ""

# 포트 리스닝 확인
echo -e "${BLUE}📋 3단계: 포트 리스닝 확인${NC}"
if command -v netstat &> /dev/null; then
    PORT_CHECK=$(sudo netstat -tlnp 2>/dev/null | grep :3000 || echo "")
elif command -v ss &> /dev/null; then
    PORT_CHECK=$(sudo ss -tlnp 2>/dev/null | grep :3000 || echo "")
else
    PORT_CHECK=""
fi

if [ -n "$PORT_CHECK" ]; then
    echo -e "${GREEN}✅ 포트 3000 리스닝 중${NC}"
    echo "$PORT_CHECK"
else
    echo -e "${YELLOW}⚠️  포트 3000 리스닝 확인 실패${NC}"
fi

echo ""

# Health Check (내부에서)
echo -e "${BLUE}📋 4단계: Health Check (내부)${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health 2>/dev/null || echo "")
if [ -n "$HEALTH_RESPONSE" ]; then
    if echo "$HEALTH_RESPONSE" | grep -q "ok\|status"; then
        echo -e "${GREEN}✅ Health Check 성공${NC}"
        echo "응답: $HEALTH_RESPONSE"
    else
        echo -e "${YELLOW}⚠️  Health Check 응답 이상${NC}"
        echo "응답: $HEALTH_RESPONSE"
    fi
else
    echo -e "${RED}❌ Health Check 실패 (연결 불가)${NC}"
fi

echo ""

# 환경 변수 확인
echo -e "${BLUE}📋 5단계: 환경 변수 확인${NC}"
if [ -f "$BACKEND_DIR/.env" ]; then
    echo -e "${GREEN}✅ .env 파일 존재${NC}"
    echo ""
    echo ".env 파일 내용 (민감 정보 제외):"
    grep -E "^(DATABASE_URL|DB_|JWT_|PORT|NODE_ENV|FRONTEND_)" "$BACKEND_DIR/.env" | sed 's/=.*/=***/' || echo "환경 변수를 찾을 수 없습니다"
else
    echo -e "${RED}❌ .env 파일이 없습니다: $BACKEND_DIR/.env${NC}"
fi

echo ""

# 데이터베이스 연결 확인
echo -e "${BLUE}📋 6단계: 데이터베이스 연결 확인${NC}"
if docker ps | grep -q chalog-mysql; then
    if docker exec chalog-mysql mysqladmin ping -h localhost -uroot -pchangeme_root_password > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Docker MySQL 연결 성공${NC}"
    else
        echo -e "${RED}❌ Docker MySQL 연결 실패${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Docker MySQL 컨테이너를 찾을 수 없습니다${NC}"
fi

echo ""

# 디렉토리 및 파일 확인
echo -e "${BLUE}📋 7단계: 배포 파일 확인${NC}"
if [ -d "$BACKEND_DIR" ]; then
    echo -e "${GREEN}✅ 배포 디렉토리 존재: $BACKEND_DIR${NC}"
    echo ""
    echo "주요 파일 확인:"
    [ -d "$BACKEND_DIR/dist" ] && echo "  ✅ dist 디렉토리 존재" || echo "  ❌ dist 디렉토리 없음"
    [ -f "$BACKEND_DIR/package.json" ] && echo "  ✅ package.json 존재" || echo "  ❌ package.json 없음"
    [ -f "$BACKEND_DIR/ecosystem.config.js" ] && echo "  ✅ ecosystem.config.js 존재" || echo "  ❌ ecosystem.config.js 없음"
    [ -d "$BACKEND_DIR/node_modules" ] && echo "  ✅ node_modules 존재" || echo "  ❌ node_modules 없음"
else
    echo -e "${RED}❌ 배포 디렉토리가 없습니다: $BACKEND_DIR${NC}"
fi

echo ""

# 외부 Health Check (선택사항)
echo -e "${BLUE}📋 8단계: 외부 Health Check (선택사항)${NC}"
echo "외부에서 확인:"
echo "  curl http://$LIGHTSAIL_IP:3000/health"
echo ""
EXTERNAL_HEALTH=$(curl -s --max-time 5 http://$LIGHTSAIL_IP:3000/health 2>/dev/null || echo "")
if [ -n "$EXTERNAL_HEALTH" ]; then
    echo -e "${GREEN}✅ 외부 Health Check 성공${NC}"
    echo "응답: $EXTERNAL_HEALTH"
else
    echo -e "${YELLOW}⚠️  외부 Health Check 실패 (방화벽 또는 네트워크 문제일 수 있음)${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 배포 확인 완료${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "다음 단계:"
echo "  1. Nginx 설정: ./scripts/setup-nginx.sh $LIGHTSAIL_IP"
echo "  2. 최종 테스트: curl http://$LIGHTSAIL_IP/health"
echo "  3. 모니터링 설정"
echo ""
