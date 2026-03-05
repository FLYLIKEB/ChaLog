#!/bin/bash

# Lightsail Nginx 설정 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

LIGHTSAIL_IP="${1:-3.39.48.139}"
SSH_KEY="${SSH_KEY_PATH:-LightsailDefaultKey-ap-northeast-2.pem}"

echo -e "${BLUE}🌐 Lightsail Nginx 설정${NC}"
echo "Lightsail IP: $LIGHTSAIL_IP"
echo ""

# SSH 키 경로 확인
if [[ "$SSH_KEY" == ~* ]]; then
    SSH_KEY="${SSH_KEY/#\~/$HOME}"
fi

if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH 키 파일을 찾을 수 없습니다: $SSH_KEY${NC}"
    exit 1
fi

echo -e "${BLUE}📋 1단계: Nginx 설치 확인${NC}"
ssh -i "$SSH_KEY" ubuntu@$LIGHTSAIL_IP << 'ENDSSH'
if command -v nginx &> /dev/null; then
    echo "✅ Nginx 이미 설치됨: $(nginx -v 2>&1)"
else
    echo "📦 Nginx 설치 중..."
    sudo apt-get update
    sudo apt-get install -y nginx
    echo "✅ Nginx 설치 완료"
fi
ENDSSH

echo ""
echo -e "${BLUE}📋 2단계: Nginx 설정 파일 생성${NC}"
ssh -i "$SSH_KEY" ubuntu@$LIGHTSAIL_IP << ENDSSH
sudo tee /etc/nginx/sites-available/chalog-backend > /dev/null << 'NGINX_CONFIG'
server {
    listen 80;
    server_name $LIGHTSAIL_IP;
    
    # 로그 설정
    access_log /var/log/nginx/chalog-backend-access.log;
    error_log /var/log/nginx/chalog-backend-error.log;
    
    # 클라이언트 최대 본문 크기 (파일 업로드용)
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 타임아웃 설정
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check 엔드포인트 (캐싱 없이)
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        access_log off;
    }
}
NGINX_CONFIG

echo "✅ Nginx 설정 파일 생성 완료"
ENDSSH

echo ""
echo -e "${BLUE}📋 3단계: Nginx 설정 활성화${NC}"
ssh -i "$SSH_KEY" ubuntu@$LIGHTSAIL_IP << 'ENDSSH'
# 기존 심볼릭 링크 제거 (있으면)
sudo rm -f /etc/nginx/sites-enabled/chalog-backend

# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/chalog-backend /etc/nginx/sites-enabled/

# 기본 설정 비활성화 (있으면)
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx 설정 테스트
if sudo nginx -t; then
    echo "✅ Nginx 설정 검증 성공"
else
    echo "❌ Nginx 설정 검증 실패"
    exit 1
fi
ENDSSH

echo ""
echo -e "${BLUE}📋 4단계: Nginx 재시작${NC}"
ssh -i "$SSH_KEY" ubuntu@$LIGHTSAIL_IP << 'ENDSSH'
sudo systemctl restart nginx
sudo systemctl enable nginx

# 상태 확인
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx 실행 중"
else
    echo "❌ Nginx 실행 실패"
    sudo systemctl status nginx
    exit 1
fi
ENDSSH

echo ""
echo -e "${GREEN}✅ Nginx 설정 완료!${NC}"
echo ""
echo "다음 단계:"
echo "1. Health check 확인: http://$LIGHTSAIL_IP/health"
echo "2. API 엔드포인트 테스트: http://$LIGHTSAIL_IP/api/..."
echo "3. Nginx 로그 확인: sudo tail -f /var/log/nginx/chalog-backend-error.log"
