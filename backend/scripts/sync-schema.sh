#!/bin/bash

# 스키마 동기화 스크립트
# 사용법: ./scripts/sync-schema.sh [test|prod]

set -e

ENV=${1:-prod}

if [ "$ENV" != "test" ] && [ "$ENV" != "prod" ]; then
  echo "❌ 잘못된 환경: $ENV"
  echo "사용법: ./scripts/sync-schema.sh [test|prod]"
  exit 1
fi

echo "🔄 스키마 동기화 시작: $ENV"

# 환경 변수 확인 및 설정
if [ "$ENV" = "test" ]; then
  if [ -z "$TEST_DATABASE_URL" ]; then
    echo "❌ TEST_DATABASE_URL 환경 변수가 설정되지 않았습니다."
    exit 1
  fi
  echo "📊 테스트 DB 동기화"
  # TEST_DATABASE_URL을 DATABASE_URL로 설정하여 Migration 실행
  export DATABASE_URL="$TEST_DATABASE_URL"
else
  if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL 환경 변수가 설정되지 않았습니다."
    exit 1
  fi
  echo "📊 프로덕션 DB 동기화"
fi

# Migration 실행
echo "🚀 Migration 실행 중..."
npm run migration:run

echo "✅ 스키마 동기화 완료: $ENV"

