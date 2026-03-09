#!/usr/bin/env bash
# launch.json 설정만 보여주고, 번호 입력 시 해당 설정 실행
# (Node 대신 Python 사용 → "Debugger attached" 메시지 방지)

set -e
cd "$(dirname "$0")/.."
ROOT="$PWD"

# JSON 파싱 (// 주석 제거 후 Python으로 파싱)
get_configs() {
  sed '/^[[:space:]]*\/\//d' .vscode/launch.json | python3 -c "
import json, sys, os
launch = json.load(sys.stdin)
ws = os.getcwd()
for i, c in enumerate(launch.get('configurations', [])):
    cmd = c.get('command', '')
    cwd = (c.get('cwd') or '\${workspaceFolder}').replace('\${workspaceFolder}', ws)
    print(json.dumps({'n': i+1, 'name': c['name'], 'command': cmd, 'cwd': cwd}))
"
}

run_config() {
  local num=$1
  local line
  line=$(get_configs | sed -n "${num}p")
  [[ -z "$line" ]] && { echo "잘못된 번호: $num"; exit 1; }

  local name command cwd
  name=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['name'])")
  command=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['command'])")
  cwd=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['cwd'])")

  # ${input:issueNumber} 치환 (Plan from Issue)
  if [[ "$command" == *'${input:issueNumber}'* ]]; then
    local issue="${2:-}"
    [[ -z "$issue" ]] && read -p "GitHub 이슈 번호? " issue
    command="${command//\$\{input:issueNumber\}/$issue}"
  fi

  echo "실행: $name"
  echo "───────────────────────────────────────────────────────────────"
  (cd "$cwd" && eval "$command")
}

# 메인
if [[ -n "${1:-}" ]]; then
  run_config "$1" "$2"
else
  echo "═══════════════════════════════════════════════════════════════"
  echo "  launch.json 실행 가능 스크립트"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""

  get_configs | while IFS= read -r line; do
    n=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['n'])")
    name=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['name'])")
    printf "  %2d. %s\n" "$n" "$name"
  done

  echo ""
  echo "───────────────────────────────────────────────────────────────"
  read -p "실행할 번호 (Enter=종료): " num
  if [[ -n "$num" ]]; then
    run_config "$num"
  fi
fi
