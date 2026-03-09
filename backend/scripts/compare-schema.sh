#!/bin/bash

# 스키마 비교 스크립트
# 프로덕션 DB: Lightsail Docker MySQL (SSH 터널 경유)
# 테스트 DB: 로컬 MySQL
# 사용법: ./scripts/compare-schema.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# backend/.env 로드
ENV_FILE="$SCRIPT_DIR/../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# .ec2-config 로드 (프로젝트 루트)
EC2_CONFIG="$PROJECT_ROOT/.ec2-config"
if [ -f "$EC2_CONFIG" ]; then
  set -a
  source "$EC2_CONFIG"
  set +a
fi

# 테스트 DB 설정
if [ -z "${TEST_DATABASE_URL:-}" ] && [ -n "${LOCAL_DATABASE_URL:-}" ]; then
  TEST_DATABASE_URL="$LOCAL_DATABASE_URL"
  export TEST_DATABASE_URL
fi

# SSH 연결 정보
SSH_KEY="${LIGHTSAIL_KEY_PATH:-${SSH_KEY_PATH:-}}"
EC2_HOST_ADDR="${EC2_HOST:-3.39.48.139}"
EC2_USER_NAME="${EC2_USER:-ubuntu}"
SSH_TUNNEL_PORT="${SSH_TUNNEL_LOCAL_PORT:-3307}"
EC2_APP_DIR="/home/ubuntu/chalog-backend"

# 필수 값 검증
if [ -z "${TEST_DATABASE_URL:-}" ]; then
  echo "❌ TEST_DATABASE_URL / LOCAL_DATABASE_URL 환경 변수가 설정되지 않았습니다."
  exit 1
fi

if [ -z "$SSH_KEY" ] || [ ! -f "$SSH_KEY" ]; then
  echo "❌ SSH 키 파일을 찾을 수 없습니다: ${SSH_KEY:-미설정}"
  echo "  .ec2-config에 LIGHTSAIL_KEY_PATH 또는 SSH_KEY_PATH를 설정하세요."
  exit 1
fi

echo "🔍 프로덕션 DB와 테스트 DB 스키마 비교 시작..."
echo ""

# Lightsail SSH 연결 테스트
echo "🔗 Lightsail SSH 연결 확인 중 ($EC2_HOST_ADDR)..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no -o LogLevel=QUIET \
    "$EC2_USER_NAME@$EC2_HOST_ADDR" "echo ok" > /dev/null 2>&1; then
  echo "❌ Lightsail SSH 연결 실패: $EC2_HOST_ADDR"
  exit 1
fi
echo "✅ SSH 연결 성공"
echo ""

# Lightsail .env에서 프로덕션 DB URL 가져오기
REMOTE_DB_URL=$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o LogLevel=QUIET \
  "$EC2_USER_NAME@$EC2_HOST_ADDR" \
  "grep '^DATABASE_URL=' $EC2_APP_DIR/.env 2>/dev/null | head -1 | cut -d= -f2-" 2>/dev/null || echo "")

if [ -z "$REMOTE_DB_URL" ]; then
  echo "❌ Lightsail 서버($EC2_APP_DIR/.env)에서 DATABASE_URL을 가져올 수 없습니다."
  exit 1
fi

# DATABASE_URL 파싱 함수
parse_db_url() {
  local url=$1
  echo "$url" | sed -E 's|mysql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+)|\1 \2 \3 \4 \5|'
}

# 프로덕션 DB 크리덴셜 추출
read PROD_USER PROD_PASS PROD_ORIG_HOST PROD_ORIG_PORT PROD_DB <<< "$(parse_db_url "$REMOTE_DB_URL")"

# 테스트 DB 정보 추출
read TEST_USER TEST_PASS TEST_HOST TEST_PORT TEST_DB <<< "$(parse_db_url "$TEST_DATABASE_URL")"

echo "📊 프로덕션 DB: $PROD_DB @ Lightsail($EC2_HOST_ADDR) [SSH 터널 포트: $SSH_TUNNEL_PORT]"
echo "📊 테스트 DB: $TEST_DB @ $TEST_HOST:$TEST_PORT"
echo ""

# SSH 터널 시작 (없으면 자동 시작)
TUNNEL_STARTED=false
EXISTING_TUNNEL=$(lsof -ti:$SSH_TUNNEL_PORT 2>/dev/null || true)
if [ -z "$EXISTING_TUNNEL" ]; then
  echo "🔗 SSH 터널 생성 중 (로컬:$SSH_TUNNEL_PORT → Lightsail:127.0.0.1:3306)..."
  ssh -i "$SSH_KEY" \
    -L "${SSH_TUNNEL_PORT}:127.0.0.1:3306" \
    -N -f \
    -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    "$EC2_USER_NAME@$EC2_HOST_ADDR"
  sleep 2
  TUNNEL_STARTED=true
  echo "✅ SSH 터널 생성 완료"
else
  echo "✅ 기존 SSH 터널 사용 중 (포트: $SSH_TUNNEL_PORT)"
fi
echo ""

# 종료 시 터널 자동 정리
cleanup() {
  if [ "$TUNNEL_STARTED" = "true" ]; then
    echo ""
    echo "🔗 SSH 터널 종료 중..."
    lsof -ti:$SSH_TUNNEL_PORT 2>/dev/null | xargs kill 2>/dev/null || true
    echo "✅ SSH 터널 종료 완료"
  fi
}
trap cleanup EXIT

# 비교할 테이블 목록 (전체)
TABLES=(
  "users"
  "user_authentications"
  "teas"
  "notes"
  "tags"
  "note_tags"
  "note_likes"
  "note_bookmarks"
  "user_onboarding_preferences"
  "rating_schema"
  "rating_axis"
  "note_axis_value"
  "follows"
)

DIFF_FOUND=0

for table in "${TABLES[@]}"; do
  echo "🔍 $table 테이블 비교 중..."

  # 프로덕션 DB 스키마 (SSH 터널 경유)
  PROD_SCHEMA=$(MYSQL_PWD="$PROD_PASS" mysql -h 127.0.0.1 -P "$SSH_TUNNEL_PORT" -u "$PROD_USER" "$PROD_DB" \
    -e "SHOW CREATE TABLE \`$table\`" 2>/dev/null | tail -n 1 | cut -f 2 | \
    sed -E 's/AUTO_INCREMENT=[0-9]+ //g' | \
    sed -E 's/ROW_FORMAT=[A-Z_]+ //g' | \
    sed -E "s/COMMENT='[^']*' //g") || PROD_SCHEMA=""

  # 테스트 DB 스키마
  TEST_SCHEMA=$(MYSQL_PWD="$TEST_PASS" mysql -h "$TEST_HOST" -P "$TEST_PORT" -u "$TEST_USER" "$TEST_DB" \
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
  echo "   프로덕션 마이그레이션 실행: bash scripts/run-remote-migrations.sh"
  echo "   테스트 DB 동기화: npm run migration:run (LOCAL_DATABASE_URL 기준)"
  exit 1
fi
