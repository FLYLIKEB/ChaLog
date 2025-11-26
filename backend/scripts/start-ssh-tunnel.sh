#!/bin/bash

# SSH 터널 시작 스크립트
# .env 파일의 환경 변수를 사용하여 SSH 터널을 생성합니다.

set -e

# .env 파일 로드
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# 환경 변수 기본값 설정
SSH_KEY_PATH=${SSH_KEY_PATH:-}
EC2_HOST=${EC2_HOST:-}
EC2_USER=${EC2_USER:-}
SSH_TUNNEL_LOCAL_PORT=${SSH_TUNNEL_LOCAL_PORT:-3307}
SSH_TUNNEL_REMOTE_HOST=${SSH_TUNNEL_REMOTE_HOST:-}
SSH_TUNNEL_REMOTE_PORT=${SSH_TUNNEL_REMOTE_PORT:-3306}

# 필수 환경 변수 확인
if [ -z "$SSH_KEY_PATH" ] || [ -z "$EC2_HOST" ] || [ -z "$EC2_USER" ] || [ -z "$SSH_TUNNEL_REMOTE_HOST" ]; then
    echo "❌ 필수 환경 변수가 설정되지 않았습니다."
    echo ""
    echo ".env 파일에 다음 변수들을 설정하세요:"
    echo "  - SSH_KEY_PATH"
    echo "  - EC2_HOST"
    echo "  - EC2_USER"
    echo "  - SSH_TUNNEL_REMOTE_HOST"
    exit 1
fi

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
if [ -n "$EXISTING_TUNNEL" ]; then
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
# 주의: StrictHostKeyChecking=no는 개발 환경에서만 사용하세요.
# 프로덕션 환경에서는 호스트 키 검증을 강제해야 합니다.
# 더 안전한 방법: ssh-keyscan으로 known_hosts를 미리 설정하거나
# DEV 환경 변수를 통해 제어하세요.
SSH_OPTS="-o ServerAliveInterval=60 -o ServerAliveCountMax=3"
if [ "${DEV:-0}" = "1" ] || [ "${NODE_ENV:-development}" = "development" ]; then
    # 개발 환경: 호스트 키 검증 비활성화 (보안 위험 있음)
    SSH_OPTS="$SSH_OPTS -o StrictHostKeyChecking=no"
    echo "⚠️  개발 모드: 호스트 키 검증이 비활성화되었습니다."
else
    # 프로덕션 환경: 호스트 키 검증 강제
    SSH_OPTS="$SSH_OPTS -o StrictHostKeyChecking=yes"
fi

ssh -i "$SSH_KEY_PATH" \
    -L "${SSH_TUNNEL_LOCAL_PORT}:${SSH_TUNNEL_REMOTE_HOST}:${SSH_TUNNEL_REMOTE_PORT}" \
    -N -f \
    $SSH_OPTS \
    "${EC2_USER}@${EC2_HOST}"

if [ $? -eq 0 ]; then
    echo "✅ SSH 터널이 생성되었습니다!"
    echo ""
    echo "터널 상태 확인: ps aux | grep 'ssh.*$SSH_TUNNEL_LOCAL_PORT'"
    echo "터널 종료: ./scripts/stop-ssh-tunnel.sh"
else
    echo "❌ SSH 터널 생성 실패"
    exit 1
fi

