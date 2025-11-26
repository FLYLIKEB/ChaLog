#!/bin/bash

# EC2 초기 설정 스크립트
# 사용법: EC2에 SSH 접속 후 실행
# curl -fsSL https://raw.githubusercontent.com/your-repo/ChaLog/main/backend/scripts/setup-ec2.sh | bash
# 또는
# wget -O- https://raw.githubusercontent.com/your-repo/ChaLog/main/backend/scripts/setup-ec2.sh | bash

set -e

echo "🚀 EC2 초기 설정 시작..."

# 시스템 업데이트
echo "📦 시스템 업데이트 중..."
sudo apt update && sudo apt upgrade -y

# Node.js 20 설치
echo "📦 Node.js 20 설치 중..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "✅ Node.js가 이미 설치되어 있습니다: $(node --version)"
fi

# PM2 설치
echo "📦 PM2 설치 중..."
if ! command -v pm2 &> /dev/null; then
  sudo npm install -g pm2
else
  echo "✅ PM2가 이미 설치되어 있습니다: $(pm2 --version)"
fi

# PM2 부팅 시 자동 시작 설정
echo "⚙️ PM2 부팅 시 자동 시작 설정 중..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu || echo "PM2 startup 명령어를 수동으로 실행해야 할 수 있습니다."

# 프로젝트 디렉토리 생성
echo "📁 프로젝트 디렉토리 생성 중..."
mkdir -p /home/ubuntu/chalog-backend
mkdir -p /home/ubuntu/backups

# .env 파일 템플릿 생성 (없는 경우)
if [ ! -f /home/ubuntu/chalog-backend/.env ]; then
  echo "📝 .env 파일 템플릿 생성 중..."
  cat > /home/ubuntu/chalog-backend/.env << 'EOF'
# 데이터베이스 연결 (RDS 직접 연결)
DATABASE_URL=mysql://admin:password@your-rds-endpoint.rds.amazonaws.com:3306/chalog
DB_SYNCHRONIZE=false
DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=false

# JWT 설정
JWT_SECRET=your-production-secret-key-change-this
JWT_EXPIRES_IN=7d

# 서버 설정
PORT=3000
NODE_ENV=production

# 프론트엔드 URL
FRONTEND_URL=https://cha-log-gilt.vercel.app
FRONTEND_URLS=https://cha-log-gilt.vercel.app,http://localhost:5173
EOF
  echo "⚠️  /home/ubuntu/chalog-backend/.env 파일을 수정하여 실제 값으로 설정하세요!"
else
  echo "✅ .env 파일이 이미 존재합니다."
fi

# curl 설치 확인 (Health check용)
if ! command -v curl &> /dev/null; then
  echo "📦 curl 설치 중..."
  sudo apt-get install -y curl
fi

echo ""
echo "✅ EC2 초기 설정 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. .env 파일 수정: nano /home/ubuntu/chalog-backend/.env"
echo "2. GitHub Actions Secrets 설정 (EC2_SSH_KEY, EC2_HOST, EC2_USER)"
echo "3. main 브랜치에 backend/ 변경사항 푸시하여 배포 테스트"
echo ""
echo "🔍 확인 사항:"
echo "- Node.js 버전: $(node --version)"
echo "- npm 버전: $(npm --version)"
echo "- PM2 버전: $(pm2 --version)"
echo "- 프로젝트 디렉토리: /home/ubuntu/chalog-backend"

