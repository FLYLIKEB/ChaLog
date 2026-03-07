#!/bin/bash

# 원격 서버 로그 확인 스크립트
# 사용법: ./scripts/remote-logs.sh [backend|error|mysql|status]
# 기본값: backend (실시간 스트리밍)

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# .ec2-config 로드
if [ -f "$PROJECT_ROOT/.ec2-config" ]; then
    source "$PROJECT_ROOT/.ec2-config"
else
    echo "❌ .ec2-config 파일을 찾을 수 없습니다."
    exit 1
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MODE="${1:-backend}"

SSH_CMD="ssh -i \"$SSH_KEY_PATH\" -o StrictHostKeyChecking=no ubuntu@$EC2_HOST"

echo -e "${BLUE}📡 원격 서버: $EC2_HOST${NC}"
echo ""

case "$MODE" in
    backend)
        echo -e "${GREEN}▶ 백엔드 로그 실시간 (Ctrl+C로 종료)${NC}"
        echo ""
        eval "$SSH_CMD" 'pm2 logs chalog-backend'
        ;;
    error)
        echo -e "${YELLOW}▶ 백엔드 에러 로그 최근 100줄${NC}"
        echo ""
        eval "$SSH_CMD" 'pm2 logs chalog-backend --err --lines 100 --nostream'
        ;;
    mysql)
        echo -e "${GREEN}▶ MySQL 로그 실시간 (Ctrl+C로 종료)${NC}"
        echo ""
        eval "$SSH_CMD" 'docker logs -f chalog-mysql --tail 100'
        ;;
    status)
        echo -e "${BLUE}▶ 서버 전체 상태${NC}"
        echo ""
        eval "$SSH_CMD" 'pm2 status && echo "" && docker ps'
        ;;
    *)
        echo "사용법: $0 [backend|error|mysql|status]"
        echo "  backend  백엔드 로그 실시간 스트리밍 (기본값)"
        echo "  error    백엔드 에러 로그 최근 100줄"
        echo "  mysql    MySQL Docker 로그 실시간"
        echo "  status   pm2 + docker 상태 확인"
        exit 1
        ;;
esac
