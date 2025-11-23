#!/bin/bash

# SSH 터널 시작 스크립트
# .env 파일의 환경 변수를 사용하여 SSH 터널을 생성합니다.

set -e

# .env 파일 로드
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# 환경 변수 기본값 설정
SSH_KEY_PATH=${SSH_KEY_PATH:-~/.ssh/your-key.pem}
EC2_HOST=${EC2_HOST:-REDACTED_EC2_IP}
EC2_USER=${EC2_USER:-ubuntu}
SSH_TUNNEL_LOCAL_PORT=${SSH_TUNNEL_LOCAL_PORT:-3307}
SSH_TUNNEL_REMOTE_HOST=${SSH_TUNNEL_REMOTE_HOST:-REDACTED_RDS_ENDPOINT}
SSH_TUNNEL_REMOTE_PORT=${SSH_TUNNEL_REMOTE_PORT:-3306}

# 경로 확장 (~ -> 홈 디렉토리)
SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"

# SSH 키 파일 확인
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "❌ SSH 키 파일을 찾을 수 없습니다: $SSH_KEY_PATH"
    echo ""
    echo "다음 중 하나를 확인하세요:"
    echo "  1. .env 파일에 SSH_KEY_PATH가 올바르게 설정되어 있는지"
    echo "  2. SSH 키 파일이 존재하는지"
    exit 1
fi

# SSH 키 권한 확인 및 설정
chmod 400 "$SSH_KEY_PATH" 2>/dev/null || true

# 기존 터널 확인 및 종료
EXISTING_TUNNEL=$(ps aux | grep "ssh.*$SSH_TUNNEL_LOCAL_PORT.*$SSH_TUNNEL_REMOTE_HOST" | grep -v grep | awk '{print $2}')
if [ ! -z "$EXISTING_TUNNEL" ]; then
    echo "⚠️  기존 SSH 터널이 실행 중입니다 (PID: $EXISTING_TUNNEL)"
    read -p "종료하고 새로 시작하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill $EXISTING_TUNNEL 2>/dev/null || true
        sleep 1
    else
        echo "기존 터널을 유지합니다."
        exit 0
    fi
fi

echo "🔗 SSH 터널 생성 중..."
echo "   로컬 포트: $SSH_TUNNEL_LOCAL_PORT"
echo "   원격 호스트: $SSH_TUNNEL_REMOTE_HOST:$SSH_TUNNEL_REMOTE_PORT"
echo "   EC2 호스트: $EC2_USER@$EC2_HOST"
echo ""

# SSH 터널 생성 (백그라운드)
ssh -i "$SSH_KEY_PATH" \
    -L $SSH_TUNNEL_LOCAL_PORT:$SSH_TUNNEL_REMOTE_HOST:$SSH_TUNNEL_REMOTE_PORT \
    -N -f \
    -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    "$EC2_USER@$EC2_HOST"

if [ $? -eq 0 ]; then
    echo "✅ SSH 터널이 생성되었습니다!"
    echo ""
    echo "터널 상태 확인: ps aux | grep 'ssh.*$SSH_TUNNEL_LOCAL_PORT'"
    echo "터널 종료: ./scripts/stop-ssh-tunnel.sh"
else
    echo "❌ SSH 터널 생성 실패"
    exit 1
fi

