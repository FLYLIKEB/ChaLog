#!/bin/bash

# 배포 준비 스크립트
# GitHub Secrets 설정 확인 및 배포 전 체크리스트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🚀 배포 준비 체크리스트${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# SSH 키 확인
SSH_KEY="LightsailDefaultKey-ap-northeast-2.pem"
echo -e "${BLUE}📋 1단계: SSH 키 확인${NC}"

if [ -f "$SSH_KEY" ]; then
    echo -e "${GREEN}✅ SSH 키 파일 존재: $SSH_KEY${NC}"
    
    # SSH 키 형식 확인
    if grep -q "BEGIN.*PRIVATE KEY" "$SSH_KEY"; then
        KEY_TYPE=$(head -1 "$SSH_KEY" | grep -o "BEGIN [A-Z]* PRIVATE KEY" | awk '{print $2}')
        echo -e "${GREEN}✅ SSH 키 형식 확인됨: $KEY_TYPE${NC}"
        
        # SSH 키 크기 확인
        KEY_SIZE=$(wc -c < "$SSH_KEY")
        echo "   키 파일 크기: $KEY_SIZE bytes"
        echo "   키 파일 줄 수: $(wc -l < "$SSH_KEY") 줄"
        
        # 공개 키 추출 시도
        echo ""
        echo "   공개 키 정보 (GitHub Secrets에 전체 개인 키를 설정하세요):"
        PUBLIC_KEY=$(ssh-keygen -y -f "$SSH_KEY" 2>&1) || PUBLIC_KEY="추출 실패"
        if [[ "$PUBLIC_KEY" != *"추출 실패"* ]]; then
            echo -e "   ${GREEN}✅ 공개 키 추출 성공${NC}"
            echo "   공개 키 (처음 50자): ${PUBLIC_KEY:0:50}..."
        else
            echo -e "   ${YELLOW}⚠️  공개 키 추출 실패 (계속 진행)${NC}"
        fi
    else
        echo -e "${RED}❌ SSH 키 형식 오류${NC}"
    fi
else
    echo -e "${RED}❌ SSH 키 파일을 찾을 수 없습니다: $SSH_KEY${NC}"
fi

echo ""
echo -e "${BLUE}📋 2단계: GitHub Secrets 체크리스트${NC}"
echo ""
echo "다음 Secrets가 GitHub 저장소에 설정되어 있는지 확인하세요:"
echo ""
echo "필수 Secrets:"
echo "  [ ] EC2_HOST: 3.39.48.139"
echo "  [ ] EC2_USER: ubuntu"
echo "  [ ] EC2_SSH_KEY: SSH 키 전체 내용"
echo "       확인: cat $SSH_KEY"
echo "  [ ] EC2_DATABASE_URL: mysql://chalog_user:changeme_password@localhost:3306/chalog"
echo "  [ ] EC2_JWT_SECRET: JWT Secret 값"
echo ""
echo "선택적 Secrets:"
echo "  [ ] EC2_FRONTEND_URL: https://cha-log-gilt.vercel.app"
echo "  [ ] EC2_FRONTEND_URLS: https://cha-log-gilt.vercel.app,http://localhost:5173,http://localhost:5174"
echo ""
echo "설정 위치: GitHub 저장소 → Settings → Secrets and variables → Actions"
echo ""
echo -e "${YELLOW}💡 팁:${NC}"
echo "  - SSH 키 전체 내용을 복사하여 EC2_SSH_KEY Secret에 붙여넣기"
echo "  - 첫 줄과 마지막 줄도 포함해야 합니다"
echo "  - 자세한 내용: docs/deployment/GITHUB_SECRETS_CHECKLIST.md"
echo ""

echo -e "${BLUE}📋 3단계: 배포 실행 방법${NC}"
echo ""
echo "방법 1: GitHub Actions 수동 실행 (권장)"
echo "  1. GitHub 저장소 → Actions 탭"
echo "  2. 'Deploy Backend to EC2' 워크플로우 선택"
echo "  3. 'Run workflow' 버튼 클릭"
echo "  4. 브랜치 선택 (main)"
echo "  5. 'Run workflow' 클릭"
echo ""
echo "방법 2: 코드 푸시로 자동 실행"
echo "  git add backend/"
echo "  git commit -m 'feat: 배포 준비'"
echo "  git push origin main"
echo ""

echo -e "${BLUE}📋 4단계: 배포 후 확인${NC}"
echo ""
echo "배포 완료 후 다음을 확인하세요:"
echo "  1. Health check: curl http://3.39.48.139:3000/health"
echo "  2. PM2 상태: 브라우저 SSH에서 'pm2 status' 실행"
echo "  3. Nginx 설정: ./scripts/setup-nginx.sh 3.39.48.139"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 배포 준비 체크리스트 완료${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "다음 단계:"
echo "  1. GitHub Secrets 설정 확인"
echo "  2. GitHub Actions 배포 실행"
echo "  3. 배포 로그 확인"
echo ""
