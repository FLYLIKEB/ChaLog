#!/bin/bash

# 원격 Lightsail 서버에서 TypeORM 마이그레이션 실행
# 사용법: ./scripts/run-remote-migrations.sh [LIGHTSAIL_IP] [SSH_KEY_PATH]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Lightsail IP
LIGHTSAIL_IP="${1:-${LIGHTSAIL_IP:-3.39.48.139}}"

# SSH 키 탐색
if [ -n "$2" ] && [ -f "$2" ]; then
    SSH_KEY="$2"
elif [ -n "$SSH_KEY_PATH" ] && [ -f "$SSH_KEY_PATH" ]; then
    SSH_KEY="$SSH_KEY_PATH"
elif [ -f "$PROJECT_ROOT/LightsailDefaultKey-ap-northeast-2.pem" ]; then
    SSH_KEY="$PROJECT_ROOT/LightsailDefaultKey-ap-northeast-2.pem"
elif [ -f "$HOME/.ssh/LightsailDefaultKey-ap-northeast-2.pem" ]; then
    SSH_KEY="$HOME/.ssh/LightsailDefaultKey-ap-northeast-2.pem"
elif [ -f "$HOME/LightsailDefaultKey-ap-northeast-2.pem" ]; then
    SSH_KEY="$HOME/LightsailDefaultKey-ap-northeast-2.pem"
else
    echo -e "${RED}❌ SSH 키 파일을 찾을 수 없습니다.${NC}"
    echo "다음 중 하나의 방법으로 키를 제공하세요:"
    echo "  1. 인자로 전달: $0 $LIGHTSAIL_IP <SSH_KEY_PATH>"
    echo "  2. 환경 변수: SSH_KEY_PATH=<경로> $0"
    echo "  3. 파일 위치: $HOME/.ssh/LightsailDefaultKey-ap-northeast-2.pem"
    exit 1
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  원격 DB 마이그레이션 실행${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  서버: $LIGHTSAIL_IP"
echo "  SSH 키: $SSH_KEY"
echo ""

SSH_CMD="ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=no -o LogLevel=QUIET ubuntu@\"$LIGHTSAIL_IP\""

# SSH 연결 테스트
echo -e "${BLUE}[1/3] SSH 연결 확인 중...${NC}"
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no -o LogLevel=QUIET ubuntu@"$LIGHTSAIL_IP" "echo ok" > /dev/null 2>&1; then
    echo -e "${RED}❌ SSH 연결 실패: $LIGHTSAIL_IP${NC}"
    exit 1
fi
echo -e "${GREEN}✅ SSH 연결 성공${NC}"
echo ""

# 마이그레이션 상태 확인
echo -e "${BLUE}[2/3] 현재 마이그레이션 상태 확인 중...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o LogLevel=QUIET ubuntu@"$LIGHTSAIL_IP" 'bash -s' << 'ENDSSH'
set -e
cd /home/ubuntu/chalog-backend

if [ ! -f ".env" ]; then
    echo "❌ .env 파일이 없습니다: /home/ubuntu/chalog-backend/.env"
    exit 1
fi

# data-source.js 필요 (data-source.ts는 ESM에서 __dirname 오류 발생)
if [ ! -f "dist/src/database/data-source.js" ]; then
    echo "❌ data-source.js 파일이 없습니다: /home/ubuntu/chalog-backend/dist/src/database/data-source.js"
    exit 1
fi

# .env 로드 (NODE_ENV를 production으로 강제해 DATABASE_URL 사용)
set -o allexport
source .env
set +o allexport
export NODE_ENV=production

echo "--- 마이그레이션 상태 ---"
# typeorm-ts-node-commonjs: .ts 마이그레이션 로드 가능, data-source.js: __dirname 정상 동작
npx typeorm-ts-node-commonjs migration:show -d dist/src/database/data-source.js
ENDSSH

echo ""

# 마이그레이션 실행
echo -e "${BLUE}[3/3] 마이그레이션 실행 중...${NC}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o LogLevel=QUIET ubuntu@"$LIGHTSAIL_IP" 'bash -s' << 'ENDSSH'
set -e
cd /home/ubuntu/chalog-backend

set -o allexport
source .env
set +o allexport
export NODE_ENV=production

echo "--- 마이그레이션 실행 ---"
# typeorm-ts-node-commonjs: .ts 마이그레이션 로드 가능, data-source.js: __dirname 정상 동작
npx typeorm-ts-node-commonjs migration:run -d dist/src/database/data-source.js

echo ""
echo "--- 최종 상태 확인 ---"
npx typeorm-ts-node-commonjs migration:show -d dist/src/database/data-source.js
ENDSSH

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 마이그레이션 완료${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
