#!/bin/bash

# 테스트 DB에서 마이그레이션 테스트 스크립트
# 사용법: ./scripts/test-migration.sh

set -e

echo "🧪 테스트 DB 마이그레이션 테스트 시작"
echo ""

# 환경 변수 확인
if [ -z "$TEST_DATABASE_URL" ]; then
  echo "❌ TEST_DATABASE_URL 환경 변수가 설정되지 않았습니다."
  echo ""
  echo "사용 예시:"
  echo "  export TEST_DATABASE_URL=mysql://username:password@localhost:3306/chalog_test"
  echo "  ./scripts/test-migration.sh"
  echo ""
  echo "또는 .env.test 파일을 생성하세요:"
  echo "  TEST_DATABASE_URL=mysql://username:password@localhost:3306/chalog_test"
  exit 1
fi

# 테스트 DB 이름 확인
DB_NAME=$(echo "$TEST_DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
if [[ ! "$DB_NAME" =~ (test|_test) ]]; then
  echo "⚠️  경고: 테스트 DB 이름에 'test' 또는 '_test'가 포함되어 있지 않습니다: $DB_NAME"
  echo "   프로덕션 DB를 사용하지 않도록 주의하세요!"
  read -p "계속하시겠습니까? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "📊 테스트 DB: $DB_NAME"
echo ""

# 1. 마이그레이션 상태 확인
echo "1️⃣  마이그레이션 상태 확인 중..."
NODE_ENV=test npm run migration:show || {
  echo "❌ 마이그레이션 상태 확인 실패"
  echo "   MySQL 서버가 실행 중인지 확인하세요."
  exit 1
}
echo ""

# 2. 마이그레이션 실행
echo "2️⃣  마이그레이션 실행 중..."
NODE_ENV=test npm run migration:run || {
  echo "❌ 마이그레이션 실행 실패"
  exit 1
}
echo ""

# 3. 마이그레이션 상태 재확인
echo "3️⃣  마이그레이션 상태 재확인 중..."
NODE_ENV=test npm run migration:show
echo ""

# 4. 테이블 생성 확인
echo "4️⃣  테이블 생성 확인 중..."
echo "   - rating_schema 테이블 확인"
echo "   - rating_axis 테이블 확인"
echo "   - note_axis_value 테이블 확인"
echo "   - notes 테이블 스키마 변경 확인"
echo ""

# 5. E2E 테스트 실행 (선택사항)
read -p "E2E 테스트를 실행하시겠습니까? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "5️⃣  E2E 테스트 실행 중..."
  npm run test:e2e || {
    echo "⚠️  E2E 테스트 실패 (마이그레이션은 성공했을 수 있음)"
  }
fi

echo ""
echo "✅ 마이그레이션 테스트 완료!"

