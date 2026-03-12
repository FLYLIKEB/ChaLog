#!/bin/bash

# EC2에서 Lightsail로 마이그레이션하는 헬퍼 스크립트
# 사용법: ./scripts/migrate-to-lightsail.sh [LIGHTSAIL_IP] [SSH_KEY_PATH]

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

# 인자 확인
LIGHTSAIL_IP="${1:-}"

# Lightsail 키 경로 확인 (프로젝트 루트 또는 기본값)
if [ -f "$PROJECT_ROOT/LightsailDefaultKey-ap-northeast-2.pem" ]; then
    LIGHTSAIL_KEY_PATH="$PROJECT_ROOT/LightsailDefaultKey-ap-northeast-2.pem"
elif [ -f "$HOME/.ssh/LightsailDefaultKey-ap-northeast-2.pem" ]; then
    LIGHTSAIL_KEY_PATH="$HOME/.ssh/LightsailDefaultKey-ap-northeast-2.pem"
else
    LIGHTSAIL_KEY_PATH="${2:-}"
    if [ -z "$LIGHTSAIL_KEY_PATH" ] || [ ! -f "$LIGHTSAIL_KEY_PATH" ]; then
        echo -e "${RED}❌ Lightsail SSH 키 파일을 찾을 수 없습니다.${NC}"
        echo "키 파일 경로를 제공하세요: $0 <LIGHTSAIL_IP> <SSH_KEY_PATH>"
        exit 1
    fi
fi

# EC2 키는 .ec2-config에서 읽기 (없으면 Lightsail 키 사용)
if [ -f "$PROJECT_ROOT/LightsailDefaultKey-ap-northeast-2.pem" ]; then
    DEFAULT_EC2_KEY="$PROJECT_ROOT/LightsailDefaultKey-ap-northeast-2.pem"
elif [ -f "$HOME/.ssh/LightsailDefaultKey-ap-northeast-2.pem" ]; then
    DEFAULT_EC2_KEY="$HOME/.ssh/LightsailDefaultKey-ap-northeast-2.pem"
else
    DEFAULT_EC2_KEY="~/.ssh/LightsailDefaultKey-ap-northeast-2.pem"
fi
EC2_KEY_PATH="${SSH_KEY_PATH:-$DEFAULT_EC2_KEY}"

if [ -z "$LIGHTSAIL_IP" ]; then
    echo -e "${RED}❌ Lightsail IP가 제공되지 않았습니다.${NC}"
    echo "사용법: $0 <LIGHTSAIL_IP> [SSH_KEY_PATH]"
    echo "예시: $0 3.34.123.45"
    exit 1
fi

echo -e "${BLUE}🔑 EC2 키: $EC2_KEY_PATH${NC}"
echo -e "${BLUE}🔑 Lightsail 키: $LIGHTSAIL_KEY_PATH${NC}"

echo -e "${BLUE}🚀 EC2 → Lightsail 마이그레이션 시작${NC}"
echo ""

# 1. EC2에서 데이터 백업
echo -e "${YELLOW}📋 1단계: EC2에서 데이터 백업${NC}"

# EC2 설정 읽기
if [ -f "$PROJECT_ROOT/.ec2-config" ]; then
    source "$PROJECT_ROOT/.ec2-config"
fi

EC2_HOST="${EC2_HOST:-}"
EC2_USER="${EC2_USER:-ubuntu}"

if [ -z "$EC2_HOST" ]; then
    echo -e "${RED}❌ EC2_HOST가 필요합니다. .ec2-config에 설정하거나 EC2_HOST 환경 변수를 설정하세요.${NC}"
    echo "사용법: EC2_HOST=<IP> $0 <LIGHTSAIL_IP> [SSH_KEY_PATH]"
    exit 1
fi

echo "EC2 호스트: $EC2_USER@$EC2_HOST"
echo "Lightsail IP: $LIGHTSAIL_IP"
echo ""

# EC2에서 .env 파일 백업
echo -e "${BLUE}📥 EC2에서 .env 파일 다운로드 중...${NC}"
# EC2 키 경로 확장 (~ 처리)
if [[ "$EC2_KEY_PATH" == ~* ]]; then
    EC2_KEY_PATH="${EC2_KEY_PATH/#\~/$HOME}"
fi

scp -i "$EC2_KEY_PATH" \
    "$EC2_USER@$EC2_HOST:/home/ubuntu/chalog-backend/.env" \
    "$BACKEND_DIR/.env.lightsail-backup" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  EC2에서 .env 파일을 찾을 수 없습니다. 수동으로 확인하세요.${NC}"
}

# 2. Lightsail 연결 테스트
echo -e "${YELLOW}📋 2단계: Lightsail 연결 테스트${NC}"
echo -e "${BLUE}🔗 Lightsail에 SSH 연결 테스트 중...${NC}"

