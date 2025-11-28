#!/bin/bash

# .env 파일을 EC2 서버에 업로드하는 스크립트
# 사용법: ./scripts/upload-env.sh [SSH_KEY_PATH] [EC2_HOST] [EC2_USER]

set -e

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 스크립트 디렉토리 찾기
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$BACKEND_DIR/.." && pwd)"

# .env 파일 경로
ENV_FILE="$BACKEND_DIR/.env"

# 인자 확인 또는 환경 변수 사용
SSH_KEY_PATH="${1:-${SSH_KEY_PATH:-}}"
EC2_HOST="${2:-${EC2_HOST:-}}"
EC2_USER="${3:-${EC2_USER:-ubuntu}}"

# .env 파일에서 환경 변수 읽기 (있는 경우)
if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}📄 .env 파일 발견: $ENV_FILE${NC}"
    # SSH 관련 변수만 읽기 (DATABASE_URL 등은 제외)
    if [ -z "$SSH_KEY_PATH" ]; then
        SSH_KEY_PATH=$(grep "^SSH_KEY_PATH=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "")
    fi
    if [ -z "$EC2_HOST" ]; then
        EC2_HOST=$(grep "^EC2_HOST=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "")
    fi
    if [ -z "$EC2_USER" ]; then
        EC2_USER=$(grep "^EC2_USER=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "ubuntu")
    fi
fi

# 필수 변수 확인
if [ -z "$SSH_KEY_PATH" ] || [ -z "$EC2_HOST" ]; then
    echo -e "${RED}❌ 필수 변수가 설정되지 않았습니다!${NC}"
    echo ""
    echo "사용법:"
    echo "  $0 [SSH_KEY_PATH] [EC2_HOST] [EC2_USER]"
    echo ""
    echo "또는 .env 파일에 다음 변수를 설정하세요:"
    echo "  SSH_KEY_PATH=~/.ssh/your-key.pem"
    echo "  EC2_HOST=your-ec2-ip"
    echo "  EC2_USER=ubuntu"
    echo ""
    echo "또는 환경 변수로 설정:"
    echo "  export SSH_KEY_PATH=~/.ssh/your-key.pem"
    echo "  export EC2_HOST=your-ec2-ip"
    echo "  export EC2_USER=ubuntu"
    exit 1
fi

# SSH 키 경로 확장 (~ -> 홈 디렉토리)
SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"

# .env 파일 확인
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ .env 파일을 찾을 수 없습니다: $ENV_FILE${NC}"
    exit 1
fi

# SSH 키 파일 확인
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}❌ SSH 키 파일을 찾을 수 없습니다: $SSH_KEY_PATH${NC}"
    exit 1
fi

# SSH 키 권한 확인 및 설정
chmod 400 "$SSH_KEY_PATH" 2>/dev/null || true

echo -e "${GREEN}🚀 .env 파일 업로드 시작${NC}"
echo "  SSH 키: $SSH_KEY_PATH"
echo "  서버: $EC2_USER@$EC2_HOST"
echo "  대상: /home/$EC2_USER/chalog-backend/.env"
echo ""

# SSH 연결 테스트
echo -e "${YELLOW}🔍 SSH 연결 테스트 중...${NC}"
if ssh -i "$SSH_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=10 \
    -o BatchMode=yes \
    "$EC2_USER@$EC2_HOST" \
    "echo 'SSH 연결 성공!'" 2>&1; then
    echo -e "${GREEN}✅ SSH 연결 성공!${NC}"
else
    echo -e "${RED}❌ SSH 연결 실패!${NC}"
    exit 1
fi

# 디렉토리 생성
echo -e "${YELLOW}📁 서버 디렉토리 확인 중...${NC}"
ssh -i "$SSH_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    "$EC2_USER@$EC2_HOST" \
    "mkdir -p /home/$EC2_USER/chalog-backend"

# .env 파일 업로드
echo -e "${YELLOW}📤 .env 파일 업로드 중...${NC}"
scp -i "$SSH_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=10 \
    "$ENV_FILE" \
    "$EC2_USER@$EC2_HOST:/home/$EC2_USER/chalog-backend/.env"

# 권한 설정
echo -e "${YELLOW}🔒 파일 권한 설정 중...${NC}"
ssh -i "$SSH_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    "$EC2_USER@$EC2_HOST" \
    "chmod 600 /home/$EC2_USER/chalog-backend/.env"

# 확인
echo -e "${YELLOW}✅ 업로드 확인 중...${NC}"
ssh -i "$SSH_KEY_PATH" \
    -o StrictHostKeyChecking=no \
    "$EC2_USER@$EC2_HOST" \
    "ls -la /home/$EC2_USER/chalog-backend/.env && echo '' && head -5 /home/$EC2_USER/chalog-backend/.env | grep -v '^#' | head -3"

echo ""
echo -e "${GREEN}✅ .env 파일 업로드 완료!${NC}"
echo ""
echo "다음 단계:"
echo "  1. PM2 재시작: ssh -i $SSH_KEY_PATH $EC2_USER@$EC2_HOST 'pm2 restart chalog-backend'"
echo "  2. 로그 확인: ssh -i $SSH_KEY_PATH $EC2_USER@$EC2_HOST 'pm2 logs chalog-backend'"

