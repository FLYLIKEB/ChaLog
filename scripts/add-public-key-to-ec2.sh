#!/bin/bash

# EC2 인스턴스에 공개 키 추가 스크립트
# GitHub Actions 배포를 위해 EC2 인스턴스의 authorized_keys에 공개 키를 추가합니다.

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}EC2 인스턴스에 공개 키 추가${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 환경 변수 확인
EC2_HOST="${EC2_HOST:-}"
EC2_USER="${EC2_USER:-ubuntu}"
EXISTING_KEY="${EXISTING_KEY:-}"
DEPLOY_KEY="${DEPLOY_KEY:-}"

# EC2_HOST 확인
if [ -z "$EC2_HOST" ]; then
    echo -e "${YELLOW}EC2_HOST 환경 변수가 설정되지 않았습니다.${NC}"
    read -p "EC2 Public IP를 입력하세요: " EC2_HOST
fi

# 기존 키 확인
if [ -z "$EXISTING_KEY" ]; then
    echo -e "${YELLOW}기존 EC2 키 페어 경로를 입력하세요 (예: ~/.ssh/summy.pem)${NC}"
    read -p "키 경로: " EXISTING_KEY
    EXISTING_KEY="${EXISTING_KEY/#\~/$HOME}"
fi

# 배포 키 확인
if [ -z "$DEPLOY_KEY" ]; then
    echo -e "${YELLOW}GitHub Actions에서 사용할 개인 키 경로를 입력하세요 (예: ~/.ssh/deploy_key.pem)${NC}"
    read -p "키 경로: " DEPLOY_KEY
    DEPLOY_KEY="${DEPLOY_KEY/#\~/$HOME}"
fi

# 파일 존재 확인
if [ ! -f "$EXISTING_KEY" ]; then
    echo -e "${RED}❌ 기존 키 파일을 찾을 수 없습니다: $EXISTING_KEY${NC}"
    exit 1
fi

if [ ! -f "$DEPLOY_KEY" ]; then
    echo -e "${RED}❌ 배포 키 파일을 찾을 수 없습니다: $DEPLOY_KEY${NC}"
    exit 1
fi

# 키 권한 확인
chmod 600 "$EXISTING_KEY" 2>/dev/null || true
chmod 600 "$DEPLOY_KEY" 2>/dev/null || true

echo ""
echo -e "${BLUE}📋 설정 정보:${NC}"
echo "   EC2 Host: $EC2_HOST"
echo "   EC2 User: $EC2_USER"
echo "   기존 키: $EXISTING_KEY"
echo "   배포 키: $DEPLOY_KEY"
echo ""

# 공개 키 추출
echo -e "${BLUE}🔑 공개 키 추출 중...${NC}"
PUBLIC_KEY=$(ssh-keygen -y -f "$DEPLOY_KEY" 2>&1)
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 공개 키 추출 실패:${NC}"
    echo "$PUBLIC_KEY"
    exit 1
fi

echo -e "${GREEN}✅ 공개 키 추출 성공${NC}"
echo ""
echo -e "${BLUE}공개 키 (처음 80자):${NC}"
echo "${PUBLIC_KEY:0:80}..."
echo ""

# EC2 연결 테스트
echo -e "${BLUE}🔍 EC2 연결 테스트 중...${NC}"
if ssh -i "$EXISTING_KEY" \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=10 \
    "$EC2_USER@$EC2_HOST" \
    "echo '연결 성공'" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ EC2 연결 성공${NC}"
else
    echo -e "${RED}❌ EC2 연결 실패${NC}"
    echo "기존 키로 EC2에 접속할 수 없습니다."
    exit 1
fi

# 공개 키가 이미 추가되어 있는지 확인
echo ""
echo -e "${BLUE}🔍 기존 authorized_keys 확인 중...${NC}"
EXISTING_KEYS=$(ssh -i "$EXISTING_KEY" \
    -o StrictHostKeyChecking=no \
    "$EC2_USER@$EC2_HOST" \
    "cat ~/.ssh/authorized_keys 2>/dev/null || echo ''")

PUBLIC_KEY_FINGERPRINT=$(echo "$PUBLIC_KEY" | ssh-keygen -lf - | awk '{print $2}')

if echo "$EXISTING_KEYS" | grep -q "$PUBLIC_KEY_FINGERPRINT\|$(echo "$PUBLIC_KEY" | cut -d' ' -f2)"; then
    echo -e "${YELLOW}⚠️  공개 키가 이미 authorized_keys에 있습니다.${NC}"
    read -p "그래도 계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "취소되었습니다."
        exit 0
    fi
fi

# 공개 키 추가
echo ""
echo -e "${BLUE}📝 공개 키 추가 중...${NC}"
ssh -i "$EXISTING_KEY" \
    -o StrictHostKeyChecking=no \
    "$EC2_USER@$EC2_HOST" \
    "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$PUBLIC_KEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 공개 키 추가 성공${NC}"
else
    echo -e "${RED}❌ 공개 키 추가 실패${NC}"
    exit 1
fi

# SSH 연결 테스트 (새 키로)
echo ""
echo -e "${BLUE}🔍 새 키로 SSH 연결 테스트 중...${NC}"
if ssh -i "$DEPLOY_KEY" \
    -o StrictHostKeyChecking=no \
    -o ConnectTimeout=10 \
    "$EC2_USER@$EC2_HOST" \
    "echo '새 키로 연결 성공!'" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 새 키로 SSH 연결 성공!${NC}"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ 완료! GitHub Actions에서 이제 SSH 연결이 가능합니다.${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    echo -e "${RED}❌ 새 키로 SSH 연결 실패${NC}"
    echo "공개 키는 추가되었지만 연결이 실패했습니다."
    echo "GitHub Secrets의 EC2_SSH_KEY가 올바른지 확인하세요."
    exit 1
fi

