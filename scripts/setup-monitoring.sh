#!/bin/bash

# 모니터링 설정 스크립트
# 브라우저 SSH에서 실행하거나 로컬 SSH가 가능한 경우 실행

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📊 모니터링 설정 및 확인${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 시스템 리소스 확인
echo -e "${BLUE}📋 1단계: 시스템 리소스 확인${NC}"
echo ""

# 메모리 사용량
echo "메모리 사용량:"
free -h
echo ""

# 디스크 사용량
echo "디스크 사용량:"
df -h
echo ""

# CPU 사용량
echo "CPU 사용량:"
if command -v top &> /dev/null; then
    echo "CPU 사용률: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')%"
else
    echo "top 명령어를 사용할 수 없습니다"
fi
echo ""

# PM2 모니터링
echo -e "${BLUE}📋 2단계: PM2 상태 확인${NC}"
echo ""

if command -v pm2 &> /dev/null; then
    echo "PM2 상태:"
    pm2 status
    echo ""
    
    echo "PM2 프로세스 상세 정보:"
    pm2 describe chalog-backend 2>/dev/null | head -30 || echo "chalog-backend 프로세스를 찾을 수 없습니다"
    echo ""
    
    echo "PM2 재시작 횟수 확인:"
    RESTART_COUNT=$(pm2 jlist | grep -o '"restart_time":[0-9]*' | grep -o '[0-9]*' || echo "0")
    if [ "$RESTART_COUNT" -gt 10 ]; then
        echo -e "   ${YELLOW}⚠️  재시작 횟수가 많습니다: $RESTART_COUNT${NC}"
        echo "   로그 확인 필요: pm2 logs chalog-backend --lines 100"
    else
        echo -e "   ${GREEN}✅ 재시작 횟수 정상: $RESTART_COUNT${NC}"
    fi
else
    echo -e "${RED}❌ PM2가 설치되지 않았습니다${NC}"
fi

echo ""

# Docker MySQL 모니터링
echo -e "${BLUE}📋 3단계: Docker MySQL 모니터링${NC}"
echo ""

if docker ps | grep -q chalog-mysql; then
    echo "Docker MySQL 컨테이너 리소스 사용량:"
    docker stats --no-stream chalog-mysql 2>/dev/null || echo "리소스 정보를 가져올 수 없습니다"
    echo ""
    
    echo "MySQL 연결 수:"
    docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "SHOW STATUS LIKE 'Threads_connected';" 2>/dev/null | tail -1 || echo "연결 정보를 가져올 수 없습니다"
    echo ""
    
    echo "MySQL 쿼리 통계:"
    docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "SHOW STATUS LIKE 'Queries';" 2>/dev/null | tail -1 || echo "쿼리 정보를 가져올 수 없습니다"
else
    echo -e "${RED}❌ Docker MySQL 컨테이너를 찾을 수 없습니다${NC}"
fi

echo ""

# Nginx 모니터링
echo -e "${BLUE}📋 4단계: Nginx 모니터링${NC}"
echo ""

if command -v nginx &> /dev/null; then
    echo "Nginx 상태:"
    sudo systemctl status nginx --no-pager -l 2>/dev/null | head -10 || echo "Nginx 상태를 확인할 수 없습니다"
    echo ""
    
    echo "Nginx 최근 에러 로그 (최근 10줄):"
    sudo tail -10 /var/log/nginx/chalog-backend-error.log 2>/dev/null || echo "에러 로그를 찾을 수 없습니다"
else
    echo -e "${YELLOW}⚠️  Nginx가 설치되지 않았습니다${NC}"
fi

echo ""

# 애플리케이션 로그 확인
echo -e "${BLUE}📋 5단계: 애플리케이션 로그 확인${NC}"
echo ""

if command -v pm2 &> /dev/null; then
    echo "PM2 최근 로그 (최근 20줄):"
    pm2 logs chalog-backend --lines 20 --nostream 2>/dev/null || echo "로그를 가져올 수 없습니다"
else
    echo "PM2가 설치되지 않았습니다"
fi

echo ""

# 포트 리스닝 확인
echo -e "${BLUE}📋 6단계: 포트 리스닝 확인${NC}"
echo ""

if command -v netstat &> /dev/null; then
    echo "포트 3000 (백엔드):"
    sudo netstat -tlnp 2>/dev/null | grep :3000 || echo "포트 3000 리스닝 안 됨"
    echo ""
    echo "포트 80 (Nginx):"
    sudo netstat -tlnp 2>/dev/null | grep :80 || echo "포트 80 리스닝 안 됨"
elif command -v ss &> /dev/null; then
    echo "포트 3000 (백엔드):"
    sudo ss -tlnp 2>/dev/null | grep :3000 || echo "포트 3000 리스닝 안 됨"
    echo ""
    echo "포트 80 (Nginx):"
    sudo ss -tlnp 2>/dev/null | grep :80 || echo "포트 80 리스닝 안 됨"
else
    echo "포트 확인 도구를 사용할 수 없습니다"
fi

echo ""

# 요약
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 모니터링 확인 완료${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "지속적인 모니터링:"
echo "  - PM2 모니터링: pm2 monit"
echo "  - 시스템 리소스: htop 또는 top"
echo "  - Docker 리소스: docker stats chalog-mysql"
echo "  - Nginx 로그: sudo tail -f /var/log/nginx/chalog-backend-error.log"
echo ""
echo "정기적으로 확인할 항목:"
echo "  - 메모리 사용량 (80% 미만 권장)"
echo "  - 디스크 사용량 (80% 미만 권장)"
echo "  - PM2 재시작 횟수 (10회 미만 권장)"
echo "  - 애플리케이션 로그 에러"
echo ""
