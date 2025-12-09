#!/bin/bash

set -euo pipefail

# 사용법: ./scripts/apply-coderabbit-reviews.sh <PR_URL_OR_NUMBER>
# 예시: ./scripts/apply-coderabbit-reviews.sh 19
# 예시: ./scripts/apply-coderabbit-reviews.sh https://github.com/FLYLIKEB/ChaLog/pull/19

REPO_OWNER="FLYLIKEB"
REPO_NAME="ChaLog"
CODERABBIT_BOT_NAMES=("coderabbit" "code-rabbit" "coderabbit[bot]" "code-rabbit[bot]" "coderabbitai")

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >&2
}

error() {
  echo "[ERROR] $1" >&2
  exit 1
}

# PR 번호 추출
extract_pr_number() {
  local input=$1
  if [[ $input =~ ^https:// ]]; then
    # URL에서 PR 번호 추출
    echo "$input" | grep -oE '/pull/[0-9]+' | grep -oE '[0-9]+' || error "PR 번호를 추출할 수 없습니다: $input"
  elif [[ $input =~ ^[0-9]+$ ]]; then
    echo "$input"
  else
    error "잘못된 PR 번호 또는 URL: $input"
  fi
}

# 코드래빗 봇인지 확인
is_coderabbit_bot() {
  local author=$1
  for bot_name in "${CODERABBIT_BOT_NAMES[@]}"; do
    if [[ "$author" == "$bot_name" ]]; then
      return 0
    fi
  done
  return 1
}

# 해결되지 않은 리뷰 스레드 가져오기
get_unresolved_review_threads() {
  local pr_number=$1
  local query=$(cat <<EOF
query {
  repository(owner: "$REPO_OWNER", name: "$REPO_NAME") {
    pullRequest(number: $pr_number) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          path
          line
          startLine
          startDiffSide
          diffSide
          comments(first: 10) {
            nodes {
              id
              bodyText
              author {
                login
              }
              createdAt
            }
          }
        }
      }
    }
  }
}
EOF
)
  
  gh api graphql -f query="$query" | jq -r --argjson bots '["coderabbit", "code-rabbit", "coderabbit[bot]", "code-rabbit[bot]", "coderabbitai"]' '
    .data.repository.pullRequest.reviewThreads.nodes[] 
    | select(.isResolved == false) 
    | select(.comments.nodes[0].author.login as $author | $bots | index($author) != null)
  '
}

# 일반 PR 코멘트 가져오기 (코드래빗 봇의 코멘트)
get_coderabbit_comments() {
  local pr_number=$1
  gh pr view "$pr_number" --json comments --jq '.comments[] | select(.author.login as $author | (["coderabbit", "code-rabbit", "coderabbit[bot]", "code-rabbit[bot]"] | index($author) != null)) | select(.isMinimized == false)'
}

# 리뷰 스레드 resolve
resolve_review_thread() {
  local thread_id=$1
  local mutation=$(cat <<EOF
mutation {
  resolveReviewThread(input: { threadId: "$thread_id" }) {
    thread {
      id
      isResolved
    }
  }
}
EOF
)
  
  gh api graphql -f query="$mutation" > /dev/null 2>&1
}

# 리뷰 코멘트에 답글 작성
add_comment_to_thread() {
  local thread_id=$1
  local comment_body=$2
  local pr_number=$3
  
  # GraphQL mutation에서 특수문자 이스케이프 (변수 사용)
  local escaped_body=$(echo "$comment_body" | jq -Rs .)
  
  # 변수를 사용한 GraphQL mutation
  local mutation='mutation($threadId: ID!, $body: String!) {
    addComment(input: { subjectId: $threadId, body: $body }) {
      commentEdge {
        node {
          id
        }
      }
    }
  }'
  
  local variables=$(jq -n --arg threadId "$thread_id" --arg body "$comment_body" '{threadId: $threadId, body: $body}')
  
  if ! gh api graphql -f query="$mutation" -f variables="$variables" > /dev/null 2>&1; then
    # addComment이 실패하면 일반 PR 코멘트로 작성
    gh pr comment "$pr_number" --body "$comment_body" > /dev/null 2>&1
  fi
}

# GitHub 이슈 생성
create_issue() {
  local title=$1
  local body=$2
  local labels=${3:-""}
  
  local issue_json=$(gh issue create --title "$title" --body "$body" --label "$labels" --json number,url 2>/dev/null)
  
  if [ $? -eq 0 ] && [ -n "$issue_json" ]; then
    local issue_number=$(echo "$issue_json" | jq -r '.number')
    local issue_url=$(echo "$issue_json" | jq -r '.url')
    echo "$issue_number|$issue_url"
  else
    echo ""
  fi
}

