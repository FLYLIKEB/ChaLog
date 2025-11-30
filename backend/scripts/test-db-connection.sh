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

# URL 파싱 (간단한 방법)
DB_USER=$(echo $DATABASE_URL | sed -n 's|mysql://\([^:]*\):.*|\1|p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's|mysql://[^@]*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's|mysql://[^@]*@[^:]*:\([^/]*\)/.*|\1|p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's|mysql://[^@]*@[^:]*:[^/]*/\([^?]*\).*|\1|p')

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
if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1 as test;" "$DB_NAME" 2>&1 | grep -q "test"; then
    echo "✅ 데이터베이스 연결 성공!"
    echo ""
    echo "📋 데이터베이스 정보:"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "SELECT USER(), DATABASE();" "$DB_NAME" 2>/dev/null
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

