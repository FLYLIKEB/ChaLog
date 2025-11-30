#!/bin/bash

# 모든 .env 파일을 EC2 서버에 업로드하는 스크립트
# 사용법: ./scripts/upload-env.sh [SSH_KEY_PATH] [EC2_HOST] [EC2_USER]

set -e

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 스크립트 디렉토리 찾기
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$BACKEND_DIR/.." && pwd)"

# 백엔드 .env 파일 경로 (SSH 설정 읽기용)
BACKEND_ENV_FILE="$BACKEND_DIR/.env"

# 인자 확인 또는 환경 변수 사용
SSH_KEY_PATH="${1:-${SSH_KEY_PATH:-}}"
EC2_HOST="${2:-${EC2_HOST:-}}"
EC2_USER="${3:-${EC2_USER:-ubuntu}}"

# 백엔드 .env 파일에서 환경 변수 읽기 (있는 경우)
if [ -f "$BACKEND_ENV_FILE" ]; then
    echo -e "${GREEN}📄 백엔드 .env 파일 발견: $BACKEND_ENV_FILE${NC}"
    # SSH 관련 변수만 읽기 (DATABASE_URL 등은 제외)
    if [ -z "$SSH_KEY_PATH" ]; then
        SSH_KEY_PATH=$(grep "^SSH_KEY_PATH=" "$BACKEND_ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "")
    fi
    if [ -z "$EC2_HOST" ]; then
        EC2_HOST=$(grep "^EC2_HOST=" "$BACKEND_ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "")
    fi
    if [ -z "$EC2_USER" ]; then
        EC2_USER=$(grep "^EC2_USER=" "$BACKEND_ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "ubuntu")
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

# 모든 .env 파일 찾기
echo -e "${BLUE}🔍 프로젝트 내 모든 .env 파일 검색 중...${NC}"
ENV_FILES=()
while IFS= read -r -d '' file; do
    ENV_FILES+=("$file")
done < <(find "$PROJECT_ROOT" -maxdepth 2 -name ".env" -type f -print0 2>/dev/null | grep -zv "node_modules\|dist")

if [ ${#ENV_FILES[@]} -eq 0 ]; then
    echo -e "${RED}❌ .env 파일을 찾을 수 없습니다!${NC}"
    exit 1
fi

echo -e "${GREEN}📋 발견된 .env 파일들:${NC}"
for file in "${ENV_FILES[@]}"; do
    echo "  - $file"
done
echo ""

# SSH 키 파일 확인
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo -e "${RED}❌ SSH 키 파일을 찾을 수 없습니다: $SSH_KEY_PATH${NC}"
    exit 1
fi

# SSH 키 권한 확인 및 설정
chmod 400 "$SSH_KEY_PATH" 2>/dev/null || true

echo -e "${GREEN}🚀 .env 파일들 업로드 시작${NC}"
echo "  SSH 키: $SSH_KEY_PATH"
echo "  서버: $EC2_USER@$EC2_HOST"
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
    "mkdir -p /home/$EC2_USER/chalog-backend && mkdir -p /home/$EC2_USER/chalog-backend/env-backup"

# 각 .env 파일 업로드
UPLOADED_COUNT=0
for env_file in "${ENV_FILES[@]}"; do
    # 파일명과 상대 경로 결정
    if [[ "$env_file" == "$BACKEND_ENV_FILE" ]]; then
        # 백엔드 .env는 메인 위치에 업로드
        remote_path="/home/$EC2_USER/chalog-backend/.env"
        echo -e "${YELLOW}📤 백엔드 .env 파일 업로드 중...${NC}"
        echo "  로컬: $env_file"
        echo "  원격: $remote_path"
    else
        # 다른 .env 파일들은 백업 디렉토리에 업로드
        filename=$(basename "$env_file")
        relative_path=$(realpath --relative-to="$PROJECT_ROOT" "$env_file" 2>/dev/null || echo "$filename")
        safe_path=$(echo "$relative_path" | sed 's/[^a-zA-Z0-9._-]/_/g')
        remote_path="/home/$EC2_USER/chalog-backend/env-backup/$safe_path"
        echo -e "${YELLOW}📤 .env 파일 업로드 중...${NC}"
        echo "  로컬: $env_file"
        echo "  원격: $remote_path"
    fi
    
    # 파일 업로드
    if scp -i "$SSH_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o ConnectTimeout=10 \
        "$env_file" \
        "$EC2_USER@$EC2_HOST:$remote_path" 2>/dev/null; then
        echo -e "${GREEN}  ✅ 업로드 성공${NC}"
        
        # 권한 설정
        ssh -i "$SSH_KEY_PATH" \
            -o StrictHostKeyChecking=no \
            "$EC2_USER@$EC2_HOST" \
            "chmod 600 $remote_path" 2>/dev/null || true
        
        UPLOADED_COUNT=$((UPLOADED_COUNT + 1))
    else
        echo -e "${RED}  ❌ 업로드 실패${NC}"
    fi
    echo ""
done

# 백엔드 .env 파일 확인
if [ -f "$BACKEND_ENV_FILE" ]; then
    echo -e "${YELLOW}✅ 백엔드 .env 파일 업로드 확인 중...${NC}"
    ssh -i "$SSH_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        "$EC2_USER@$EC2_HOST" \
        "ls -la /home/$EC2_USER/chalog-backend/.env && echo '' && head -5 /home/$EC2_USER/chalog-backend/.env | grep -v '^#' | head -3"
fi

echo ""
if [ $UPLOADED_COUNT -eq ${#ENV_FILES[@]} ]; then
    echo -e "${GREEN}✅ 모든 .env 파일 업로드 완료! ($UPLOADED_COUNT/${#ENV_FILES[@]})${NC}"
else
    echo -e "${YELLOW}⚠️  일부 .env 파일 업로드 완료 ($UPLOADED_COUNT/${#ENV_FILES[@]})${NC}"
fi
echo ""
echo "다음 단계:"
echo "  1. PM2 재시작: ssh -i $SSH_KEY_PATH $EC2_USER@$EC2_HOST 'pm2 restart chalog-backend'"
echo "  2. 로그 확인: ssh -i $SSH_KEY_PATH $EC2_USER@$EC2_HOST 'pm2 logs chalog-backend'"
echo "  3. 백업 파일 확인: ssh -i $SSH_KEY_PATH $EC2_USER@$EC2_HOST 'ls -la /home/$EC2_USER/chalog-backend/env-backup/'"

