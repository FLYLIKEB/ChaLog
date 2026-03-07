#!/bin/bash

# 스키마 비교 스크립트
# 사용법: ./scripts/compare-schema.sh

set -e

# .env 자동 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# TEST_DATABASE_URL 미설정 시 LOCAL_DATABASE_URL로 대체
if [ -z "${TEST_DATABASE_URL:-}" ] && [ -n "${LOCAL_DATABASE_URL:-}" ]; then
  TEST_DATABASE_URL="$LOCAL_DATABASE_URL"
  export TEST_DATABASE_URL
fi

echo "🔍 테스트 DB와 프로덕션 DB 스키마 비교 시작..."

# 환경 변수 확인
if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL 환경 변수가 설정되지 않았습니다."
  exit 1
fi

if [ -z "${TEST_DATABASE_URL:-}" ]; then
  echo "❌ TEST_DATABASE_URL / LOCAL_DATABASE_URL 환경 변수가 설정되지 않았습니다."
  exit 1
fi

# DATABASE_URL 파싱 함수
parse_db_url() {
  local url=$1
  echo "$url" | sed -E 's|mysql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)|host=\3 port=\4 user=\1 password=\2 database=\5|'
}

# 프로덕션 DB 정보 추출
PROD_INFO=$(parse_db_url "$DATABASE_URL")
PROD_HOST=$(echo "$PROD_INFO" | sed -n 's/.*host=\([^ ]*\).*/\1/p')
PROD_PORT=$(echo "$PROD_INFO" | sed -n 's/.*port=\([^ ]*\).*/\1/p')
PROD_USER=$(echo "$PROD_INFO" | sed -n 's/.*user=\([^ ]*\).*/\1/p')
PROD_PASS=$(echo "$PROD_INFO" | sed -n 's/.*password=\([^ ]*\).*/\1/p')
PROD_DB=$(echo "$PROD_INFO" | sed -n 's/.*database=\([^ ]*\).*/\1/p')

# 테스트 DB 정보 추출
TEST_INFO=$(parse_db_url "$TEST_DATABASE_URL")
TEST_HOST=$(echo "$TEST_INFO" | sed -n 's/.*host=\([^ ]*\).*/\1/p')
TEST_PORT=$(echo "$TEST_INFO" | sed -n 's/.*port=\([^ ]*\).*/\1/p')
TEST_USER=$(echo "$TEST_INFO" | sed -n 's/.*user=\([^ ]*\).*/\1/p')
TEST_PASS=$(echo "$TEST_INFO" | sed -n 's/.*password=\([^ ]*\).*/\1/p')
TEST_DB=$(echo "$TEST_INFO" | sed -n 's/.*database=\([^ ]*\).*/\1/p')

echo "📊 프로덕션 DB: $PROD_DB @ $PROD_HOST:$PROD_PORT"
echo "📊 테스트 DB: $TEST_DB @ $TEST_HOST:$TEST_PORT"
echo ""

# 테이블 목록 가져오기
TABLES=("users" "user_authentications" "teas" "notes" "tags" "note_tags" "note_likes" "note_bookmarks")

DIFF_FOUND=0

for table in "${TABLES[@]}"; do
  echo "🔍 $table 테이블 비교 중..."
  
  # 프로덕션 DB 스키마 추출 (환경 의존적인 부분 제거)
  PROD_SCHEMA=$(mysql -h "$PROD_HOST" -P "$PROD_PORT" -u "$PROD_USER" -p"$PROD_PASS" "$PROD_DB" \
    -e "SHOW CREATE TABLE \`$table\`" 2>/dev/null | tail -n 1 | cut -f 2 | \
    sed -E 's/AUTO_INCREMENT=[0-9]+ //g' | \
    sed -E 's/ROW_FORMAT=[A-Z_]+ //g' | \
    sed -E "s/COMMENT='[^']*' //g") || PROD_SCHEMA=""
  
  # 테스트 DB 스키마 추출 (환경 의존적인 부분 제거)
  TEST_SCHEMA=$(mysql -h "$TEST_HOST" -P "$TEST_PORT" -u "$TEST_USER" -p"$TEST_PASS" "$TEST_DB" \
    -e "SHOW CREATE TABLE \`$table\`" 2>/dev/null | tail -n 1 | cut -f 2 | \
    sed -E 's/AUTO_INCREMENT=[0-9]+ //g' | \
    sed -E 's/ROW_FORMAT=[A-Z_]+ //g' | \
    sed -E "s/COMMENT='[^']*' //g") || TEST_SCHEMA=""
  
  if [ -z "$PROD_SCHEMA" ] && [ -z "$TEST_SCHEMA" ]; then
    echo "  ⚠️  두 DB 모두에 $table 테이블이 없습니다."
    DIFF_FOUND=1
  elif [ -z "$PROD_SCHEMA" ]; then
    echo "  ❌ 프로덕션 DB에 $table 테이블이 없습니다."
    DIFF_FOUND=1
  elif [ -z "$TEST_SCHEMA" ]; then
    echo "  ❌ 테스트 DB에 $table 테이블이 없습니다."
    DIFF_FOUND=1
  elif [ "$PROD_SCHEMA" != "$TEST_SCHEMA" ]; then
    echo "  ⚠️  $table 테이블 스키마가 다릅니다."
    DIFF_FOUND=1
    
    # 차이점 상세 출력 (선택적)
    if [ "${VERBOSE:-0}" = "1" ]; then
      echo "  프로덕션:"
      echo "$PROD_SCHEMA" | head -5
      echo "  테스트:"
      echo "$TEST_SCHEMA" | head -5
    fi
  else
    echo "  ✅ $table 일치"
  fi
done

echo ""
if [ $DIFF_FOUND -eq 0 ]; then
  echo "✅ 모든 테이블 스키마가 일치합니다."
else
  echo "⚠️  스키마 차이가 발견되었습니다."
  echo "💡 해결 방법:"
  echo "   1. 테스트 DB 동기화: TEST_DATABASE_URL=... ./scripts/sync-schema.sh test"
  echo "   2. 프로덕션 DB 동기화: DATABASE_URL=... ./scripts/sync-schema.sh prod"
  exit 1
fi

