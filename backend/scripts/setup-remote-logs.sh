#!/bin/bash

# 원격 Lightsail에 로그 관리(pm2-logrotate, logrotate) 설정
# backend/.env의 SSH_KEY_PATH, LIGHTSAIL_HOST, LIGHTSAIL_USER 사용 (EC2_* 호환)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_ENV="$BACKEND_DIR/.env"

# .env에서 SSH 설정 읽기
if [ -f "$BACKEND_ENV" ]; then
  SSH_KEY_PATH=$(grep "^SSH_KEY_PATH=" "$BACKEND_ENV" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
  LIGHTSAIL_HOST=$(grep "^LIGHTSAIL_HOST=" "$BACKEND_ENV" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || grep "^EC2_HOST=" "$BACKEND_ENV" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
  LIGHTSAIL_USER=$(grep "^LIGHTSAIL_USER=" "$BACKEND_ENV" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || grep "^EC2_USER=" "$BACKEND_ENV" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "ubuntu")
fi

SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"

if [ -z "$SSH_KEY_PATH" ] || [ -z "$LIGHTSAIL_HOST" ]; then
  echo "❌ SSH_KEY_PATH, LIGHTSAIL_HOST(또는 EC2_HOST)가 .env에 설정되어 있어야 합니다."
  exit 1
fi

if [ ! -f "$SSH_KEY_PATH" ]; then
  echo "❌ SSH 키 파일을 찾을 수 없습니다: $SSH_KEY_PATH"
  exit 1
fi

echo "📡 원격 서버: $LIGHTSAIL_USER@$LIGHTSAIL_HOST"
echo ""

# 1. pm2-logrotate 설치 및 설정
echo "📦 [1/2] pm2-logrotate 설치 및 설정..."
ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$LIGHTSAIL_USER@$LIGHTSAIL_HOST" 'bash -s' << 'ENDSSH'
  pm2 install pm2-logrotate 2>/dev/null || true
  pm2 set pm2-logrotate:max_size 10M
  pm2 set pm2-logrotate:retain 7
  pm2 set pm2-logrotate:compress true
  pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
  pm2 save
  echo "✅ pm2-logrotate 설정 완료"
ENDSSH

# 2. logrotate 설정 파일 복사 및 적용
echo ""
echo "📋 [2/2] Linux logrotate 설정..."
scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no \
  "$SCRIPT_DIR/logrotate-pm2-chalog.conf" \
  "$LIGHTSAIL_USER@$LIGHTSAIL_HOST:/tmp/logrotate-pm2-chalog.conf"

ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$LIGHTSAIL_USER@$LIGHTSAIL_HOST" \
  'sudo cp /tmp/logrotate-pm2-chalog.conf /etc/logrotate.d/pm2-chalog-backend && rm /tmp/logrotate-pm2-chalog.conf'

echo "✅ logrotate 설정 완료 (/etc/logrotate.d/pm2-chalog-backend)"
echo ""
echo "✅ 원격 로그 관리 설정이 완료되었습니다."
