# GitHub Actions 자동 배포 설정 가이드

ChaLog 백엔드를 GitHub Actions를 통해 EC2에 자동 배포하는 설정 가이드입니다.

## 사전 준비사항

1. EC2 인스턴스가 설정되어 있어야 합니다
2. EC2에 Node.js, PM2가 설치되어 있어야 합니다
3. EC2에 프로젝트 디렉토리가 생성되어 있어야 합니다 (`/home/ubuntu/chalog-backend`)

## 1단계: GitHub Secrets 설정

GitHub 저장소에서 다음 Secrets를 설정해야 합니다:

### Settings → Secrets and variables → Actions → New repository secret

### 필수 Secrets 체크리스트

#### 1. EC2_SSH_KEY ⚠️ 가장 중요

**설정 방법:**
1. 로컬에서 SSH 키 파일 열기:
   ```bash
   cat ~/.ssh/your-key.pem
   ```

2. **전체 내용 복사** (줄바꿈 포함):
   - `-----BEGIN RSA PRIVATE KEY-----` 부터 시작
   - `-----END RSA PRIVATE KEY-----` 까지 끝
   - 중간의 모든 줄 포함

3. GitHub 저장소 → Settings → Secrets and variables → Actions
4. New repository secret 클릭
5. Name: `EC2_SSH_KEY`
6. Secret: 복사한 전체 키 내용 붙여넣기
7. Add secret 클릭

**확인 방법:**
- Secret 저장 후 다시 열어서 첫 줄이 `-----BEGIN`로 시작하는지 확인
- 마지막 줄이 `-----END`로 끝나는지 확인

#### 2. EC2_HOST

**설정 방법:**
1. AWS 콘솔 → EC2 → Instances
2. 인스턴스 선택 → Public IPv4 address 복사
3. GitHub Secrets에 추가:
   - Name: `EC2_HOST`
   - Secret: 예) `54.123.45.67` 또는 `api.yourdomain.com`

#### 3. EC2_USER ⚠️ 중요

**설정 방법:**
1. GitHub Secrets에 추가:
   - Name: `EC2_USER` (정확히 이 이름으로)
   - Secret: `ubuntu` (Ubuntu 인스턴스인 경우)
   - 또는 `ec2-user` (Amazon Linux인 경우)

**주의사항:**
- Secret 값에 공백이나 줄바꿈이 없어야 합니다
- 정확히 `ubuntu` 또는 `ec2-user`만 입력하세요

### 선택적 Secrets (환경 변수 관리용)

환경 변수를 GitHub Secrets로 관리하려면:

#### 4. EC2_DATABASE_URL (선택사항) 🔴

**설명**: 프로덕션 RDS 데이터베이스 연결 URL

**형식**:
```
mysql://<사용자명>:<비밀번호>@<RDS엔드포인트>:3306/chalog
```

**예시**:
```
mysql://admin:MySecurePassword123@chalog-db.xxxxx.ap-northeast-2.rds.amazonaws.com:3306/chalog
```

**주의사항:**
- 비밀번호에 특수문자가 포함된 경우 URL 인코딩 필요 (`@` → `%40`, `#` → `%23` 등)
- 실제 프로덕션 비밀번호 사용 (예시 값 사용 금지)

#### 5. EC2_JWT_SECRET (선택사항) 🔴

**설명**: JWT 토큰 서명용 비밀키

**형식**: 강력한 랜덤 문자열 (최소 32자 이상 권장)

**생성 방법**:
```bash
# OpenSSL 사용 (권장)
openssl rand -base64 32

# Node.js 사용
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**주의사항:**
- 프로덕션 환경에서는 반드시 강력한 랜덤 값 사용
- 예시 값 사용 금지
- 한 번 설정하면 변경하지 않는 것이 좋음 (기존 토큰이 무효화됨)

#### 6. EC2_FRONTEND_URL (선택사항) 🟡

**설명**: 메인 프론트엔드 URL (CORS 허용용)

**형식**: 프론트엔드 도메인 URL

**예시**:
```
https://cha-log-gilt.vercel.app
```

#### 7. EC2_FRONTEND_URLS (선택사항) 🟡

**설명**: 허용할 프론트엔드 URL 목록 (CORS 허용용, 쉼표로 구분)

**형식**: 여러 URL을 쉼표로 구분

**예시**:
```
https://cha-log-gilt.vercel.app,http://localhost:5173,http://localhost:5174
```

**주의사항:**
- 각 URL 사이에 공백 없이 쉼표(`,`)로만 구분
- 설정하지 않으면 기본값 사용

### 설정 확인

모든 Secrets를 설정한 후:

1. GitHub 저장소 → Actions 탭
2. "Deploy Backend to EC2" 워크플로우 클릭
3. "Run workflow" 클릭하여 수동 실행
4. 로그에서 "환경 변수 확인" 단계 확인:
   - 모든 변수가 "설정됨"으로 표시되어야 함

> **참고**: 환경 변수는 EC2에 직접 `.env` 파일로 설정하는 것을 권장합니다. (더 안전함)

## 2단계: EC2 초기 설정

### 방법 1: 자동 설정 스크립트 사용 (권장)

EC2에 SSH 접속하여:

```bash
# 설정 스크립트 다운로드 및 실행
cd /tmp
wget https://raw.githubusercontent.com/your-username/ChaLog/main/backend/scripts/setup-ec2.sh
chmod +x setup-ec2.sh
bash setup-ec2.sh
```

또는 저장소를 클론한 경우:

```bash
git clone https://github.com/your-username/ChaLog.git
cd ChaLog/backend/scripts
chmod +x setup-ec2.sh
bash setup-ec2.sh
```

### 방법 2: 수동 설정

EC2에 SSH 접속하여:

```bash
# Node.js 20 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 설치
sudo npm install -g pm2

