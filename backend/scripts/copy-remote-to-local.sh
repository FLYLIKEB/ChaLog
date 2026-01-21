#!/bin/bash

# 원격 DB의 테이블 구조와 데이터를 로컬 DB로 복사하는 스크립트
# 사용법: ./scripts/copy-remote-to-local.sh

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# .env 파일 로드
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env 파일을 찾을 수 없습니다.${NC}"
    exit 1
fi

set -a
source .env
set +a

# DATABASE_URL 확인
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.${NC}"
    exit 1
fi

# LOCAL_DATABASE_URL 확인
if [ -z "$LOCAL_DATABASE_URL" ]; then
    echo -e "${RED}❌ LOCAL_DATABASE_URL 환경 변수가 설정되지 않았습니다.${NC}"
    exit 1
fi

# SSH 터널 필요 여부 확인
# 원격 호스트가 RDS 엔드포인트인 경우 SSH 터널 필요
SSH_TUNNEL_NEEDED=false
if [[ "$DATABASE_URL" == *".rds.amazonaws.com"* ]]; then
    # SSH_TUNNEL_REMOTE_HOST가 설정되지 않았으면 DATABASE_URL에서 추출
    if [ -z "$SSH_TUNNEL_REMOTE_HOST" ]; then
        SSH_TUNNEL_REMOTE_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
        echo -e "${YELLOW}ℹ️  SSH_TUNNEL_REMOTE_HOST를 DATABASE_URL에서 자동 추출: $SSH_TUNNEL_REMOTE_HOST${NC}"
    fi
    
    # 필수 SSH 터널 환경 변수 확인
    if [ -z "$SSH_KEY_PATH" ] || [ -z "$EC2_HOST" ] || [ -z "$EC2_USER" ]; then
        echo -e "${RED}❌ SSH 터널 환경 변수가 설정되지 않았습니다.${NC}"
        echo ""
        echo ".env 파일에 다음 변수들을 설정하세요:"
        echo "  - SSH_KEY_PATH (예: ~/.ssh/your-key.pem)"
        echo "  - EC2_HOST (예: ec2-xxx.ap-northeast-2.compute.amazonaws.com)"
        echo "  - EC2_USER (예: ec2-user 또는 ubuntu)"
        echo ""
        echo "SSH_TUNNEL_REMOTE_HOST는 자동으로 설정되었습니다: $SSH_TUNNEL_REMOTE_HOST"
        exit 1
    fi
    
    SSH_TUNNEL_NEEDED=true
fi

# mysqldump 확인
if ! command -v mysqldump &> /dev/null; then
    echo -e "${RED}❌ mysqldump가 설치되어 있지 않습니다.${NC}"
    echo ""
    echo "macOS 설치 방법:"
    echo "   brew install mysql-client"
    exit 1
fi

# Node.js를 사용하여 DATABASE_URL 파싱
parse_database_url() {
    local url=$1
    node -e "
    try {
      const urlObj = new URL('$url');
      const hostname = urlObj.hostname || '';
      const port = urlObj.port || '3306';
      const username = urlObj.username || '';
      const password = decodeURIComponent(urlObj.password || '');
      const database = urlObj.pathname.slice(1).split('?')[0] || '';
      
      console.log('HOST=' + hostname);
      console.log('PORT=' + port);
      console.log('USER=' + username);
      console.log('PASSWORD=' + password);
      console.log('DATABASE=' + database);
    } catch (error) {
      console.error('URL 파싱 실패:', error.message);
      process.exit(1);
    }
    "
}

echo -e "${BLUE}🔄 원격 DB에서 로컬 DB로 데이터 복사 시작...${NC}"
echo ""

# 원격 DB 정보 파싱
echo -e "${YELLOW}📋 원격 DB 정보 파싱 중...${NC}"
REMOTE_INFO=$(parse_database_url "$DATABASE_URL")
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 원격 DB URL 파싱 실패${NC}"
    exit 1
fi
eval "$REMOTE_INFO"
REMOTE_HOST="$HOST"
REMOTE_PORT="$PORT"
REMOTE_USER="$USER"
REMOTE_PASSWORD="$PASSWORD"
REMOTE_DATABASE="$DATABASE"

# 로컬 DB 정보 파싱
echo -e "${YELLOW}📋 로컬 DB 정보 파싱 중...${NC}"
LOCAL_INFO=$(parse_database_url "$LOCAL_DATABASE_URL")
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 로컬 DB URL 파싱 실패${NC}"
    exit 1
fi
eval "$LOCAL_INFO"
LOCAL_HOST="$HOST"
LOCAL_PORT="$PORT"
LOCAL_USER="$USER"
LOCAL_PASSWORD="$PASSWORD"
LOCAL_DATABASE="$DATABASE"

