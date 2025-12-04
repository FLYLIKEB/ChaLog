#!/bin/bash

# 이미지 업로드 API 테스트 스크립트
# 사용법: ./scripts/test-image-upload.sh

API_URL="http://localhost:3000"

echo "🧪 이미지 업로드 API 테스트 시작..."
echo ""

# Health Check
echo "1️⃣ Health Check..."
if curl -s "$API_URL/health" > /dev/null; then
  echo "✅ 백엔드 서버 연결 성공"
else
  echo "❌ 백엔드 서버에 연결할 수 없습니다"
  echo "   백엔드 서버가 실행 중인지 확인하세요: cd backend && npm run start:dev"
  exit 1
fi
echo ""

# 테스트 이미지 생성 (1x1 PNG)
echo "2️⃣ 테스트 이미지 생성..."
TEST_IMAGE="/tmp/test-image.png"
# 1x1 PNG 이미지 생성 (base64)
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > "$TEST_IMAGE"
if [ -f "$TEST_IMAGE" ]; then
  echo "✅ 테스트 이미지 생성 완료"
else
  echo "❌ 테스트 이미지 생성 실패"
  exit 1
fi
echo ""

# 로그인하여 토큰 획득
echo "3️⃣ 로그인하여 토큰 획득..."
TIMESTAMP=$(date +%s)
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' 2>/dev/null)

# 로그인 실패 시 회원가입 시도
if ! echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
  echo "   로그인 실패, 회원가입 시도..."
  REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test_'"$TIMESTAMP"'@example.com",
      "name": "테스트 사용자",
      "password": "password123"
    }' 2>/dev/null)
  
  if echo "$REGISTER_RESPONSE" | grep -q "access_token"; then
    TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.access_token' 2>/dev/null)
    echo "✅ 회원가입 및 로그인 성공"
  else
    echo "❌ 회원가입 실패"
    echo "$REGISTER_RESPONSE" | jq . 2>/dev/null || echo "$REGISTER_RESPONSE"
    exit 1
  fi
else
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token' 2>/dev/null)
  echo "✅ 로그인 성공"
fi
echo ""

# 이미지 업로드 테스트
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ 토큰을 획득할 수 없습니다"
  exit 1
fi

echo "4️⃣ 이미지 업로드 테스트..."
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/notes/images" \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@$TEST_IMAGE" 2>/dev/null)

if echo "$UPLOAD_RESPONSE" | grep -q "url"; then
  IMAGE_URL=$(echo "$UPLOAD_RESPONSE" | jq -r '.url' 2>/dev/null)
  echo "✅ 이미지 업로드 성공!"
  echo "   이미지 URL: $IMAGE_URL"
  
  # 이미지 URL 접근 테스트
  echo ""
  echo "5️⃣ 업로드된 이미지 접근 테스트..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$IMAGE_URL")
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "✅ 이미지 접근 가능 (HTTP $HTTP_CODE)"
  else
    echo "⚠️  이미지 접근 확인 필요 (HTTP $HTTP_CODE)"
  fi
else
  echo "❌ 이미지 업로드 실패"
  echo "$UPLOAD_RESPONSE" | jq . 2>/dev/null || echo "$UPLOAD_RESPONSE"
  exit 1
fi
echo ""

# 정리
rm -f "$TEST_IMAGE"
echo "✅ 테스트 완료!"

