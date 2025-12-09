#!/bin/bash

# EC2 서버 로그 확인 스크립트
# 사용법: ./scripts/view-ec2-logs.sh [옵션]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 스크립트 디렉토리 찾기
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/.ec2-config"

# 설정 파일 로드 (존재하는 경우)
if [ -f "$CONFIG_FILE" ]; then
    # 주석과 빈 줄 제거 후 source로 로드
    while IFS='=' read -r key value; do
        # 주석 제거
        key=$(echo "$key" | sed 's/#.*$//')
        value=$(echo "$value" | sed 's/#.*$//')
        # 공백 제거
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        # 빈 줄이나 주석만 있는 줄 건너뛰기
        if [ -n "$key" ] && [ -n "$value" ]; then
            export "$key=$value"
        fi
    done < "$CONFIG_FILE"
fi

# 기본 설정 (환경 변수나 설정 파일에서 설정되지 않은 경우)
SSH_KEY_PATH="${SSH_KEY_PATH:-~/.ssh/summy.pem}"
EC2_HOST="${EC2_HOST:-your-ec2-ip}"
EC2_USER="${EC2_USER:-ubuntu}"
LOG_LINES="${LOG_LINES:-100}"

# SSH 키 경로의 tilde 확장
if [[ "$SSH_KEY_PATH" == ~* ]]; then
    SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"
fi

# 도움말 출력
show_help() {
    echo -e "${BLUE}EC2 서버 로그 확인 스크립트${NC}"
    echo ""
    echo "사용법:"
    echo "  $0 [옵션] [명령어]"
    echo ""
    echo "명령어:"
    echo "  pm2          PM2 로그 확인 (기본값)"
    echo "  app          애플리케이션 로그 파일 확인"
    echo "  error        에러 로그 파일 확인"
    echo "  nginx        Nginx 로그 확인"
    echo "  status       PM2 상태 확인"
    echo "  all          모든 로그 확인"
    echo ""
    echo "옵션:"
    echo "  -n, --lines N     로그 라인 수 (기본값: 100)"
    echo "  -f, --follow      실시간 로그 모니터링"
    echo "  -h, --help        도움말 출력"
    echo ""
    echo "환경 변수:"
    echo "  SSH_KEY_PATH      SSH 키 경로 (기본값: ~/.ssh/summy.pem)"
    echo "  EC2_HOST          EC2 호스트 IP 또는 도메인"
    echo "  EC2_USER          EC2 사용자명 (기본값: ubuntu)"
    echo ""
    echo "예제:"
    echo "  $0 pm2 -n 50              # PM2 로그 최근 50줄"
    echo "  $0 pm2 -f                 # PM2 로그 실시간 모니터링"
    echo "  $0 app                    # 애플리케이션 로그 파일 확인"
    echo "  EC2_HOST=52.78.150.124 $0 pm2  # 특정 EC2 호스트 지정"
}

# SSH 명령어 실행
run_ssh() {
    local command="$1"
    ssh -i "$SSH_KEY_PATH" \
        -o StrictHostKeyChecking=no \
        -o ConnectTimeout=10 \
        "${EC2_USER}@${EC2_HOST}" \
        "$command"
}

# PM2 로그 확인
view_pm2_logs() {
    local follow="$1"
    if [ "$follow" = "true" ]; then
        echo -e "${GREEN}📋 PM2 실시간 로그 모니터링${NC}"
        echo -e "${YELLOW}종료하려면 Ctrl+C를 누르세요${NC}"
        echo ""
        ssh -i "$SSH_KEY_PATH" \
            -o StrictHostKeyChecking=no \
            -o ConnectTimeout=10 \
            "${EC2_USER}@${EC2_HOST}" \
            "pm2 logs chalog-backend --lines 0"
    else
        echo -e "${GREEN}📋 PM2 로그 (최근 ${LOG_LINES}줄)${NC}"
        echo ""
        run_ssh "pm2 logs chalog-backend --lines ${LOG_LINES} --nostream"
    fi
}

# 애플리케이션 로그 파일 확인
view_app_logs() {
    local follow="$1"
    if [ "$follow" = "true" ]; then
        echo -e "${GREEN}📋 애플리케이션 로그 실시간 모니터링${NC}"
        echo -e "${YELLOW}종료하려면 Ctrl+C를 누르세요${NC}"
        echo ""
        ssh -i "$SSH_KEY_PATH" \
            -o StrictHostKeyChecking=no \
            -o ConnectTimeout=10 \
            "${EC2_USER}@${EC2_HOST}" \
            "tail -f /home/ubuntu/chalog-backend/logs/out.log"
    else
        echo -e "${GREEN}📋 애플리케이션 로그 (최근 ${LOG_LINES}줄)${NC}"
        echo ""
        run_ssh "tail -n ${LOG_LINES} /home/ubuntu/chalog-backend/logs/out.log"
    fi
}

