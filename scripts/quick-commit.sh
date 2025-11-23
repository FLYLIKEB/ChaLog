#!/bin/bash

# 사용법: ./scripts/quick-commit.sh [브랜치명] [커밋메시지]
# 예시: ./scripts/quick-commit.sh feature/new-feature "feat: 새로운 기능 추가"

BRANCH_NAME=${1:-$(git branch --show-current)}
COMMIT_MSG=${2:-"chore: update"}

CURRENT_BRANCH=$(git branch --show-current)

# 브랜치가 main이면 신규 브랜치 생성
if [ "$CURRENT_BRANCH" = "main" ] && [ "$BRANCH_NAME" != "main" ]; then
  echo "📦 Creating new branch: $BRANCH_NAME"
  git checkout -b "$BRANCH_NAME"
fi

echo "📝 Staging changes..."
git add .

echo "💾 Committing: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

echo "🚀 Pushing to origin/$BRANCH_NAME..."
git push -u origin "$BRANCH_NAME"

echo "✅ Done! Committed and pushed to $BRANCH_NAME"
