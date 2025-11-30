#!/bin/bash

# 인증 API 테스트 스크립트
# 사용법: ./scripts/test-auth-api.sh

API_URL="http://localhost:3000"

echo "🧪 인증 API 테스트 시작..."
echo ""

# Health Check
echo "1️⃣ Health Check..."
HEALTH=$(curl -s "$API_URL/health")
if [ $? -eq 0 ]; then
  echo "✅ 백엔드 서버 연결 성공"
  echo "$HEALTH" | jq . 2>/dev/null || echo "$HEALTH"
else
  echo "❌ 백엔드 서버에 연결할 수 없습니다"
  echo "   백엔드 서버가 실행 중인지 확인하세요: cd backend && npm run start:dev"
  exit 1
fi
echo ""

# 회원가입 테스트
echo "2️⃣ 회원가입 테스트..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_'$(date +%s)'@example.com",
    "name": "테스트 사용자",
    "password": "password123"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "access_token"; then
  echo "✅ 회원가입 성공"
  echo "$REGISTER_RESPONSE" | jq . 2>/dev/null || echo "$REGISTER_RESPONSE"
  
  # 토큰 추출
  TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.access_token' 2>/dev/null)
  EMAIL=$(echo "$REGISTER_RESPONSE" | jq -r '.user.email' 2>/dev/null)
else
  echo "❌ 회원가입 실패"
  echo "$REGISTER_RESPONSE" | jq . 2>/dev/null || echo "$REGISTER_RESPONSE"
  exit 1
fi
echo ""

# 로그인 테스트
echo "3️⃣ 로그인 테스트..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'"$EMAIL"'",
    "password": "password123"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
  echo "✅ 로그인 성공"
  echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"
  
  # 새 토큰 추출
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token' 2>/dev/null)
else
  echo "❌ 로그인 실패"
  echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"
  exit 1
fi
echo ""

# 프로필 조회 테스트
if [ -n "$TOKEN" ]; then
  echo "4️⃣ 프로필 조회 테스트..."
  PROFILE_RESPONSE=$(curl -s -X POST "$API_URL/auth/profile" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  
  if echo "$PROFILE_RESPONSE" | grep -q "userId"; then
    echo "✅ 프로필 조회 성공"
    echo "$PROFILE_RESPONSE" | jq . 2>/dev/null || echo "$PROFILE_RESPONSE"
  else
    echo "❌ 프로필 조회 실패"
    echo "$PROFILE_RESPONSE" | jq . 2>/dev/null || echo "$PROFILE_RESPONSE"
  fi
  echo ""
fi

# 카카오 로그인 엔드포인트 확인 (실제 토큰 없이 구조만 확인)
echo "5️⃣ 카카오 로그인 엔드포인트 확인..."
KAKAO_RESPONSE=$(curl -s -X POST "$API_URL/auth/kakao" \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "invalid_token_for_testing"
  }')

# 카카오 API 오류는 정상 (엔드포인트가 존재하는지만 확인)
if echo "$KAKAO_RESPONSE" | grep -q "카카오"; then
  echo "✅ 카카오 로그인 엔드포인트 존재 (토큰 오류는 정상)"
else
  echo "⚠️  카카오 로그인 엔드포인트 응답:"
  echo "$KAKAO_RESPONSE" | jq . 2>/dev/null || echo "$KAKAO_RESPONSE"
fi
echo ""

echo "🎉 테스트 완료!"
echo ""
echo "📝 다음 단계:"
echo "   1. 프론트엔드 서버 실행: npm run dev"
echo "   2. 브라우저에서 http://localhost:5173 접속"
echo "   3. 로그인 페이지에서 카카오 로그인 테스트"