# 브랜치 생성 및 체크아웃
create_branch() {
  local branch_name=$1
  local base_branch=${2:-"main"}
  
  # base 브랜치로 전환
  git fetch origin "$base_branch" || error "base 브랜치를 가져올 수 없습니다: $base_branch"
  git checkout "$base_branch" || error "base 브랜치로 전환할 수 없습니다: $base_branch"
  git pull origin "$base_branch" || error "base 브랜치를 가져올 수 없습니다: $base_branch"
  
  # 새 브랜치 생성
  if git show-ref --verify --quiet refs/heads/"$branch_name"; then
    log "브랜치가 이미 존재합니다: $branch_name"
    git checkout "$branch_name"
  else
    git checkout -b "$branch_name" || error "브랜치 생성 실패: $branch_name"
  fi
}

# PR 생성
create_pr() {
  local title=$1
  local body=$2
  local base_branch=${3:-"main"}
  local head_branch=$4
  local issue_number=${5:-""}
  
  # PR 본문에 이슈 링크 추가
  local pr_body="$body"
  if [ -n "$issue_number" ]; then
    pr_body="$pr_body

Related to #$issue_number"
  fi
  
  local pr_json=$(gh pr create \
    --title "$title" \
    --body "$pr_body" \
    --base "$base_branch" \
    --head "$head_branch" \
    --json number,url 2>/dev/null)
  
  if [ $? -eq 0 ] && [ -n "$pr_json" ]; then
    local pr_number=$(echo "$pr_json" | jq -r '.number')
    local pr_url=$(echo "$pr_json" | jq -r '.url')
    echo "$pr_number|$pr_url"
  else
    echo ""
  fi
}

