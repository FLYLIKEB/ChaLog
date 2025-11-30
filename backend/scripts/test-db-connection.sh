#!/bin/bash

# 데이터베이스 연결 테스트 스크립트

set -e

echo "🔍 데이터베이스 연결 테스트"
echo ""

# .env 파일 로드
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# DATABASE_URL 파싱
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL이 설정되지 않았습니다."
    exit 1
fi

# Node.js를 사용하여 DATABASE_URL 파싱 (특수 문자, IPv6, 쿼리 파라미터 지원)
# URL 클래스를 사용하여 견고하게 파싱
PARSED=$(node -e "
try {
  const url = new URL(process.env.DATABASE_URL);
  if (url.protocol !== 'mysql:') {
    throw new Error('Invalid protocol');
  }
  const hostname = url.hostname || '';
  const port = url.port || '3306';
  const username = url.username || '';
  const password = url.password || '';
  const database = url.pathname.slice(1).split('?')[0] || '';
  
  // URL 디코딩
  const decodedPassword = decodeURIComponent(password);
  const decodedDatabase = decodeURIComponent(database);
  
  console.log('HOST=' + hostname);
  console.log('PORT=' + port);
  console.log('USER=' + username);
  console.log('PASSWORD=' + decodedPassword);
  console.log('DATABASE=' + decodedDatabase);
} catch (error) {
  console.error('DATABASE_URL 파싱 실패:', error.message);
  process.exit(1);
}
")

if [ $? -ne 0 ]; then
    echo "❌ DATABASE_URL 파싱 실패"
    exit 1
fi

# 파싱된 값을 환경 변수로 설정
eval "$PARSED"

# 필수 값 검증
if [ -z "$HOST" ] || [ -z "$USER" ] || [ -z "$DATABASE" ]; then
    echo "❌ DATABASE_URL에 필수 정보가 누락되었습니다."
    exit 1
fi

# 변수명 통일 (기존 코드와 호환)
DB_HOST="$HOST"
DB_PORT="$PORT"
DB_USER="$USER"
DB_PASS="$PASSWORD"
DB_NAME="$DATABASE"

echo "📊 연결 정보:"
echo "   호스트: $DB_HOST"
echo "   포트: $DB_PORT"
echo "   사용자: $DB_USER"
echo "   데이터베이스: $DB_NAME"
echo ""

# SSH 터널 확인
if [ "$DB_HOST" = "localhost" ] && [ "$DB_PORT" = "3307" ]; then
    echo "🔗 SSH 터널 확인 중..."
    TUNNEL=$(ps aux | grep "ssh.*3307.*database-1" | grep -v grep | wc -l)
    if [ "$TUNNEL" -eq 0 ]; then
        echo "⚠️  SSH 터널이 실행되지 않았습니다."
        echo "   실행: ./scripts/start-ssh-tunnel.sh"
        exit 1
    else
        echo "✅ SSH 터널이 실행 중입니다."
    fi
fi

# 연결 테스트
echo ""
echo "🔌 연결 테스트 중..."
# 비밀번호를 환경 변수로 전달하여 ps 출력에 노출되지 않도록 함
export MYSQL_PWD="$DB_PASS"
if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -e "SELECT 1 as test;" "$DB_NAME" 2>&1 | grep -q "test"; then
    echo "✅ 데이터베이스 연결 성공!"
    echo ""
    echo "📋 데이터베이스 정보:"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -e "SELECT USER(), DATABASE();" "$DB_NAME" 2>/dev/null
else
    echo "❌ 데이터베이스 연결 실패"
    echo ""
    echo "가능한 원인:"
    echo "1. SSH 터널이 실행되지 않음 (로컬 연결 시)"
    echo "2. 비밀번호가 잘못됨"
    echo "3. 보안 그룹 설정 문제 (직접 연결 시)"
    echo "4. 네트워크 연결 문제"
    exit 1
fi
unset MYSQL_PWD

