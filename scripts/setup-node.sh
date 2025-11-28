#!/bin/bash

# Node.js 버전 설정 스크립트
# 사용법: bash scripts/setup-node.sh

set -e

echo "🚀 Node.js 버전 설정 시작..."

# nvm 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Node.js v22 LTS 설치
echo "📦 Node.js v22 LTS 설치 중..."
nvm install 22

# 프로젝트 디렉토리로 이동
cd "$(dirname "$0")/.."

# .nvmrc 파일 사용
echo "📝 프로젝트 Node.js 버전 설정 중..."
nvm use

# 확인
echo ""
echo "✅ 설정 완료!"
echo "현재 Node.js 버전: $(node --version)"
echo "현재 npm 버전: $(npm --version)"
echo ""
echo "💡 다음부터는 프로젝트 디렉토리에서 'nvm use'만 실행하면 됩니다."

