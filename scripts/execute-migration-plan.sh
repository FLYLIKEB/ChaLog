#!/bin/bash

# Lightsail Docker MySQL 마이그레이션 및 배포 계획 실행 스크립트
# 계획 파일: docs/plans/lightsail_docker_mysql_마이그레이션_및_배포_b0f9b478.plan.md

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 설정
LIGHTSAIL_IP="${LIGHTSAIL_IP:-}"
SSH_KEY="${SSH_KEY_PATH:-LightsailDefaultKey-ap-northeast-2.pem}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -z "$LIGHTSAIL_IP" ]; then
    echo -e "${RED}❌ LIGHTSAIL_IP가 필요합니다.${NC}"
    echo "사용법: LIGHTSAIL_IP=<IP> $0"
    exit 1
fi

# SSH 키 경로 확인
if [[ "$SSH_KEY" == ~* ]]; then
    SSH_KEY="${SSH_KEY/#\~/$HOME}"
fi

if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH 키 파일을 찾을 수 없습니다: $SSH_KEY${NC}"
    echo "SSH_KEY_PATH 환경 변수를 설정하거나 스크립트 인자로 전달하세요."
    exit 1
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🚀 Lightsail Docker MySQL 마이그레이션 및 배포${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Lightsail IP: $LIGHTSAIL_IP"
echo "SSH 키: $SSH_KEY"
echo ""

# 단계별 실행 함수
step_1_check_github_actions() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 1단계: GitHub Actions 워크플로우 확인${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "${YELLOW}⚠️  GitHub Secrets 확인 필요:${NC}"
    echo ""
    echo "다음 Secrets가 설정되어 있는지 확인하세요:"
    echo "  1. EC2_HOST: $LIGHTSAIL_IP"
    echo "  2. EC2_USER: ubuntu"
    echo "  3. EC2_SSH_KEY: Lightsail SSH 키 전체 내용"
    echo "  4. EC2_DATABASE_URL: mysql://chalog_user:changeme_password@localhost:3306/chalog"
    echo "  5. EC2_JWT_SECRET: (기존 값)"
    echo ""
    read -p "GitHub Secrets가 모두 설정되어 있습니까? (y/n): " CONFIRMED
    
    if [[ "$CONFIRMED" != "y" ]]; then
        echo -e "${YELLOW}⚠️  GitHub Secrets 설정 후 다시 실행하세요.${NC}"
        echo "자세한 내용: docs/deployment/GITHUB_SECRETS_SETUP.md"
        return 1
    fi
    
    echo -e "${GREEN}✅ GitHub Actions 설정 확인 완료${NC}"
    return 0
}

step_2_deploy_application() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 2단계: 애플리케이션 배포${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "${YELLOW}📝 배포 방법 선택:${NC}"
    echo "  1. GitHub Actions 자동 배포 (권장)"
    echo "  2. 수동 배포"
    echo ""
    read -p "선택 (1 또는 2, 기본값: 1): " DEPLOY_METHOD
    DEPLOY_METHOD=${DEPLOY_METHOD:-1}
    
    if [ "$DEPLOY_METHOD" = "1" ]; then
        echo ""
        echo -e "${YELLOW}📤 GitHub Actions 배포 실행:${NC}"
        echo "  1. GitHub 저장소로 이동"
        echo "  2. Actions 탭 클릭"
        echo "  3. 'Deploy Backend to EC2' 워크플로우 선택"
        echo "  4. 'Run workflow' 클릭"
        echo ""
        read -p "GitHub Actions 배포를 실행하셨습니까? (y/n): " DEPLOYED
        
        if [[ "$DEPLOYED" != "y" ]]; then
            echo -e "${YELLOW}⚠️  배포를 완료한 후 다음 단계로 진행하세요.${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  수동 배포는 별도로 진행하세요.${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ 애플리케이션 배포 완료${NC}"
    return 0
}

step_3_run_migrations() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 3단계: 데이터베이스 마이그레이션 실행${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "${YELLOW}🔄 마이그레이션 실행 중...${NC}"
    ssh -i "$SSH_KEY" ubuntu@$LIGHTSAIL_IP << 'ENDSSH'
set -e
cd /home/ubuntu/chalog-backend

# .env 파일 확인
if [ ! -f ".env" ]; then
    echo "❌ .env 파일이 없습니다!"
    exit 1
fi

if [ ! -f "src/database/data-source.ts" ]; then
    echo "❌ data-source.ts 파일이 없습니다!"
    exit 1
fi

# 환경 변수 로드 (NODE_ENV=production 강제해 DATABASE_URL 사용)
set -o allexport
source .env
set +o allexport
export NODE_ENV=production

if [ -d "migrations" ]; then
    echo "마이그레이션 실행 중..."
    npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
    echo "✅ 마이그레이션 완료"
else
    echo "⚠️ migrations 폴더가 없습니다."
fi
ENDSSH
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 데이터베이스 마이그레이션 완료${NC}"
        return 0
    else
        echo -e "${RED}❌ 데이터베이스 마이그레이션 실패${NC}"
        return 1
    fi
}

step_4_setup_nginx() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 4단계: Nginx 설정${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Nginx 설정 스크립트 실행
    "$SCRIPT_DIR/setup-nginx.sh" "$LIGHTSAIL_IP"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Nginx 설정 완료${NC}"
        return 0
    else
        echo -e "${RED}❌ Nginx 설정 실패${NC}"
        return 1
    fi
}

step_5_test_application() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📋 5단계: 애플리케이션 테스트${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "${YELLOW}🏥 Health check 테스트 중...${NC}"
    
    # 직접 포트로 테스트
    if curl -f -s "http://$LIGHTSAIL_IP:3000/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 직접 포트 (3000) Health check 성공${NC}"
    else
        echo -e "${YELLOW}⚠️  직접 포트 (3000) Health check 실패${NC}"
    fi
    
    # Nginx를 통한 테스트
    sleep 2
    if curl -f -s "http://$LIGHTSAIL_IP/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Nginx를 통한 Health check 성공${NC}"
    else
        echo -e "${YELLOW}⚠️  Nginx를 통한 Health check 실패${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}테스트 URL:${NC}"
    echo "  - 직접 포트: http://$LIGHTSAIL_IP:3000/health"
    echo "  - Nginx: http://$LIGHTSAIL_IP/health"
    echo ""
    
    return 0
}

# 메인 실행
main() {
    echo ""
    read -p "계속 진행하시겠습니까? (y/n): " CONTINUE
    if [[ "$CONTINUE" != "y" ]]; then
        echo "중단되었습니다."
        exit 0
    fi
    
    # 단계별 실행
    step_1_check_github_actions || { echo -e "${YELLOW}⚠️  1단계 확인 필요${NC}"; }
    step_2_deploy_application || { echo -e "${YELLOW}⚠️  2단계 확인 필요${NC}"; }
    step_3_run_migrations || { echo -e "${YELLOW}⚠️  3단계 확인 필요${NC}"; }
    step_4_setup_nginx || { echo -e "${RED}❌ 4단계 실패${NC}"; exit 1; }
    step_5_test_application || { echo -e "${YELLOW}⚠️  5단계 확인 필요${NC}"; }
    
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 모든 단계 완료!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "다음 단계:"
    echo "  1. 애플리케이션 기능 테스트"
    echo "  2. 데이터베이스 연결 확인"
    echo "  3. 모든 기능이 정상 작동하는지 확인"
    echo "  4. 모니터링 및 로그 확인"
    echo ""
    echo "모니터링:"
    echo "  - PM2 로그: ssh -i $SSH_KEY ubuntu@$LIGHTSAIL_IP 'pm2 logs chalog-backend'"
    echo "  - Nginx 로그: ssh -i $SSH_KEY ubuntu@$LIGHTSAIL_IP 'sudo tail -f /var/log/nginx/chalog-backend-error.log'"
    echo "  - MySQL 로그: ssh -i $SSH_KEY ubuntu@$LIGHTSAIL_IP 'docker logs chalog-mysql'"
}

# 스크립트 실행
main
