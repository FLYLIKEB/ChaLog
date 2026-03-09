#!/bin/bash

# ChaLog Backend Lightsail 배포 스크립트
# 사용법: ./deploy.sh [LIGHTSAIL_HOST] [LIGHTSAIL_USER] [SSH_KEY_PATH]

set -e

LIGHTSAIL_HOST=${1:-"your-lightsail-ip"}
LIGHTSAIL_USER=${2:-"ubuntu"}
SSH_KEY_PATH=${3:-"~/.ssh/your-key.pem"}

# 인자 미지정 시 .env에서 읽기 (LIGHTSAIL_* 또는 EC2_* 호환)
if [ "$LIGHTSAIL_HOST" = "your-lightsail-ip" ] && [ -f .env ]; then
  LIGHTSAIL_HOST=$(grep -E "^LIGHTSAIL_HOST=|^EC2_HOST=" .env 2>/dev/null | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
  LIGHTSAIL_USER=$(grep -E "^LIGHTSAIL_USER=|^EC2_USER=" .env 2>/dev/null | head -1 | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "ubuntu")
  SSH_KEY_PATH=$(grep "^SSH_KEY_PATH=" .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "$SSH_KEY_PATH")
fi
SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"

echo "🚀 ChaLog Backend 배포 시작..."

# 빌드
echo "📦 프로젝트 빌드 중..."
npm run build

# 배포 파일 준비
echo "📋 배포 파일 준비 중..."
tar -czf deploy.tar.gz \
  dist/ \
  package.json \
  package-lock.json \
  ecosystem.config.js \
  scripts/ \
  --exclude=node_modules

# Lightsail에 파일 전송
echo "📤 Lightsail에 파일 전송 중..."
scp -i "$SSH_KEY_PATH" deploy.tar.gz "$LIGHTSAIL_USER@$LIGHTSAIL_HOST:/tmp/"

# Lightsail에서 배포 실행
echo "🔧 Lightsail에서 배포 실행 중..."
ssh -i "$SSH_KEY_PATH" "$LIGHTSAIL_USER@$LIGHTSAIL_HOST" << 'ENDSSH'
  cd /home/ubuntu/chalog-backend || mkdir -p /home/ubuntu/chalog-backend && cd /home/ubuntu/chalog-backend
  
  # 기존 파일 백업
  if [ -d "dist" ]; then
    echo "💾 기존 파일 백업 중..."
    tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz dist/ package.json ecosystem.config.js 2>/dev/null || true
  fi
  
  # 배포 파일 압축 해제
  echo "📦 배포 파일 압축 해제 중..."
  tar -xzf /tmp/deploy.tar.gz -C /home/ubuntu/chalog-backend
  
  # 의존성 설치
  echo "📥 의존성 설치 중..."
  npm ci --production
  
  # pm2-logrotate 설치 및 설정 (이미 설치되어 있으면 설정만 업데이트)
  echo "📦 pm2-logrotate 설정 중..."
  pm2 install pm2-logrotate 2>/dev/null || true
  pm2 set pm2-logrotate:max_size 10M
  pm2 set pm2-logrotate:retain 7
  pm2 set pm2-logrotate:compress true
  pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
  
  # PM2로 재시작
  echo "🔄 PM2로 앱 재시작 중..."
  pm2 delete chalog-backend 2>/dev/null || true
  pm2 start ecosystem.config.js
  pm2 save
  
  # 로그 확인
  echo "📊 배포 완료! 로그 확인:"
  pm2 logs chalog-backend --lines 10
  
  # 정리
  rm -f /tmp/deploy.tar.gz
ENDSSH

# 로컬 정리
rm -f deploy.tar.gz

echo "✅ 배포 완료!"
echo "🌐 Health Check: http://$LIGHTSAIL_HOST:3000/health"