if ssh -i "$LIGHTSAIL_KEY_PATH" -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
    "ubuntu@$LIGHTSAIL_IP" "echo '연결 성공'" 2>/dev/null; then
    echo -e "${GREEN}✅ Lightsail 연결 성공${NC}"
else
    echo -e "${RED}❌ Lightsail 연결 실패${NC}"
    echo "SSH 키 경로: $LIGHTSAIL_KEY_PATH"
    echo "Lightsail IP: $LIGHTSAIL_IP"
    echo ""
    echo "수동 연결 테스트:"
    echo "ssh -i \"$LIGHTSAIL_KEY_PATH\" ubuntu@$LIGHTSAIL_IP"
    exit 1
fi

# 3. Lightsail 초기 설정
echo -e "${YELLOW}📋 3단계: Lightsail 초기 설정${NC}"
echo -e "${BLUE}🔧 필수 패키지 설치 중...${NC}"

ssh -i "$LIGHTSAIL_KEY_PATH" "ubuntu@$LIGHTSAIL_IP" << 'ENDSSH'
    # 시스템 업데이트
    sudo apt update -qq
    
    # Node.js 20 설치 확인
    if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "20" ]; then
        echo "Node.js 20 설치 중..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
    
    # PM2 설치 확인
    if ! command -v pm2 &> /dev/null; then
        echo "PM2 설치 중..."
        sudo npm install -g pm2
    fi
    
    # Nginx 설치 확인
    if ! command -v nginx &> /dev/null; then
        echo "Nginx 설치 중..."
        sudo apt install -y nginx
    fi
    
    # 디렉토리 생성
    mkdir -p /home/ubuntu/chalog-backend
    
    echo "✅ 초기 설정 완료"
ENDSSH

# 4. 환경 변수 업로드
if [ -f "$BACKEND_DIR/.env.lightsail-backup" ]; then
    echo -e "${YELLOW}📋 4단계: 환경 변수 업로드${NC}"
    echo -e "${BLUE}📤 .env 파일 업로드 중...${NC}"
    
    scp -i "$LIGHTSAIL_KEY_PATH" \
        "$BACKEND_DIR/.env.lightsail-backup" \
        "ubuntu@$LIGHTSAIL_IP:/home/ubuntu/chalog-backend/.env"
    
    echo -e "${GREEN}✅ 환경 변수 업로드 완료${NC}"
else
    echo -e "${YELLOW}⚠️  .env 파일이 없습니다. 수동으로 설정하세요.${NC}"
fi

# 5. 배포 안내
echo -e "${YELLOW}📋 5단계: 애플리케이션 배포${NC}"
echo ""
echo "다음 중 하나의 방법으로 배포하세요:"
echo ""
echo -e "${GREEN}방법 1: GitHub Actions 사용 (권장)${NC}"
echo "1. GitHub Secrets에서 EC2_HOST를 Lightsail IP로 변경"
echo "2. 또는 LIGHTSAIL_HOST Secret 추가"
echo "3. GitHub Actions에서 배포 실행"
echo ""
echo -e "${GREEN}방법 2: 수동 배포${NC}"
echo "다음 명령어를 실행하세요:"
echo ""
echo "ssh -i $SSH_KEY_PATH ubuntu@$LIGHTSAIL_IP"
echo "cd /home/ubuntu/chalog-backend"
echo "git clone https://github.com/your-username/ChaLog.git ."
echo "cd backend"
echo "npm ci --production"
echo "npm run build"
echo "pm2 start ecosystem.config.js"
echo "pm2 save"
echo ""

# 7. 체크리스트 출력
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 마이그레이션 체크리스트${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "[ ] Lightsail 인스턴스 생성 완료"
echo "[ ] Lightsail 연결 테스트 완료"
echo "[ ] Lightsail Docker MySQL 컨테이너 실행 확인"
echo "[ ] 환경 변수 업로드 완료"
echo "[ ] 애플리케이션 배포 완료"
echo "[ ] Nginx 설정 완료"
echo "[ ] SSL 인증서 설정 (선택사항)"
echo "[ ] 기능 테스트 완료"
echo "[ ] 프론트엔드 백엔드 URL 변경"
echo "[ ] DNS 설정 변경 (도메인 사용 시)"
echo "[ ] EC2 인스턴스 중지 (테스트)"
echo "[ ] 모니터링 (1-2일)"
echo "[ ] EC2 인스턴스 종료"
echo ""
echo -e "${GREEN}✅ 초기 설정 완료!${NC}"
echo ""
echo -e "${BLUE}📖 자세한 가이드:${NC}"
echo "   docs/deployment/AWS_LIGHTSAIL_MIGRATION.md"
echo ""
