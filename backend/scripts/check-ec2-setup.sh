#!/bin/bash

# EC2 설정 확인 스크립트
# 사용법: EC2에 SSH 접속 후 실행
# bash check-ec2-setup.sh

echo "🔍 EC2 설정 확인 중..."
echo ""

# Node.js 확인
echo "📦 Node.js:"
if command -v node &> /dev/null; then
  echo "  ✅ 설치됨: $(node --version)"
else
  echo "  ❌ 설치되지 않음"
fi

# npm 확인
echo "📦 npm:"
if command -v npm &> /dev/null; then
  echo "  ✅ 설치됨: $(npm --version)"
else
  echo "  ❌ 설치되지 않음"
fi

# PM2 확인
echo "📦 PM2:"
if command -v pm2 &> /dev/null; then
  echo "  ✅ 설치됨: $(pm2 --version)"
  echo "  📊 실행 중인 프로세스:"
  pm2 list || echo "    실행 중인 프로세스 없음"
else
  echo "  ❌ 설치되지 않음"
fi

# 프로젝트 디렉토리 확인
echo "📁 프로젝트 디렉토리:"
if [ -d "/home/ubuntu/chalog-backend" ]; then
  echo "  ✅ 존재함: /home/ubuntu/chalog-backend"
  echo "  📊 디렉토리 내용:"
  ls -la /home/ubuntu/chalog-backend/ | head -10
else
  echo "  ❌ 존재하지 않음"
fi

# .env 파일 확인
echo "📝 .env 파일:"
if [ -f "/home/ubuntu/chalog-backend/.env" ]; then
  echo "  ✅ 존재함"
  echo "  ⚠️  민감한 정보는 표시하지 않습니다."
  if grep -q "your-rds-endpoint\|your-production-secret-key\|change-this" /home/ubuntu/chalog-backend/.env; then
    echo "  ⚠️  .env 파일에 기본값이 있습니다. 실제 값으로 수정하세요!"
  else
    echo "  ✅ .env 파일이 설정되어 있습니다."
  fi
else
  echo "  ❌ 존재하지 않음"
fi

# 백업 디렉토리 확인
echo "💾 백업 디렉토리:"
if [ -d "/home/ubuntu/backups" ]; then
  echo "  ✅ 존재함: /home/ubuntu/backups"
  BACKUP_COUNT=$(ls -1 /home/ubuntu/backups/*.tar.gz 2>/dev/null | wc -l)
  echo "  📊 백업 파일 수: $BACKUP_COUNT"
else
  echo "  ❌ 존재하지 않음"
fi

# 포트 확인
echo "🌐 포트 3000:"
if sudo netstat -tlnp 2>/dev/null | grep -q ":3000"; then
  echo "  ✅ 포트 3000이 사용 중입니다"
  sudo netstat -tlnp 2>/dev/null | grep ":3000"
else
  echo "  ⚠️  포트 3000이 사용되지 않습니다 (앱이 실행되지 않음)"
fi

# Health check
echo "🏥 Health Check:"
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
  echo "  ✅ 백엔드가 정상 작동 중입니다"
  curl -s http://localhost:3000/health | head -5
else
  echo "  ⚠️  백엔드에 연결할 수 없습니다"
fi

echo ""
echo "✅ 확인 완료!"

