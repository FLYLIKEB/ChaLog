#!/bin/bash

# RDS 데이터베이스 확인 및 생성 스크립트
# 사용법: ./scripts/check-database.sh
# 주의: SSH 터널이 실행 중이어야 합니다 (./scripts/start-ssh-tunnel.sh)

# .env 파일 로드
if [ ! -f .env ]; then
    echo "❌ .env 파일을 찾을 수 없습니다."
    exit 1
fi

# .env 파일을 안전하게 로드
set -a
source .env
set +a

# DATABASE_URL 확인
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL 환경 변수가 설정되지 않았습니다."
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

# 데이터베이스 이름 검증 (SQL injection 방지)
if ! echo "$DATABASE" | grep -qE '^[a-zA-Z0-9_]+$'; then
    echo "❌ 데이터베이스 이름에 허용되지 않는 문자가 포함되어 있습니다: $DATABASE"
    exit 1
fi

echo "📋 연결 정보:"
echo "   호스트: $HOST"
echo "   포트: $PORT"
echo "   사용자: $USER"
echo "   데이터베이스: $DATABASE"
echo ""

# MySQL 클라이언트 확인
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL 클라이언트가 설치되어 있지 않습니다."
    echo ""
    echo "macOS 설치 방법:"
    echo "   brew install mysql-client"
    echo ""
    echo "또는 수동으로 연결:"
    echo "   mysql -h $HOST -P $PORT -u $USER -p"
    echo ""
    echo "연결 후 다음 SQL 실행:"
    echo "   SHOW DATABASES;"
    echo "   CREATE DATABASE IF NOT EXISTS $DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    exit 1
fi

echo "🔍 데이터베이스 확인 중..."
echo ""

# 비밀번호를 환경 변수로 전달하여 연결 시도
export MYSQL_PWD="$PASSWORD"

# 데이터베이스 목록 확인
echo "📊 기존 데이터베이스 목록:"
mysql -h "$HOST" -P "$PORT" -u "$USER" -e "SHOW DATABASES;" 2>&1

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ 연결 실패. 다음 사항을 확인하세요:"
    
    # SSH 터널 확인 (localhost인 경우)
    if [ "$HOST" = "localhost" ]; then
        TUNNEL_RUNNING=$(ps aux | grep "ssh.*$PORT" | grep -v grep | wc -l)
        if [ "$TUNNEL_RUNNING" -eq 0 ]; then
            echo "   1. SSH 터널이 실행되지 않았습니다."
            echo "      실행: ./scripts/start-ssh-tunnel.sh"
        fi
    else
        echo "   1. 퍼블릭 액세스가 활성화되어 있는지"
        echo "   2. 보안 그룹에 현재 IP가 추가되어 있는지 (curl ifconfig.me로 확인)"
    fi
    
    echo "   3. 사용자명과 비밀번호가 올바른지"
    echo ""
    echo "수동 연결 시도:"
    echo "   mysql -h $HOST -P $PORT -u $USER -p"
    exit 1
fi

echo ""
echo "🔍 '$DATABASE' 데이터베이스 확인 중..."

# 데이터베이스 존재 여부 확인 (백틱 사용)
DB_EXISTS=$(mysql -h "$HOST" -P "$PORT" -u "$USER" -e "SHOW DATABASES LIKE \`$DATABASE\`;" 2>&1 | grep -c "$DATABASE")

if [ "$DB_EXISTS" -eq 0 ]; then
    echo "📝 데이터베이스 '$DATABASE'가 없습니다. 생성 중..."
    # 백틱으로 데이터베이스 이름을 감싸서 특수 문자 처리
    mysql -h "$HOST" -P "$PORT" -u "$USER" -e "CREATE DATABASE \`$DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ 데이터베이스 '$DATABASE' 생성 완료!"
    else
        echo "❌ 데이터베이스 생성 실패"
        exit 1
    fi
else
    echo "✅ 데이터베이스 '$DATABASE'가 이미 존재합니다."
fi

echo ""
echo "🎉 데이터베이스 확인 완료!"

