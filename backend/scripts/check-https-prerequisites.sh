#!/bin/bash

# HTTPS 설정 전 사전 조건 확인 스크립트
# EC2에서 실행하여 필요한 설정이 모두 되어있는지 확인

set -e

echo "🔍 HTTPS 설정 사전 조건 확인"
echo "================================"
echo ""

# 1. EC2 Public IP 확인
echo "1️⃣ EC2 Public IP 확인:"
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "확인 실패")
echo "   EC2 Public IP: $EC2_IP"
echo ""

# 2. 백엔드 서버 상태 확인
echo "2️⃣ 백엔드 서버 상태 확인:"
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
  echo "   ✅ 백엔드 서버 실행 중 (포트 3000)"
else
  echo "   ❌ 백엔드 서버가 실행되지 않음"
  echo "   해결: pm2 start ecosystem.config.js"
fi
echo ""

# 3. Nginx 설치 확인
echo "3️⃣ Nginx 설치 확인:"
if command -v nginx &> /dev/null; then
  echo "   ✅ Nginx 설치됨: $(nginx -v 2>&1 | head -1)"
else
  echo "   ⚠️  Nginx 미설치 (설정 스크립트에서 자동 설치됨)"
fi
echo ""

# 4. Certbot 설치 확인
echo "4️⃣ Certbot 설치 확인:"
if command -v certbot &> /dev/null; then
  echo "   ✅ Certbot 설치됨: $(certbot --version 2>&1 | head -1)"
else
  echo "   ⚠️  Certbot 미설치 (설정 스크립트에서 자동 설치됨)"
fi
echo ""

# 5. 포트 확인
echo "5️⃣ 포트 상태 확인:"
if sudo netstat -tlnp 2>/dev/null | grep -q ":80 "; then
  echo "   ✅ 포트 80 사용 중"
else
  echo "   ⚠️  포트 80 미사용 (Nginx 설치 후 사용됨)"
fi

if sudo netstat -tlnp 2>/dev/null | grep -q ":443 "; then
  echo "   ✅ 포트 443 사용 중"
else
  echo "   ⚠️  포트 443 미사용 (SSL 인증서 발급 후 사용됨)"
fi
echo ""

# 6. 보안 그룹 안내
echo "6️⃣ EC2 보안 그룹 확인 필요:"
echo "   AWS 콘솔 → EC2 → Security Groups에서 확인:"
echo "   - HTTP (80) - 0.0.0.0/0 ✅"
echo "   - HTTPS (443) - 0.0.0.0/0 ✅"
echo ""

# 7. 도메인 확인
echo "7️⃣ 도메인 설정 필요:"
echo "   도메인 DNS 관리 페이지에서:"
echo "   - A 레코드: api.yourdomain.com → $EC2_IP"
echo "   - DNS 전파 확인: nslookup api.yourdomain.com"
echo ""

echo "================================"
echo "✅ 사전 조건 확인 완료"
echo ""
echo "다음 단계:"
echo "1. 도메인 DNS A 레코드 설정"
echo "2. DNS 전파 확인 (5-10분 소요)"
echo "3. HTTPS 설정 스크립트 실행: bash setup-https.sh"

