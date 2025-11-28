#!/bin/bash

# AWS CLI 자동 설정 스크립트

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔧 AWS CLI 자동 설정${NC}"
echo ""

# 기본 region 설정 (서울)
DEFAULT_REGION="ap-northeast-2"
DEFAULT_OUTPUT="json"

# AWS 설정 디렉토리 생성
mkdir -p ~/.aws

# 기본 config 파일 생성 (region 설정)
cat > ~/.aws/config << EOF
[default]
region = ${DEFAULT_REGION}
output = ${DEFAULT_OUTPUT}
EOF

echo -e "${GREEN}✅ 기본 설정 완료${NC}"
echo "  - Region: ${DEFAULT_REGION} (서울)"
echo "  - Output: ${DEFAULT_OUTPUT}"
echo ""

# Access Key와 Secret Key 확인
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo -e "${YELLOW}⚠️ AWS Access Key와 Secret Key가 필요합니다.${NC}"
    echo ""
    echo "다음 중 하나의 방법으로 설정하세요:"
    echo ""
    echo "방법 1: 환경 변수로 설정"
    echo "  export AWS_ACCESS_KEY_ID='your-access-key-id'"
    echo "  export AWS_SECRET_ACCESS_KEY='your-secret-access-key'"
    echo ""
    echo "방법 2: aws configure 명령어 사용"
    echo "  aws configure"
    echo ""
    echo "방법 3: 이 스크립트에 환경 변수 전달"
    echo "  AWS_ACCESS_KEY_ID='xxx' AWS_SECRET_ACCESS_KEY='yyy' ./scripts/configure-aws.sh"
    echo ""
    
    # 환경 변수가 제공되었는지 확인
    if [ -n "$1" ] && [ -n "$2" ]; then
        echo -e "${GREEN}인자로 자격 증명을 받았습니다. 설정 중...${NC}"
        AWS_ACCESS_KEY_ID="$1"
        AWS_SECRET_ACCESS_KEY="$2"
    else
        echo -e "${YELLOW}자격 증명을 입력하시겠습니까? (y/n)${NC}"
        read -r response
        if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
            echo ""
            echo -n "AWS Access Key ID: "
            read -r AWS_ACCESS_KEY_ID
            echo -n "AWS Secret Access Key: "
            read -rs AWS_SECRET_ACCESS_KEY
            echo ""
        else
            echo -e "${YELLOW}자격 증명 설정을 건너뜁니다.${NC}"
            echo "나중에 'aws configure' 명령어로 설정하세요."
            exit 0
        fi
    fi
fi

# credentials 파일 생성
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
    cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = ${AWS_ACCESS_KEY_ID}
aws_secret_access_key = ${AWS_SECRET_ACCESS_KEY}
EOF
    
    chmod 600 ~/.aws/credentials
    echo -e "${GREEN}✅ 자격 증명 설정 완료${NC}"
    echo ""
    
    # 자격 증명 확인
    echo -e "${GREEN}🔍 자격 증명 확인 중...${NC}"
    if aws sts get-caller-identity &> /dev/null; then
        echo -e "${GREEN}✅ AWS 자격 증명이 올바르게 설정되었습니다!${NC}"
        aws sts get-caller-identity
    else
        echo -e "${RED}❌ 자격 증명 확인 실패. Access Key와 Secret Key를 확인하세요.${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ AWS CLI 설정 완료!${NC}"
echo ""
echo "이제 다음 명령어를 사용할 수 있습니다:"
echo "  aws ec2 describe-security-groups --region ap-northeast-2"
echo "  aws sts get-caller-identity"

