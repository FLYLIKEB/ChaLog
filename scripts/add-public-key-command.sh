#!/bin/bash

# EC2에 공개 키를 추가하는 원라인 명령어 생성 스크립트

# 환경 변수 또는 인자로 받기
EC2_HOST="${EC2_HOST:-your-ec2-ip}"
EC2_USER="${EC2_USER:-ubuntu}"
EXISTING_KEY="${EXISTING_KEY:-$HOME/.ssh/your-key.pem}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/ec2_deploy_key}"

# 공개 키 추출
if [ ! -f "$DEPLOY_KEY" ]; then
  echo "❌ 배포 키를 찾을 수 없습니다: $DEPLOY_KEY"
  echo "사용법: EC2_HOST=your-ec2-ip EC2_USER=ubuntu EXISTING_KEY=~/.ssh/your-key.pem DEPLOY_KEY=~/.ssh/ec2_deploy_key $0"
  exit 1
fi

PUBLIC_KEY=$(ssh-keygen -y -f "$DEPLOY_KEY")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "EC2에 공개 키 추가 명령어"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "방법 1: 원라인 명령어 (권장)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "ssh -i $EXISTING_KEY $EC2_USER@$EC2_HOST \"echo '$PUBLIC_KEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys\""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "방법 2: EC2에 접속 후 수동 추가"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. EC2에 접속:"
echo "   ssh -i $EXISTING_KEY $EC2_USER@$EC2_HOST"
echo ""
echo "2. 공개 키 추가:"
echo "   echo '$PUBLIC_KEY' >> ~/.ssh/authorized_keys"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "공개 키 내용:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$PUBLIC_KEY"
echo ""

