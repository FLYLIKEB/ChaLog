# EC2 초기 설정 실행 가이드

GitHub Actions 자동 배포를 위해 EC2 초기 설정을 실행하세요.

## 빠른 실행

EC2에 SSH 접속 후 다음 명령어를 실행하세요:

```bash
# 저장소 클론 (아직 클론하지 않은 경우)
git clone https://github.com/FLYLIKEB/ChaLog.git
cd ChaLog/backend/scripts

# 실행 권한 부여
chmod +x setup-ec2.sh check-ec2-setup.sh

# 초기 설정 실행
bash setup-ec2.sh
```

## 또는 원격에서 직접 실행

```bash
# EC2에 SSH 접속
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# 스크립트 다운로드 및 실행
curl -fsSL https://raw.githubusercontent.com/FLYLIKEB/ChaLog/main/backend/scripts/setup-ec2.sh | bash
```

## 설정 후 필수 작업

1. **환경 변수 설정**
   ```bash
   nano /home/ubuntu/chalog-backend/.env
   ```
   
   실제 RDS 엔드포인트와 비밀번호로 수정:
   ```env
   DATABASE_URL=mysql://admin:실제비밀번호@실제-rds-endpoint.rds.amazonaws.com:3306/chalog
   JWT_SECRET=실제-프로덕션-시크릿-키
   ```

2. **설정 확인**
   ```bash
   bash /home/ubuntu/ChaLog/backend/scripts/check-ec2-setup.sh
   ```

3. **GitHub Secrets 설정**
   - GitHub 저장소 → Settings → Secrets and variables → Actions
   - 다음 Secrets 추가:
     - `EC2_SSH_KEY`: SSH 개인 키 전체 내용
     - `EC2_HOST`: EC2 Public IP
     - `EC2_USER`: `ubuntu`

## 배포 테스트

설정이 완료되면 `main` 브랜치에 푸시하면 자동 배포됩니다:

```bash
# 로컬에서
git push origin main
```

GitHub Actions에서 배포 진행 상황을 확인할 수 있습니다.