# 메인 로직
main() {
  if [ $# -lt 1 ]; then
    cat <<EOF
사용법: $0 <PR_URL_OR_NUMBER>

예시:
  $0 19
  $0 https://github.com/FLYLIKEB/ChaLog/pull/19

이 스크립트는:
1. 코드래빗 리뷰를 가져옵니다
2. 각 리뷰에 대해 반복:
   - 리뷰 내용을 표시합니다
   - 코드 수정을 기다립니다 (수동 또는 AI 도구 사용)
   - 변경사항을 커밋합니다
   - 리뷰에 반영 내용을 댓글로 작성합니다
   - 리뷰 스레드를 resolve합니다
EOF
    exit 1
  fi

  # GitHub CLI 확인
  if ! command -v gh &> /dev/null; then
    error "GitHub CLI (gh)가 설치되어 있지 않습니다. 설치: brew install gh"
  fi

  # jq 확인
  if ! command -v jq &> /dev/null; then
    error "jq가 설치되어 있지 않습니다. 설치: brew install jq"
  fi

  # GitHub 인증 확인
  if ! gh auth status &> /dev/null; then
    error "GitHub 인증이 필요합니다. 실행: gh auth login"
  fi

  local pr_input=$1
  local pr_number=$(extract_pr_number "$pr_input")
  
  log "PR #$pr_number 처리 시작..."

  # 현재 브랜치 확인
  local current_branch=$(git branch --show-current)
  log "현재 브랜치: $current_branch"

  # PR 정보 확인
  local pr_info=$(gh pr view "$pr_number" --json headRefName,title,url)
  local pr_branch=$(echo "$pr_info" | jq -r '.headRefName')
  local pr_title=$(echo "$pr_info" | jq -r '.title')
  local pr_url=$(echo "$pr_info" | jq -r '.url')
  
  log "PR 제목: $pr_title"
  log "PR 브랜치: $pr_branch"
  log "PR URL: $pr_url"

  # PR 브랜치로 체크아웃 (필요시)
  if [ "$current_branch" != "$pr_branch" ]; then
    log "브랜치 전환: $current_branch -> $pr_branch"
    git fetch origin "$pr_branch" || error "브랜치를 가져올 수 없습니다: $pr_branch"
    git checkout "$pr_branch" || error "브랜치로 전환할 수 없습니다: $pr_branch"
  fi

  # 리뷰 처리 루프
  local iteration=0
  while true; do
    iteration=$((iteration + 1))
    log ""
    log "=== 반복 $iteration: 리뷰 확인 중 ==="
    
    # 해결되지 않은 리뷰 스레드 가져오기
    local threads_json=$(get_unresolved_review_threads "$pr_number")
    
    # 빈 결과 확인
    if [ -z "$threads_json" ] || [ "$threads_json" == "null" ] || [ "$threads_json" == "" ]; then
      log "✅ 모든 코드래빗 리뷰가 처리되었습니다!"
      break
    fi
    
    # 배열로 변환 (단일 객체인 경우 배열로 감싸기)
    local threads_array=$(echo "$threads_json" | jq -s 'if type == "array" then . else [.] end')
    local thread_count=$(echo "$threads_array" | jq 'length')
    
    if [ "$thread_count" -eq 0 ]; then
      log "✅ 모든 코드래빗 리뷰가 처리되었습니다!"
      break
    fi
    
    log "해결되지 않은 리뷰 스레드: $thread_count개"
    
    # 각 스레드 처리
    local thread_indices=$(echo "$threads_array" | jq -r 'keys[]')
    
    for idx in $thread_indices; do
      local thread=$(echo "$threads_array" | jq -r ".[$idx]")
      local thread_id=$(echo "$thread" | jq -r '.id')
      local file_path=$(echo "$thread" | jq -r '.path')
      local line=$(echo "$thread" | jq -r '.line // .startLine // "N/A"')
      local comment=$(echo "$thread" | jq -r '.comments.nodes[0].bodyText')
      local author=$(echo "$thread" | jq -r '.comments.nodes[0].author.login')
      
      log ""
      log "📝 리뷰 스레드: $thread_id"
      log "   파일: $file_path:$line"
      log "   작성자: $author"
      log "   내용:"
      echo "$comment" | sed 's/^/   > /' | head -20
      log ""
      
      # 리뷰 내용을 임시 파일에 저장 (AI가 읽을 수 있도록)
      local review_file="/tmp/coderabbit_review_${thread_id}.txt"
      cat > "$review_file" <<EOF
코드래빗 리뷰:
파일: $file_path:$line
리뷰 ID: $thread_id

$comment
EOF
      
      log "🤖 리뷰 반영을 위해 AI에게 요청합니다..."
      log ""
      log "   📋 리뷰 요약:"
      echo "$comment" | grep -E "^(Fix|Refactor|🛠️|🧩)" | head -3 | sed 's/^/      /' || echo "      (리뷰 내용 확인 필요)" | sed 's/^/      /'
      log ""
      log "   💡 AI에게 다음을 요청하세요:"
      log "      \"$file_path 파일의 $line 라인 근처 코드래빗 리뷰를 반영해줘\""
      log ""
      log "   ⏱️  변경사항을 확인합니다 (최대 3초)..."
      
      # 변경사항 확인 (짧은 대기)
      local max_checks=3
      local check_count=0
      local has_changes=false
      
      while [ $check_count -lt $max_checks ]; do
        if ! git diff --quiet || ! git diff --cached --quiet; then
          has_changes=true
          break
        fi
        sleep 1
        check_count=$((check_count + 1))
      done
      
      # 변경사항이 없으면 사용자에게 알림
      if [ "$has_changes" != "true" ]; then
        log "   ⚠️  아직 변경사항이 없습니다."
        log "   AI에게 요청한 후 다시 스크립트를 실행하거나,"
        log "   's'를 입력하여 이 리뷰를 건너뛰세요."
        read -t 5 -p "   건너뛰기? (s/Enter): " -r || true
        
        if [[ $REPLY =~ ^[Ss]$ ]]; then
          log "⏭️  이 리뷰를 건너뜁니다."
          rm -f "$review_file"
          continue
        fi
        
        # 한 번 더 확인
        if git diff --quiet && git diff --cached --quiet; then
          log "⚠️  변경사항이 없어 건너뜁니다."
          rm -f "$review_file"
          continue
        fi
        has_changes=true
      fi
      
      # 변경사항 확인
      if [ "$has_changes" != "true" ] && (git diff --quiet && git diff --cached --quiet); then
        log "⚠️  변경사항이 없습니다. 이 리뷰를 건너뜁니다."
        rm -f "$review_file"
        continue
      fi
      
      # 변경사항 표시
      log "변경사항 감지됨:"
      git diff --stat
      
      # 커밋 메시지 생성
      local commit_msg="fix: [PR #$pr_number] 코드래빗 리뷰 반영 - $file_path:$line"
      
      # 자동 커밋 및 푸시
      log "자동 커밋 중..."
      git add .
      if ! git commit -m "$commit_msg"; then
        log "⚠️  커밋 실패 (변경사항이 없을 수 있습니다)"
        continue
      fi
      
      log "푸시 중..."
      git push origin "$pr_branch" || error "푸시 실패"
      
      # 리뷰에 댓글 작성
      local comment_body="✅ 리뷰 반영 완료

\`\`\`
$file_path:$line
\`\`\`

변경사항을 커밋했습니다."
      
      log "리뷰에 댓글 작성 중..."
      add_comment_to_thread "$thread_id" "$comment_body" "$pr_number"
      
      # 리뷰 스레드 resolve
      log "리뷰 스레드 resolve 중..."
      resolve_review_thread "$thread_id"
      
      log "✅ 리뷰 처리 완료: $thread_id"
    done
    
    # 다음 반복 전 잠시 대기
    sleep 2
  done
  
  log ""
  log "🎉 모든 코드래빗 리뷰 처리가 완료되었습니다!"
}

main "$@"

