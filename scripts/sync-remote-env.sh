#!/bin/bash

# 로컬 .env를 원격(Lightsail)과 동일하게 동기화하는 스크립트
# 사용법: ./scripts/sync-remote-env.sh
# 필요: 프로젝트 루트에 .ec2-config (EC2_HOST=Lightsail IP, SSH_KEY_PATH, EC2_USER)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_ENV="$PROJECT_ROOT/backend/.env"
ROOT_ENV="$PROJECT_ROOT/.env"

# .ec2-config 로드
if [ -f "$PROJECT_ROOT/.ec2-config" ]; then
    set -a
    source "$PROJECT_ROOT/.ec2-config"
    set +a
else
    echo -e "${RED}❌ .ec2-config 파일을 찾을 수 없습니다.${NC}"
    echo ""
    echo "프로젝트 루트에 .ec2-config 파일을 생성하세요:"
    echo "  EC2_HOST=your-lightsail-ip"
    echo "  SSH_KEY_PATH=~/.ssh/your-key.pem"
    echo "  EC2_USER=ubuntu"
    exit 1
fi

# 필수 변수 확인
SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
EC2_USER="${EC2_USER:-ubuntu}"

if [ -z "$EC2_HOST" ] || [ -z "$SSH_KEY_PATH" ]; then
    echo -e "${RED}❌ .ec2-config에 EC2_HOST(Lightsail IP), SSH_KEY_PATH가 필요합니다.${NC}"
    exit 1
fi

if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}❌ SSH 키 파일을 찾을 수 없습니다: $SSH_KEY_PATH${NC}"
    exit 1
fi

# 업로드할 .env 파일 결정 (백엔드용)
ENV_TO_UPLOAD=""
if [ -f "$BACKEND_ENV" ]; then
    ENV_TO_UPLOAD="$BACKEND_ENV"
elif [ -f "$ROOT_ENV" ]; then
    echo -e "${YELLOW}⚠️  backend/.env 없음. 루트 .env 사용 (DATABASE_URL, JWT_SECRET 등 백엔드 변수 포함 여부 확인)${NC}"
    ENV_TO_UPLOAD="$ROOT_ENV"
else
    echo -e "${RED}❌ .env 파일을 찾을 수 없습니다.${NC}"
    echo "  backend/.env 또는 .env 필요"
    exit 1
fi
REMOTE_PATH="/home/$EC2_USER/chalog-backend/.env"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  원격 .env 동기화 (로컬 → Lightsail)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  로컬: $ENV_TO_UPLOAD"
echo "  원격: $EC2_USER@$EC2_HOST:$REMOTE_PATH"
echo ""

# SSH 연결 테스트
echo -e "${YELLOW}🔍 SSH 연결 테스트 중...${NC}"
if ! ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
    "$EC2_USER@$EC2_HOST" "echo ok" > /dev/null 2>&1; then
    echo -e "${RED}❌ SSH 연결 실패${NC}"
    exit 1
fi
echo -e "${GREEN}✅ SSH 연결 성공${NC}"
echo ""

# 원격 백업 (기존 .env가 있을 경우)
echo -e "${YELLOW}📦 원격 .env 백업 중...${NC}"
ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" \
    "mkdir -p /home/$EC2_USER/chalog-backend/env-backup && \
     [ -f /home/$EC2_USER/chalog-backend/.env ] && cp /home/$EC2_USER/chalog-backend/.env /home/$EC2_USER/chalog-backend/env-backup/.env.bak.\$(date +%Y%m%d_%H%M%S) || true"
echo -e "${GREEN}✅ 백업 완료${NC}"
echo ""

# 업로드
echo -e "${YELLOW}📤 .env 업로드 중...${NC}"
scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$ENV_TO_UPLOAD" \
    "$EC2_USER@$EC2_HOST:$REMOTE_PATH"
ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" \
    "chmod 600 $REMOTE_PATH"
echo -e "${GREEN}✅ 업로드 완료${NC}"
echo ""

# PM2 재시작 안내
echo -e "${BLUE}다음 단계:${NC}"
echo "  pm2 재시작: bash scripts/remote-logs.sh 로그 확인 후 필요시"
echo "  ssh -i $SSH_KEY_PATH $EC2_USER@$EC2_HOST 'pm2 restart chalog-backend'"
echo ""