# PM2 부팅 시 자동 시작 설정
pm2 startup
# 출력된 명령어 실행 (sudo 권한 필요)

# 프로젝트 디렉토리 생성
mkdir -p /home/ubuntu/chalog-backend
```

### 2.3 환경 변수 설정

```bash
nano /home/ubuntu/chalog-backend/.env
```

```env
DATABASE_URL=mysql://admin:password@your-rds-endpoint.rds.amazonaws.com:3306/chalog
DB_SYNCHRONIZE=false
DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=false
JWT_SECRET=your-production-secret-key
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://cha-log-gilt.vercel.app
FRONTEND_URLS=https://cha-log-gilt.vercel.app,http://localhost:5173
```

### 2.4 설정 확인

```bash
# 설정 확인 스크립트 실행
cd /tmp
wget https://raw.githubusercontent.com/your-username/ChaLog/main/backend/scripts/check-ec2-setup.sh
chmod +x check-ec2-setup.sh
bash check-ec2-setup.sh
```

## 3단계: 워크플로우 파일 확인

`.github/workflows/deploy-backend.yml` 파일이 올바르게 생성되었는지 확인합니다.

## 4단계: 배포 테스트

### 자동 배포

`main` 브랜치의 `backend/` 디렉토리에 변경사항을 푸시하면 자동으로 배포됩니다:

```bash
# 테스트용 변경사항 생성 (예: 주석 추가)
echo "# GitHub Actions 배포 테스트" >> backend/README.md

git add backend/
git commit -m "test: GitHub Actions 자동 배포 테스트"
git push origin main
```

### 수동 배포

GitHub 저장소 → Actions 탭 → "Deploy Backend to EC2" → "Run workflow" 클릭

### 배포 확인

배포가 완료되면:

1. **GitHub Actions 로그 확인**
   - GitHub 저장소 → Actions 탭
   - 최근 워크플로우 실행 클릭
   - 각 단계의 로그 확인

2. **EC2에서 확인**
   ```bash
   ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
   
   # PM2 상태 확인
   pm2 status
   
   # 로그 확인
   pm2 logs chalog-backend
   
   # Health check
   curl http://localhost:3000/health
   ```

## 5단계: 배포 확인

### GitHub Actions 로그 확인

1. GitHub 저장소 → Actions 탭
2. 최근 워크플로우 실행 클릭
3. 각 단계의 로그 확인

### EC2에서 확인

```bash
# SSH 접속
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# PM2 상태 확인
pm2 status

# 로그 확인
pm2 logs chalog-backend

# Health check
curl http://localhost:3000/health
```

## 문제 해결

### SSH 연결 실패

**증상**: `Permission denied (publickey)`

**해결**:
1. `EC2_SSH_KEY` Secret이 올바르게 설정되었는지 확인
2. SSH 키 형식 확인 (전체 내용 포함)
3. EC2 보안 그룹에서 GitHub Actions IP 허용 확인

### 배포 실패

**증상**: 빌드 또는 배포 단계 실패

**해결**:
1. GitHub Actions 로그 확인
2. EC2에서 수동으로 빌드 테스트:
   ```bash
   cd /home/ubuntu/chalog-backend
   npm ci
   npm run build
   ```

### PM2 실행 실패

**증상**: `pm2: command not found`

**해결**:
```bash
# EC2에서 PM2 재설치
sudo npm install -g pm2
pm2 startup
```

### Health Check 실패

**증상**: 배포 후 Health check 실패

**해결**:
1. PM2 로그 확인: `pm2 logs chalog-backend`
2. 환경 변수 확인: `cat /home/ubuntu/chalog-backend/.env`
3. 포트 확인: `sudo netstat -tlnp | grep 3000`

## 보안 권장사항

1. **SSH 키 보안**
   - GitHub Secrets에만 저장
   - 로컬에 백업 보관
   - 정기적으로 키 로테이션

2. **환경 변수 관리**
   - 민감한 정보는 GitHub Secrets 또는 EC2 `.env` 파일에 저장
   - `.env` 파일은 `.gitignore`에 포함

3. **EC2 보안 그룹**
   - SSH 포트(22)는 특정 IP만 허용
   - 백엔드 포트(3000)는 필요시에만 열기

4. **PM2 보안**
   - 프로덕션 환경에서는 `pm2` 사용자 권한으로 실행 고려

## 워크플로우 커스터마이징

### 특정 브랜치만 배포

`.github/workflows/deploy-backend.yml`에서:

```yaml
on:
  push:
    branches:
      - main
      - production  # 추가 브랜치
```

### 배포 전 테스트 실행

```yaml
- name: Run tests
  working-directory: ./backend
  run: npm test
```

### 알림 추가 (Slack, Discord 등)

```yaml
- name: Notify deployment
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Backend 배포 완료!'
```

## 참고 자료

- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [PM2 문서](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [AWS EC2 문서](https://docs.aws.amazon.com/ec2/)