echo -e "${GREEN}✅ 파싱 완료${NC}"
echo ""

# SSH 터널 시작 (필요한 경우)
if [ "$SSH_TUNNEL_NEEDED" = "true" ]; then
    echo -e "${BLUE}🔗 SSH 터널 확인 중...${NC}"
    SSH_TUNNEL_PORT="${SSH_TUNNEL_LOCAL_PORT:-3307}"
    
    # 기존 SSH 터널 확인
    EXISTING_TUNNEL=$(lsof -ti:$SSH_TUNNEL_PORT 2>/dev/null)
    
    if [ -n "$EXISTING_TUNNEL" ]; then
        echo -e "${GREEN}✅ 기존 SSH 터널 사용 중 (포트: $SSH_TUNNEL_PORT)${NC}"
        REMOTE_HOST="localhost"
        REMOTE_PORT="$SSH_TUNNEL_PORT"
    else
        echo -e "${YELLOW}⚠️  SSH 터널이 없습니다. 시작 중...${NC}"
        if [ -f scripts/start-ssh-tunnel.sh ]; then
            # SSH 터널 시작 (에러 무시하고 계속 진행)
            set +e
            AUTO_CONFIRM=true bash scripts/start-ssh-tunnel.sh <<< "y" 2>&1 | grep -v "계속하시겠습니까"
            SSH_TUNNEL_EXIT_CODE=$?
            set -e
            
            if [ $SSH_TUNNEL_EXIT_CODE -eq 0 ]; then
                sleep 2
                
                # SSH 터널을 통해 접근하도록 호스트/포트 변경
                REMOTE_HOST="localhost"
                REMOTE_PORT="$SSH_TUNNEL_PORT"
                echo -e "${GREEN}✅ SSH 터널 시작 완료 (로컬 포트: $REMOTE_PORT)${NC}"
            else
                echo -e "${YELLOW}⚠️  SSH 터널 시작 실패. 직접 접근을 시도합니다.${NC}"
                SSH_TUNNEL_NEEDED=false
            fi
        else
            echo -e "${YELLOW}⚠️  SSH 터널 스크립트를 찾을 수 없습니다.${NC}"
            SSH_TUNNEL_NEEDED=false
        fi
    fi
    
    if [ "$SSH_TUNNEL_NEEDED" = "true" ]; then
        echo ""
        echo -e "${BLUE}원격 DB (SSH 터널 경유):${NC}"
        echo "   호스트: $REMOTE_HOST:$REMOTE_PORT"
        echo "   데이터베이스: $REMOTE_DATABASE"
        echo ""
    fi
fi

echo -e "${BLUE}원격 DB:${NC}"
echo "   호스트: $REMOTE_HOST:$REMOTE_PORT"
echo "   데이터베이스: $REMOTE_DATABASE"
echo ""
echo -e "${BLUE}로컬 DB:${NC}"
echo "   호스트: $LOCAL_HOST:$LOCAL_PORT"
echo "   데이터베이스: $LOCAL_DATABASE"
echo ""

# 확인 메시지
echo -e "${YELLOW}⚠️  경고: 로컬 DB의 기존 데이터가 모두 삭제됩니다!${NC}"
# 자동 확인 옵션 (환경 변수로 제어)
if [ "$AUTO_CONFIRM" != "true" ]; then
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}취소되었습니다.${NC}"
        exit 0
    fi
else
    echo -e "${GREEN}자동 확인 모드: 계속 진행합니다...${NC}"
fi

# 임시 덤프 파일
DUMP_FILE="/tmp/chalog_remote_dump_$(date +%Y%m%d_%H%M%S).sql"

echo ""
echo -e "${BLUE}📥 원격 DB에서 덤프 생성 중...${NC}"

# SSH 터널 확인 (localhost인 경우)
USE_SSH_TUNNEL=false
if [ "$REMOTE_HOST" = "localhost" ] || [ "$REMOTE_HOST" = "127.0.0.1" ]; then
    USE_SSH_TUNNEL=true
    echo -e "${YELLOW}ℹ️  SSH 터널을 통한 접근 감지${NC}"
fi

# SSL 옵션 확인 (MySQL 9.x에서는 SSL 옵션이 제한적)
SSL_OPTIONS=""
if [ "$DB_SSL_ENABLED" = "true" ] && [ "$USE_SSH_TUNNEL" = "false" ]; then
    # MySQL 9.x에서는 --ssl-mode 옵션 사용
    SSL_OPTIONS="--ssl-mode=REQUIRED"
fi

