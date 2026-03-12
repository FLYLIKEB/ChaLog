#!/bin/bash

# Lightsail 연결 확인 및 문제 해결 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

LIGHTSAIL_IP="${1:-${LIGHTSAIL_IP}}"
SSH_KEY="${SSH_KEY_PATH:-LightsailDefaultKey-ap-northeast-2.pem}"

if [ -z "$LIGHTSAIL_IP" ]; then
    echo -e "${RED}❌ Lightsail IP가 필요합니다.${NC}"
    echo "사용법: $0 <LIGHTSAIL_IP>"
    echo "또는 환경 변수: LIGHTSAIL_IP=<IP> $0"
    exit 1
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔍 Lightsail 연결 확인${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Lightsail IP: $LIGHTSAIL_IP"
echo "SSH 키: $SSH_KEY"
echo ""

# SSH 키 경로 확인
if [[ "$SSH_KEY" == ~* ]]; then
    SSH_KEY="${SSH_KEY/#\~/$HOME}"
fi

if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH 키 파일을 찾을 수 없습니다: $SSH_KEY${NC}"
    exit 1
fi

# SSH 키 권한 확인 및 수정
echo -e "${BLUE}📋 1단계: SSH 키 권한 확인${NC}"
KEY_PERM=$(stat -f "%A" "$SSH_KEY" 2>/dev/null || stat -c "%a" "$SSH_KEY" 2>/dev/null)
if [ "$KEY_PERM" != "400" ] && [ "$KEY_PERM" != "600" ]; then
    echo -e "${YELLOW}⚠️  SSH 키 권한 수정 중... (현재: $KEY_PERM)${NC}"
    chmod 400 "$SSH_KEY"
    echo -e "${GREEN}✅ SSH 키 권한 수정 완료${NC}"
else
    echo -e "${GREEN}✅ SSH 키 권한 확인됨 (현재: $KEY_PERM)${NC}"
fi

# 포트 22 연결 테스트
echo ""
echo -e "${BLUE}📋 2단계: SSH 포트 (22) 연결 테스트${NC}"
if timeout 5 bash -c "</dev/tcp/$LIGHTSAIL_IP/22" 2>/dev/null; then
    echo -e "${GREEN}✅ 포트 22 열림${NC}"
else
    echo -e "${RED}❌ 포트 22 닫힘 또는 타임아웃${NC}"
    echo ""
    echo -e "${YELLOW}가능한 원인:${NC}"
    echo "  1. Lightsail 인스턴스가 중지됨"
    echo "  2. 방화벽 규칙 문제"
    echo "  3. 네트워크 연결 문제"
    echo ""
    echo -e "${YELLOW}해결 방법:${NC}"
    echo "  1. AWS Lightsail 콘솔에서 인스턴스 상태 확인"
    echo "  2. 인스턴스가 중지되어 있으면 시작"
    echo "  3. 네트워킹 탭에서 SSH (포트 22) 규칙 확인"
    echo "  4. 브라우저에서 Lightsail 콘솔의 '브라우저에서 연결' 기능 사용"
    exit 1
fi

# SSH 연결 테스트
echo ""
echo -e "${BLUE}📋 3단계: SSH 연결 테스트${NC}"
echo "연결 시도 중..."

SSH_OUTPUT=$(ssh -i "$SSH_KEY" \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=10 \
    -o BatchMode=yes \
    -o ServerAliveInterval=5 \
    -o ServerAliveCountMax=3 \
    ubuntu@$LIGHTSAIL_IP \
    "echo 'SSH 연결 성공' && hostname && uptime" 2>&1)

SSH_EXIT=$?

if [ $SSH_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ SSH 연결 성공!${NC}"
    echo ""
    echo "$SSH_OUTPUT"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 모든 연결 테스트 통과!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
else
    echo -e "${RED}❌ SSH 연결 실패 (exit code: $SSH_EXIT)${NC}"
    echo ""
    echo "오류 출력:"
    echo "$SSH_OUTPUT"
    echo ""
    echo -e "${YELLOW}추가 진단 정보:${NC}"
    echo ""
    
    # SSH 키 형식 확인
    echo "SSH 키 형식 확인:"
    if grep -q "BEGIN.*PRIVATE KEY" "$SSH_KEY"; then
        echo -e "  ${GREEN}✅ SSH 키 형식 올바름${NC}"
    else
        echo -e "  ${RED}❌ SSH 키 형식 오류${NC}"
    fi
    
    # 공개 키 추출 시도
    echo ""
    echo "공개 키 정보:"
    PUBLIC_KEY=$(ssh-keygen -y -f "$SSH_KEY" 2>&1) || PUBLIC_KEY="추출 실패"
    if [[ "$PUBLIC_KEY" != *"추출 실패"* ]]; then
        echo -e "  ${GREEN}✅ 공개 키 추출 성공${NC}"
        echo "  공개 키 (처음 50자): ${PUBLIC_KEY:0:50}..."
    else
        echo -e "  ${RED}❌ 공개 키 추출 실패${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}해결 방법:${NC}"
    echo "  1. AWS Lightsail 콘솔에서 인스턴스 상태 확인"
    echo "  2. 인스턴스가 중지되어 있으면 시작"
    echo "  3. Lightsail 콘솔의 '브라우저에서 연결' 기능 사용하여 SSH 접속"
    echo "  4. 서버에서 authorized_keys 확인:"
    echo "     cat ~/.ssh/authorized_keys"
    echo "  5. 공개 키가 없으면 추가:"
    echo "     echo '$PUBLIC_KEY' >> ~/.ssh/authorized_keys"
    
    exit 1
fi
