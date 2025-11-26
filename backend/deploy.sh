#!/bin/bash

# ChaLog Backend EC2 배포 스크립트
# 사용법: ./deploy.sh [EC2_HOST] [EC2_USER] [SSH_KEY_PATH]

set -e

EC2_HOST=${1:-"your-ec2-host"}
EC2_USER=${2:-"ubuntu"}
SSH_KEY_PATH=${3:-"~/.ssh/your-key.pem"}

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
  --exclude=node_modules

# EC2에 파일 전송
echo "📤 EC2에 파일 전송 중..."
scp -i "$SSH_KEY_PATH" deploy.tar.gz "$EC2_USER@$EC2_HOST:/tmp/"

# EC2에서 배포 실행
echo "🔧 EC2에서 배포 실행 중..."
ssh -i "$SSH_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
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
echo "🌐 Health Check: http://$EC2_HOST:3000/health"