# mysqldump 실행
export MYSQL_PWD="$REMOTE_PASSWORD"
# SSH 터널을 통한 접근인 경우 인증 플러그인 옵션 추가
AUTH_OPTION=""
if [ "$USE_SSH_TUNNEL" = "true" ] || [ "$REMOTE_HOST" = "localhost" ] || [ "$REMOTE_HOST" = "127.0.0.1" ]; then
    AUTH_OPTION="--default-auth=caching_sha2_password"
fi

mysqldump \
    -h "$REMOTE_HOST" \
    -P "$REMOTE_PORT" \
    -u "$REMOTE_USER" \
    $AUTH_OPTION \
    $SSL_OPTIONS \
    --single-transaction \
    --skip-lock-tables \
    --skip-add-locks \
    --routines \
    --triggers \
    --events \
    --add-drop-database \
    --databases "$REMOTE_DATABASE" \
    > "$DUMP_FILE" 2>&1

# 덤프 파일에서 에러 메시지 제거 (권한 경고는 무시)
if grep -q "mysqldump: Got error" "$DUMP_FILE" || grep -q "Access denied" "$DUMP_FILE"; then
    # 에러가 있지만 덤프가 생성되었는지 확인
    if [ $(wc -l < "$DUMP_FILE") -lt 50 ]; then
        echo -e "${RED}❌ 덤프 생성 실패: 권한 문제 또는 연결 오류${NC}"
        cat "$DUMP_FILE" | grep -E "(error|Error|ERROR|denied)" | head -5
        exit 1
    fi
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 덤프 생성 실패${NC}"
    echo "덤프 파일 확인: $DUMP_FILE"
    exit 1
fi

echo -e "${GREEN}✅ 덤프 생성 완료: $DUMP_FILE${NC}"
DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "   크기: $DUMP_SIZE"
echo ""

# 로컬 DB에 복원
echo -e "${BLUE}📤 로컬 DB에 복원 중...${NC}"

# 로컬 DB가 없으면 생성
export MYSQL_PWD="$LOCAL_PASSWORD"
mysql -h "$LOCAL_HOST" -P "$LOCAL_PORT" -u "$LOCAL_USER" -e "CREATE DATABASE IF NOT EXISTS \`$LOCAL_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 로컬 DB 생성/확인 실패${NC}"
    exit 1
fi

# 덤프 파일에서 데이터베이스 이름 변경 (원격 DB 이름 -> 로컬 DB 이름)
if [ "$REMOTE_DATABASE" != "$LOCAL_DATABASE" ]; then
    echo -e "${YELLOW}🔄 데이터베이스 이름 변경 중 ($REMOTE_DATABASE -> $LOCAL_DATABASE)...${NC}"
    sed -i '' "s/\`$REMOTE_DATABASE\`/\`$LOCAL_DATABASE\`/g" "$DUMP_FILE"
fi

# 덤프 복원
mysql -h "$LOCAL_HOST" -P "$LOCAL_PORT" -u "$LOCAL_USER" "$LOCAL_DATABASE" < "$DUMP_FILE" 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 복원 실패${NC}"
    echo "덤프 파일 확인: $DUMP_FILE"
    exit 1
fi

echo -e "${GREEN}✅ 복원 완료!${NC}"
echo ""

# 테이블 개수 확인
TABLE_COUNT=$(mysql -h "$LOCAL_HOST" -P "$LOCAL_PORT" -u "$LOCAL_USER" -e "USE \`$LOCAL_DATABASE\`; SHOW TABLES;" 2>/dev/null | wc -l | tr -d ' ')
TABLE_COUNT=$((TABLE_COUNT - 1)) # 헤더 제외

echo -e "${BLUE}📊 복원된 테이블 개수: $TABLE_COUNT${NC}"
echo ""

# 덤프 파일 삭제 여부 확인
read -p "임시 덤프 파일을 삭제하시겠습니까? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    rm -f "$DUMP_FILE"
    echo -e "${GREEN}✅ 덤프 파일 삭제 완료${NC}"
else
    echo -e "${YELLOW}덤프 파일 보관: $DUMP_FILE${NC}"
fi

# SSH 터널 종료 (시작한 경우)
if [ "$SSH_TUNNEL_NEEDED" = "true" ] && [ -f scripts/stop-ssh-tunnel.sh ]; then
    echo ""
    echo -e "${BLUE}🔗 SSH 터널 종료 중...${NC}"
    bash scripts/stop-ssh-tunnel.sh > /dev/null 2>&1 || true
    echo -e "${GREEN}✅ SSH 터널 종료 완료${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 데이터 복사 완료!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}로컬 DB 연결 정보:${NC}"
echo "   호스트: $LOCAL_HOST:$LOCAL_PORT"
echo "   데이터베이스: $LOCAL_DATABASE"
echo "   사용자: $LOCAL_USER"
echo ""
