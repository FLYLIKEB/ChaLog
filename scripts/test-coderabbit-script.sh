#!/bin/bash

# 스크립트 테스트용 헬퍼 스크립트

set -euo pipefail

echo "=== 코드래빗 리뷰 스크립트 테스트 ==="
echo ""

# 1. PR 번호 추출 함수 테스트
echo "1. PR 번호 추출 테스트"
test_extract_pr_number() {
  local input=$1
  local expected=$2
  if [[ $input =~ ^https:// ]]; then
    result=$(echo "$input" | grep -oE '/pull/[0-9]+' | grep -oE '[0-9]+' || echo "")
  elif [[ $input =~ ^[0-9]+$ ]]; then
    result=$input
  else
    result="ERROR"
  fi
  
  if [ "$result" == "$expected" ]; then
    echo "  ✓ '$input' -> $result"
    return 0
  else
    echo "  ✗ '$input' -> $result (예상: $expected)"
    return 1
  fi
}

test_extract_pr_number "19" "19"
test_extract_pr_number "https://github.com/FLYLIKEB/ChaLog/pull/19" "19"
test_extract_pr_number "https://github.com/FLYLIKEB/ChaLog/pull/123" "123"
echo ""

# 2. 코드래빗 봇 이름 확인 테스트
echo "2. 코드래빗 봇 이름 확인 테스트"
test_is_coderabbit() {
  local author=$1
  local expected=$2
  local bots=("coderabbit" "code-rabbit" "coderabbit[bot]" "code-rabbit[bot]")
  local found=0
  
  for bot_name in "${bots[@]}"; do
    if [[ "$author" == "$bot_name" ]]; then
      found=1
      break
    fi
  done
  
  if [ $found -eq $expected ]; then
    echo "  ✓ '$author' -> $([ $found -eq 1 ] && echo '코드래빗' || echo '일반 사용자')"
    return 0
  else
    echo "  ✗ '$author' -> 예상과 다름"
    return 1
  fi
}

test_is_coderabbit "coderabbit" 1
test_is_coderabbit "coderabbit[bot]" 1
test_is_coderabbit "code-rabbit" 1
test_is_coderabbit "other-user" 0
echo ""

# 3. 스크립트 파일 존재 및 실행 권한 확인
echo "3. 스크립트 파일 확인"
if [ -f "scripts/apply-coderabbit-reviews.sh" ]; then
  echo "  ✓ 스크립트 파일 존재"
  if [ -x "scripts/apply-coderabbit-reviews.sh" ]; then
    echo "  ✓ 실행 권한 있음"
  else
    echo "  ✗ 실행 권한 없음"
  fi
else
  echo "  ✗ 스크립트 파일 없음"
fi
echo ""

# 4. 필요한 도구 확인
echo "4. 필요한 도구 확인"
check_tool() {
  local tool=$1
  if command -v "$tool" &> /dev/null; then
    echo "  ✓ $tool 설치됨 ($(which $tool))"
    return 0
  else
    echo "  ✗ $tool 설치 안됨"
    return 1
  fi
}

check_tool "gh"
check_tool "jq"
check_tool "git"
echo ""

# 5. GitHub 인증 확인
echo "5. GitHub 인증 확인"
if gh auth status &> /dev/null; then
  echo "  ✓ GitHub 인증 완료"
  gh auth status 2>&1 | grep -E "Logged in|Active account" | sed 's/^/    /'
else
  echo "  ✗ GitHub 인증 필요"
fi
echo ""

# 6. 스크립트 문법 확인
echo "6. 스크립트 문법 확인"
if bash -n scripts/apply-coderabbit-reviews.sh 2>&1; then
  echo "  ✓ 문법 오류 없음"
else
  echo "  ✗ 문법 오류 있음"
fi
echo ""

# 7. GraphQL 쿼리 형식 확인
echo "7. GraphQL 쿼리 형식 확인"
if grep -q "query {" scripts/apply-coderabbit-reviews.sh && grep -q "mutation {" scripts/apply-coderabbit-reviews.sh; then
  echo "  ✓ GraphQL 쿼리/뮤테이션 포함됨"
else
  echo "  ✗ GraphQL 쿼리/뮤테이션 누락"
fi
echo ""

echo "=== 테스트 완료 ==="
echo ""
echo "스크립트 사용법:"
echo "  ./scripts/apply-coderabbit-reviews.sh <PR_URL_OR_NUMBER>"

