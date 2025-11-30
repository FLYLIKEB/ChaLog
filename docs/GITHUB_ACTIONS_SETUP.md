# GitHub Actions 사용 가이드

ChaLog 백엔드의 GitHub Actions 자동 배포 구조 및 사용 방법입니다.

## 현재 워크플로우 구조

### 워크플로우 파일

- 위치: `.github/workflows/deploy-backend.yml`
- 트리거: `main` 브랜치의 `backend/**` 경로 변경

### 배포 프로세스

```
코드 푸시 (main 브랜치)
  ↓
GitHub Actions 트리거
  ↓
빌드 및 패키징
  ↓
EC2 배포
  ↓
PM2 재시작
  ↓
Health Check
```

## Secrets 관리

### 현재 설정된 Secrets

GitHub 저장소 → Settings → Secrets and variables → Actions

#### 필수 Secrets

1. **EC2_SSH_KEY**
   - EC2 인스턴스 접속용 SSH 개인 키
   - 형식: 전체 개인 키 내용 (줄바꿈 포함)

2. **EC2_HOST**
   - EC2 인스턴스의 Public IP 또는 도메인
   - 예: `52.78.150.124` 또는 `api.yourdomain.com`

3. **EC2_USER**
   - EC2 인스턴스 사용자명
   - 값: `ubuntu` (Ubuntu 인스턴스)

#### 선택적 Secrets (환경 변수)

4. **EC2_DATABASE_URL**
   - 프로덕션 데이터베이스 연결 URL
   - 형식: `mysql://user:password@host:port/database`

5. **EC2_JWT_SECRET**
   - JWT 토큰 서명용 비밀키
   - 최소 32자 이상의 랜덤 문자열

6. **EC2_FRONTEND_URL**
   - 프론트엔드 URL (CORS 허용용)
   - 예: `https://cha-log-gilt.vercel.app`

7. **EC2_FRONTEND_URLS**
   - 허용할 프론트엔드 URL 목록 (쉼표로 구분)
   - 예: `https://cha-log-gilt.vercel.app,http://localhost:5173`

### Secrets 확인

```bash
# GitHub CLI 사용 (설치 필요)
gh secret list

# 또는 GitHub 웹 인터페이스
# 저장소 → Settings → Secrets and variables → Actions
```

## 배포 실행

### 자동 배포

`main` 브랜치에 `backend/**` 경로 변경사항을 푸시하면 자동 배포:

```bash
# 로컬에서
git add backend/
git commit -m "feat: 새로운 기능 추가"
git push origin main
```

### 수동 배포

1. GitHub 저장소 → **Actions** 탭
2. "Deploy Backend to EC2" 워크플로우 선택
3. **Run workflow** 버튼 클릭
4. 브랜치 선택 (보통 `main`)
5. **Run workflow** 확인

## 배포 단계 상세

### 1. 코드 체크아웃
- 저장소 코드 다운로드

### 2. Node.js 설정
- Node.js 20 설치
- npm 캐시 설정

### 3. 의존성 설치
- `npm ci --legacy-peer-deps` 실행
- 필수 패키지 확인

### 4. 빌드
- `npm run build` 실행
- TypeScript 컴파일

### 5. 배포 패키지 생성
- `dist/`, `package.json`, `package-lock.json`, `ecosystem.config.js` 포함
- `deploy.tar.gz` 생성

### 6. SSH 연결 설정
- SSH 키 설정
- EC2 호스트 키 추가
- 연결 테스트

### 7. 배포 실행
- 배포 파일 전송
- `.env` 파일 생성 (GitHub Secrets 사용)
- 의존성 설치
- PM2 재시작
- Health Check

## 배포 확인

### GitHub Actions 로그

1. GitHub 저장소 → **Actions** 탭
2. 최근 워크플로우 실행 클릭
3. 각 단계의 로그 확인

### EC2에서 확인

```bash
# SSH 접속
ssh -i ~/.ssh/summy.pem ubuntu@your-ec2-ip

# PM2 상태 확인
pm2 status

# 로그 확인
pm2 logs chalog-backend --lines 50

# Health Check
curl http://localhost:3000/health
```

## 문제 해결

### 배포 실패: SSH 연결 실패

**증상**: "Permission denied (publickey)"

**해결**:
1. `EC2_SSH_KEY` Secret 확인
   - 첫 줄: `-----BEGIN RSA PRIVATE KEY-----` 또는 `-----BEGIN OPENSSH PRIVATE KEY-----`
   - 마지막 줄: `-----END RSA PRIVATE KEY-----` 또는 `-----END OPENSSH PRIVATE KEY-----`
2. EC2 인스턴스에 공개 키 추가 확인
3. `EC2_USER` Secret 값 확인 (`ubuntu` 또는 `ec2-user`)

### 배포 실패: 빌드 오류

**증상**: `npm run build` 실패

**해결**:
1. 로컬에서 빌드 테스트:
   ```bash
   cd backend
   npm ci --legacy-peer-deps
   npm run build
   ```
2. TypeScript 오류 확인
3. `package.json` 의존성 확인

### 배포 실패: Health Check 실패

**증상**: 배포 후 Health Check 실패

**해결**:
1. EC2에서 PM2 로그 확인:
   ```bash
   pm2 logs chalog-backend --lines 100
   ```
2. 환경 변수 확인:
   ```bash
   cat /home/ubuntu/chalog-backend/.env
   ```
3. 데이터베이스 연결 확인
4. 포트 확인:
   ```bash
   sudo netstat -tlnp | grep 3000
   ```

### 배포 실패: 환경 변수 누락

**증상**: "EC2_DATABASE_URL이 설정되지 않았습니다"

**해결**:
1. GitHub Secrets에 필수 환경 변수 추가
2. Secret 이름 확인 (대소문자 구분)
3. 재배포

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

### 알림 추가

```yaml
- name: Notify deployment
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Backend 배포 완료!'
```

## 관련 문서

- [`docs/AWS_EC2_DEPLOYMENT.md`](./AWS_EC2_DEPLOYMENT.md) - EC2 배포 구조
- [`docs/ENVIRONMENT_VARIABLES.md`](./ENVIRONMENT_VARIABLES.md) - 환경 변수 가이드
- [`.github/workflows/deploy-backend.yml`](../.github/workflows/deploy-backend.yml) - 워크플로우 파일
