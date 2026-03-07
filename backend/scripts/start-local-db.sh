#!/bin/bash
# 로컬 Docker MySQL 시작
# 사용법: ./scripts/start-local-db.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$BACKEND_DIR"

if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Docker가 설치되어 있지 않습니다."
    echo "   설치: brew install --cask docker"
    exit 1
fi

echo "📦 로컬 MySQL 시작 중..."
docker compose up -d

echo ""
echo "✅ 완료. 연결: mysql://root:changeme_root_password@127.0.0.1:3306/chalog"
echo ""
echo "백엔드 실행: npm run start:dev"