# 에러 로그 파일 확인
view_error_logs() {
    local follow="$1"
    if [ "$follow" = "true" ]; then
        echo -e "${RED}📋 에러 로그 실시간 모니터링${NC}"
        echo -e "${YELLOW}종료하려면 Ctrl+C를 누르세요${NC}"
        echo ""
        ssh -i "$SSH_KEY_PATH" \
            -o StrictHostKeyChecking=no \
            -o ConnectTimeout=10 \
            "${EC2_USER}@${EC2_HOST}" \
            "tail -f /home/ubuntu/chalog-backend/logs/err.log"
    else
        echo -e "${RED}📋 에러 로그 (최근 ${LOG_LINES}줄)${NC}"
        echo ""
        run_ssh "tail -n ${LOG_LINES} /home/ubuntu/chalog-backend/logs/err.log"
    fi
}

# Nginx 로그 확인
view_nginx_logs() {
    local follow="$1"
    echo -e "${BLUE}📋 Nginx 로그${NC}"
    echo ""
    
    # Nginx 로그 파일 찾기
    local access_log=$(run_ssh "ls /var/log/nginx/chalog-backend-access.log /var/log/nginx/access.log 2>/dev/null | head -1" 2>/dev/null || echo "")
    local error_log=$(run_ssh "ls /var/log/nginx/chalog-backend-error.log /var/log/nginx/error.log 2>/dev/null | head -1" 2>/dev/null || echo "")
    
    if [ -z "$access_log" ] && [ -z "$error_log" ]; then
        echo -e "${YELLOW}⚠️  Nginx 로그 파일을 찾을 수 없습니다.${NC}"
        echo ""
        echo "가능한 원인:"
        echo "  - Nginx가 설치되지 않았을 수 있습니다"
        echo "  - 로그 파일 경로가 다를 수 있습니다"
        echo ""
        echo "Nginx 설치 확인:"
        run_ssh "which nginx || echo 'Nginx가 설치되지 않았습니다'"
        return 1
    fi
    
    if [ "$follow" = "true" ]; then
        if [ -n "$access_log" ]; then
            echo -e "${GREEN}액세스 로그 (실시간):${NC}"
            ssh -i "$SSH_KEY_PATH" \
                -o StrictHostKeyChecking=no \
                -o ConnectTimeout=10 \
                "${EC2_USER}@${EC2_HOST}" \
                "sudo tail -f $access_log"
        fi
    else
        if [ -n "$access_log" ]; then
            echo -e "${GREEN}액세스 로그 (최근 ${LOG_LINES}줄):${NC}"
            run_ssh "sudo tail -n ${LOG_LINES} $access_log 2>/dev/null || echo '로그 파일을 읽을 수 없습니다'"
        fi
        echo ""
        if [ -n "$error_log" ]; then
            echo -e "${RED}에러 로그 (최근 ${LOG_LINES}줄):${NC}"
            run_ssh "sudo tail -n ${LOG_LINES} $error_log 2>/dev/null || echo '로그 파일을 읽을 수 없습니다'"
        fi
    fi
}

# PM2 상태 확인
view_pm2_status() {
    echo -e "${GREEN}📊 PM2 상태${NC}"
    echo ""
    run_ssh "pm2 status"
    echo ""
    echo -e "${GREEN}📊 PM2 상세 정보${NC}"
    echo ""
    run_ssh "pm2 describe chalog-backend"
}

# 모든 로그 확인
view_all_logs() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    view_pm2_status
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    view_pm2_logs false
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    view_error_logs false
}

# 메인 로직
COMMAND="pm2"
FOLLOW=false

# 인자 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--lines)
            LOG_LINES="$2"
            shift 2
            ;;
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        pm2|app|error|nginx|status|all)
            COMMAND="$1"
            shift
            ;;
        *)
            echo -e "${RED}알 수 없는 옵션: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
done

# EC2_HOST 확인
if [ "$EC2_HOST" = "your-ec2-ip" ]; then
    echo -e "${RED}❌ EC2_HOST가 설정되지 않았습니다.${NC}"
    echo ""
    echo "설정 방법 (선택):"
    echo ""
    echo "1. .ec2-config 파일 수정 (권장):"
    echo "   $CONFIG_FILE 파일을 열어서 EC2_HOST를 설정하세요"
    echo ""
    echo "2. 환경 변수로 설정:"
    echo "   export EC2_HOST=your-ec2-ip"
    echo "   $0 $COMMAND"
    echo ""
    echo "3. 한 번만 실행:"
    echo "   EC2_HOST=your-ec2-ip $0 $COMMAND"
    exit 1
fi

# SSH 키 확인
if [ ! -f "${SSH_KEY_PATH/#\~/$HOME}" ]; then
    echo -e "${RED}❌ SSH 키 파일을 찾을 수 없습니다: ${SSH_KEY_PATH}${NC}"
    echo ""
    echo "SSH_KEY_PATH 환경 변수를 설정하거나 스크립트를 수정하세요."
    exit 1
fi

# 명령어 실행
case $COMMAND in
    pm2)
        view_pm2_logs $FOLLOW
        ;;
    app)
        view_app_logs $FOLLOW
        ;;
    error)
        view_error_logs $FOLLOW
        ;;
    nginx)
        view_nginx_logs $FOLLOW
        ;;
    status)
        view_pm2_status
        ;;
    all)
        view_all_logs
        ;;
    *)
        echo -e "${RED}알 수 없는 명령어: $COMMAND${NC}"
        show_help
        exit 1
        ;;
esac

