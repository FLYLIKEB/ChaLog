#!/bin/bash

# PM2 로그 로테이션 설정
# Lightsail에서 1회 실행: ./scripts/setup-pm2-logrotate.sh

set -e

echo "📦 pm2-logrotate 설치 중..."
pm2 install pm2-logrotate

echo "⚙️ pm2-logrotate 설정 중..."
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'  # 매일 자정

pm2 save

echo "✅ pm2-logrotate 설정 완료"
