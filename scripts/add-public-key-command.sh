#!/bin/bash

# Lightsail에 공개 키를 추가하는 원라인 명령어 생성 스크립트

# 환경 변수 또는 인자로 받기 (EC2_* 호환)
LIGHTSAIL_HOST="${LIGHTSAIL_HOST:-${EC2_HOST:-your-lightsail-ip}}"
LIGHTSAIL_USER="${LIGHTSAIL_USER:-${EC2_USER:-ubuntu}}"
EXISTING_KEY="${EXISTING_KEY:-$HOME/.ssh/your-key.pem}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/ec2_deploy_key}"

# 공개 키 추출
if [ ! -f "$DEPLOY_KEY" ]; then
  echo "❌ 배포 키를 찾을 수 없습니다: $DEPLOY_KEY"
  echo "사용법: EC2_HOST=your-lightsail-ip EC2_USER=ubuntu EXISTING_KEY=~/.ssh/your-key.pem DEPLOY_KEY=~/.ssh/deploy_key $0"
  exit 1
fi

PUBLIC_KEY=$(ssh-keygen -y -f "$DEPLOY_KEY")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Lightsail에 공개 키 추가 명령어"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "방법 1: 원라인 명령어 (권장)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "ssh -i $EXISTING_KEY $LIGHTSAIL_USER@$LIGHTSAIL_HOST \"echo '$PUBLIC_KEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys\""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "방법 2: Lightsail에 접속 후 수동 추가"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Lightsail에 접속:"
echo "   ssh -i $EXISTING_KEY $LIGHTSAIL_USER@$LIGHTSAIL_HOST"
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

