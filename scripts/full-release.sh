#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 2 ]]; then
  cat <<'EOF'
Usage: scripts/full-release.sh "<commit-message>" "<version-tag>" [feature-branch]

- <commit-message>: 로컬 변경분을 커밋할 메시지
- <version-tag>: 예) v1.2.3 (release/<version-tag> 브랜치와 동일하게 사용)
- [feature-branch]: 기본값은 현재 체크아웃된 브랜치이며, 반드시 feature/* 패턴을 따라야 합니다.

이 스크립트는 다음을 한 번에 수행합니다.
1) 테스트/린트/타입 체크
2) feature/* 브랜치 커밋 및 push
3) develop 병합
4) release/* 생성 및 push
5) main 병합 + 태그 생성/배포
6) develop 재동기화 및 release/* 정리
EOF
  exit 1
fi

log() {
  printf '\n[full-release] %s\n' "$1"
}

typecheck() {
  if npx --no-install tsc --version >/dev/null 2>&1; then
    npx --no-install tsc --noEmit
  else
    log "TypeScript 컴파일러(tsc)를 찾을 수 없어 타입 체크를 건너뜁니다."
  fi
}

has_remote_branch() {
  git ls-remote --exit-code --heads origin "$1" >/dev/null 2>&1
}

COMMIT_MESSAGE=$1
VERSION_TAG=$2

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

STARTING_BRANCH=$(git symbolic-ref --short HEAD)
FEATURE_BRANCH=${3:-$STARTING_BRANCH}
RELEASE_BRANCH="release/$VERSION_TAG"

if [[ "$FEATURE_BRANCH" != feature/* ]]; then
  echo "feature/* 패턴의 브랜치에서만 실행 가능합니다. 현재: $FEATURE_BRANCH" >&2
  exit 1
fi

if git show-ref --verify --quiet "refs/heads/$RELEASE_BRANCH"; then
  echo "로컬에 $RELEASE_BRANCH 브랜치가 이미 존재합니다. 삭제 후 다시 시도하세요." >&2
  exit 1
fi

if git ls-remote --exit-code --heads origin "$RELEASE_BRANCH" >/dev/null 2>&1; then
  echo "원격에 $RELEASE_BRANCH 브랜치가 이미 존재합니다. 다른 버전 태그를 사용하세요." >&2
  exit 1
fi

if git rev-parse "$VERSION_TAG" >/dev/null 2>&1; then
  echo "로컬에 $VERSION_TAG 태그가 이미 있습니다." >&2
  exit 1
fi

if git ls-remote --exit-code --tags origin "$VERSION_TAG" >/dev/null 2>&1; then
  echo "원격에 $VERSION_TAG 태그가 이미 있습니다." >&2
  exit 1
fi

if [[ "$STARTING_BRANCH" != "$FEATURE_BRANCH" ]]; then
  git checkout "$FEATURE_BRANCH"
fi

trap 'git checkout "$FEATURE_BRANCH" >/dev/null 2>&1 || true' EXIT

git fetch origin --prune

if [[ -n $(git status --porcelain) ]]; then
  HAS_CHANGES=1
else
  HAS_CHANGES=0
fi

log "테스트 실행 (vitest)"
npm run test:run

log "린트 실행 (존재 시)"
npm run lint --if-present

log "타입 체크 실행"
typecheck

if [[ $HAS_CHANGES -eq 1 ]]; then
  log "변경 사항 커밋"
  git add -A
  git commit -m "$COMMIT_MESSAGE"
else
  log "새로 커밋할 변경 사항이 없습니다."
fi

log "feature 브랜치 원격 동기화"
if has_remote_branch "$FEATURE_BRANCH"; then
  git pull --rebase origin "$FEATURE_BRANCH"
  git push origin "$FEATURE_BRANCH"
else
  git push -u origin "$FEATURE_BRANCH"
fi

log "develop에 feature 병합"
git checkout develop
git pull origin develop --ff-only
git merge --no-ff "$FEATURE_BRANCH" -m "Merge $FEATURE_BRANCH into develop"
git push origin develop

log "release 브랜치 생성 및 push ($RELEASE_BRANCH)"
git checkout -b "$RELEASE_BRANCH"
git push -u origin "$RELEASE_BRANCH"

log "main에 release 병합 및 태그 생성 ($VERSION_TAG)"
git checkout main
git pull origin main --ff-only
git merge --no-ff "$RELEASE_BRANCH" -m "Release $VERSION_TAG"
git tag -a "$VERSION_TAG" -m "Release $VERSION_TAG"
git push origin main
git push origin "$VERSION_TAG"

log "release 변경 사항 develop에 재병합"
git checkout develop
git pull origin develop --ff-only
git merge --no-ff "$RELEASE_BRANCH" -m "Merge $RELEASE_BRANCH back into develop"
git push origin develop

log "release 브랜치 정리"
git branch -d "$RELEASE_BRANCH"
git push origin --delete "$RELEASE_BRANCH"

log "작업 완료"

