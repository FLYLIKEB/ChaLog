#!/bin/bash

# 최종 테스트 스크립트
# 배포 및 Nginx 설정 후 최종 확인

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
echo -e "${CYAN}🧪 최종 테스트${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "테스트 대상: $LIGHTSAIL_IP"
echo ""

# Health Check 테스트
echo -e "${BLUE}📋 1단계: Health Check 테스트${NC}"
echo ""

# 직접 접근 (포트 3000)
echo "1. 직접 접근 (포트 3000):"
HEALTH_DIRECT=$(curl -s --max-time 5 http://$LIGHTSAIL_IP:3000/health 2>/dev/null || echo "")
if [ -n "$HEALTH_DIRECT" ]; then
    if echo "$HEALTH_DIRECT" | grep -q "ok\|status"; then
        echo -e "   ${GREEN}✅ 성공${NC}"
        echo "   응답: $HEALTH_DIRECT"
    else
        echo -e "   ${YELLOW}⚠️  응답 이상${NC}"
        echo "   응답: $HEALTH_DIRECT"
    fi
else
    echo -e "   ${RED}❌ 실패 (연결 불가)${NC}"
fi

echo ""

# Nginx를 통한 접근 (포트 80)
echo "2. Nginx를 통한 접근 (포트 80):"
HEALTH_NGINX=$(curl -s --max-time 5 http://$LIGHTSAIL_IP/health 2>/dev/null || echo "")
if [ -n "$HEALTH_NGINX" ]; then
    if echo "$HEALTH_NGINX" | grep -q "ok\|status"; then
        echo -e "   ${GREEN}✅ 성공${NC}"
        echo "   응답: $HEALTH_NGINX"
    else
        echo -e "   ${YELLOW}⚠️  응답 이상${NC}"
        echo "   응답: $HEALTH_NGINX"
    fi
else
    echo -e "   ${YELLOW}⚠️  실패 (Nginx 설정 필요 또는 연결 불가)${NC}"
    echo "   Nginx 설정: ./scripts/setup-nginx.sh $LIGHTSAIL_IP"
    echo "   또는 브라우저 SSH에서 수동 설정: docs/deployment/NGINX_BROWSER_SSH_SETUP.md"
fi

echo ""

# 포트 확인
echo -e "${BLUE}📋 2단계: 포트 리스닝 확인${NC}"
echo ""

# 포트 3000 확인
PORT_3000=$(curl -s --max-time 2 http://$LIGHTSAIL_IP:3000/health > /dev/null 2>&1 && echo "열림" || echo "닫힘")
if [ "$PORT_3000" = "열림" ]; then
    echo -e "   ${GREEN}✅ 포트 3000 열림${NC}"
else
    echo -e "   ${RED}❌ 포트 3000 닫힘${NC}"
fi

# 포트 80 확인
PORT_80=$(curl -s --max-time 2 http://$LIGHTSAIL_IP/health > /dev/null 2>&1 && echo "열림" || echo "닫힘")
if [ "$PORT_80" = "열림" ]; then
    echo -e "   ${GREEN}✅ 포트 80 열림 (Nginx)${NC}"
else
    echo -e "   ${YELLOW}⚠️  포트 80 닫힘 (Nginx 미설정 또는 방화벽)${NC}"
fi

echo ""

# 응답 시간 테스트
echo -e "${BLUE}📋 3단계: 응답 시간 테스트${NC}"
echo ""

if command -v time &> /dev/null; then
    echo "Health Check 응답 시간:"
    time curl -s http://$LIGHTSAIL_IP:3000/health > /dev/null 2>&1 || echo "측정 실패"
else
    echo "time 명령어를 사용할 수 없습니다"
fi

echo ""

# 데이터베이스 연결 테스트 (브라우저 SSH에서 실행 필요)
echo -e "${BLUE}📋 4단계: 데이터베이스 연결 테스트${NC}"
echo ""
echo "브라우저 SSH에서 다음 명령어 실행:"
echo "  docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e 'SELECT 1'"
echo ""

# API 엔드포인트 테스트 (예시)
echo -e "${BLUE}📋 5단계: API 엔드포인트 테스트${NC}"
echo ""
echo "API 엔드포인트 테스트 (예시):"
echo "  curl http://$LIGHTSAIL_IP/api/..."
echo ""
echo "실제 API 엔드포인트로 테스트하세요."
echo ""

# 요약
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 최종 테스트 완료${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "테스트 결과 요약:"
echo "  - Health Check (포트 3000): $([ -n "$HEALTH_DIRECT" ] && echo "✅ 성공" || echo "❌ 실패")"
echo "  - Health Check (Nginx): $([ -n "$HEALTH_NGINX" ] && echo "✅ 성공" || echo "⚠️  Nginx 설정 필요")"
echo ""
echo "다음 단계:"
echo "  1. 브라우저 SSH에서 데이터베이스 연결 확인"
echo "  2. 실제 API 엔드포인트 테스트"
echo "  3. 모니터링 설정"
echo ""
