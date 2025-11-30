#!/bin/bash

# 백엔드 HTTPS 설정 스크립트
# 사용법: EC2에 SSH 접속 후 실행
# 
# 사전 준비:
# 1. 도메인 DNS A 레코드가 EC2 Public IP를 가리키고 있어야 함
# 2. EC2 보안 그룹에서 포트 80, 443이 열려있어야 함

set -e

echo "🔒 백엔드 HTTPS 설정 시작..."
echo ""

# 도메인 입력
read -p "도메인을 입력하세요 (예: api.yourdomain.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
  echo "❌ 도메인이 입력되지 않았습니다."
  exit 1
fi

echo "📋 설정할 도메인: $DOMAIN"
echo ""

# DNS 확인
echo "🔍 DNS 확인 중..."
DNS_IP=$(dig +short $DOMAIN | tail -n1)
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "확인 실패")

echo "  도메인 IP: $DNS_IP"
echo "  EC2 Public IP: $EC2_IP"

if [ "$DNS_IP" != "$EC2_IP" ] && [ "$EC2_IP" != "확인 실패" ]; then
  echo "⚠️  경고: 도메인이 EC2 IP를 가리키지 않습니다!"
  echo "  DNS A 레코드를 확인하세요: $DOMAIN → $EC2_IP"
  read -p "계속하시겠습니까? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo ""

# 시스템 업데이트
echo "📦 시스템 업데이트 중..."
sudo apt update && sudo apt upgrade -y

# Nginx 설치
echo "📦 Nginx 설치 중..."
if ! command -v nginx &> /dev/null; then
  sudo apt-get install nginx -y
else
  echo "✅ Nginx가 이미 설치되어 있습니다: $(nginx -v)"
fi

# Nginx 자동 시작 설정
sudo systemctl enable nginx
sudo systemctl start nginx

# Nginx 설정 파일 생성
echo "📝 Nginx 설정 파일 생성 중..."
sudo tee /etc/nginx/sites-available/chalog-backend > /dev/null <<EOF
upstream chalog_backend {
    server localhost:3000;
    keepalive 64;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN;
    
    # Let's Encrypt 인증서 발급을 위한 경로
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # HTTP 요청을 HTTPS로 리다이렉트
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF

# 설정 파일 활성화
echo "🔗 Nginx 설정 파일 활성화 중..."
sudo ln -sf /etc/nginx/sites-available/chalog-backend /etc/nginx/sites-enabled/

# 기본 설정 파일 비활성화
if [ -f /etc/nginx/sites-enabled/default ]; then
  sudo rm /etc/nginx/sites-enabled/default
fi

# 설정 테스트
echo "🧪 Nginx 설정 테스트 중..."
if ! sudo nginx -t; then
  echo "❌ Nginx 설정 오류!"
  exit 1
fi

# Nginx 재시작
echo "🔄 Nginx 재시작 중..."
sudo systemctl restart nginx

# Certbot 설치
echo "📦 Certbot 설치 중..."
if ! command -v certbot &> /dev/null; then
  sudo apt-get install certbot python3-certbot-nginx -y
else
  echo "✅ Certbot이 이미 설치되어 있습니다: $(certbot --version)"
fi

# SSL 인증서 발급
echo ""
echo "🔐 SSL 인증서 발급 중..."
echo "  도메인: $DOMAIN"
echo ""
echo "⚠️  다음 단계에서 이메일 입력이 필요합니다."
echo "  - 인증서 만료 알림용 이메일"
echo "  - 약관 동의: Y"
echo ""

read -p "계속하시겠습니까? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "취소되었습니다."
  exit 0
fi

# Certbot 실행
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

# 자동 갱신 테스트
echo ""
echo "🧪 SSL 인증서 자동 갱신 테스트 중..."
sudo certbot renew --dry-run

echo ""
echo "✅ HTTPS 설정 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. HTTPS Health Check:"
echo "   curl https://$DOMAIN/health"
echo ""
echo "2. Vercel 환경 변수 업데이트:"
echo "   VITE_API_BASE_URL=https://$DOMAIN"
echo ""
echo "3. Vercel 재배포 후 확인"

