#!/bin/bash

# RDS 데이터베이스 확인 및 생성 스크립트
# 사용법: ./scripts/check-database.sh
# 주의: SSH 터널이 실행 중이어야 합니다 (./scripts/start-ssh-tunnel.sh)

# .env 파일에서 DATABASE_URL 파싱
if [ ! -f .env ]; then
    echo "❌ .env 파일을 찾을 수 없습니다."
    exit 1
fi

# DATABASE_URL에서 정보 추출
DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2-)

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL을 .env 파일에서 찾을 수 없습니다."
    exit 1
fi

# URL 파싱: mysql://user:password@host:port/database
# 간단한 파싱 (더 정교한 파싱이 필요할 수 있음)
HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
USER=$(echo "$DATABASE_URL" | sed -n 's/mysql:\/\/\([^:]*\):.*/\1/p')
PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/mysql:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DATABASE=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

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

# 데이터베이스 존재 여부 확인
DB_EXISTS=$(mysql -h "$HOST" -P "$PORT" -u "$USER" -e "SHOW DATABASES LIKE '$DATABASE';" 2>&1 | grep -c "$DATABASE")

if [ "$DB_EXISTS" -eq 0 ]; then
    echo "📝 데이터베이스 '$DATABASE'가 없습니다. 생성 중..."
    mysql -h "$HOST" -P "$PORT" -u "$USER" -e "CREATE DATABASE $DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1
    
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

