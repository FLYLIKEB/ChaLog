#!/bin/bash

# SSH 터널 종료 스크립트

# .env 파일 로드
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

SSH_TUNNEL_LOCAL_PORT=${SSH_TUNNEL_LOCAL_PORT:-3307}
SSH_TUNNEL_REMOTE_HOST=${SSH_TUNNEL_REMOTE_HOST:-}

# 필수 환경 변수 확인
if [ -z "$SSH_TUNNEL_REMOTE_HOST" ]; then
    echo "❌ SSH_TUNNEL_REMOTE_HOST 환경 변수가 설정되지 않았습니다."
    echo ".env 파일에 SSH_TUNNEL_REMOTE_HOST를 설정하세요."
    exit 1
fi

# 실행 중인 SSH 터널 찾기
TUNNEL_PIDS=$(ps aux | grep "ssh.*$SSH_TUNNEL_LOCAL_PORT.*$SSH_TUNNEL_REMOTE_HOST" | grep -v grep | awk '{print $2}')

if [ -z "$TUNNEL_PIDS" ]; then
    echo "ℹ️  실행 중인 SSH 터널이 없습니다."
    exit 0
fi

echo "🛑 SSH 터널 종료 중..."
for PID in $TUNNEL_PIDS; do
    kill "$PID" 2>/dev/null && echo "   터널 종료됨 (PID: $PID)" || echo "   터널 종료 실패 (PID: $PID)"
done

sleep 1

# 확인
REMAINING=$(ps aux | grep "ssh.*$SSH_TUNNEL_LOCAL_PORT.*$SSH_TUNNEL_REMOTE_HOST" | grep -v grep | wc -l)
if [ "$REMAINING" -eq 0 ]; then
    echo "✅ 모든 SSH 터널이 종료되었습니다."
else
    echo "⚠️  일부 터널이 아직 실행 중입니다."
fi

