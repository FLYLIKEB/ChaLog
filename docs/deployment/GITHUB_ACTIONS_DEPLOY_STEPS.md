# GitHub Actions 배포 실행 단계

GitHub Actions를 통한 배포 실행 방법입니다.

## 사전 준비 확인

배포 전에 다음을 확인하세요:

1. **GitHub Secrets 설정 완료**
   - GitHub 저장소 → Settings → Secrets and variables → Actions
   - 필수 Secrets 모두 설정되어 있는지 확인
   - 자세한 내용: [GitHub Secrets 체크리스트](./GITHUB_SECRETS_CHECKLIST.md)

2. **배포 준비 스크립트 실행** (선택사항)
   ```bash
   ./scripts/prepare-deployment.sh
   ```

## 배포 실행 방법

### 방법 1: GitHub Actions 수동 실행 (권장)

**단계별 가이드:**

1. **GitHub 저장소 접속**
   - 웹 브라우저에서 GitHub 저장소 열기

2. **Actions 탭 클릭**
   - 저장소 상단 메뉴에서 "Actions" 탭 선택

3. **워크플로우 선택**
   - 왼쪽 사이드바에서 "Deploy Backend to Lightsail" 워크플로우 클릭
   - 또는 최근 실행 목록에서 선택

4. **수동 실행 시작**
   - 오른쪽 상단의 **"Run workflow"** 버튼 클릭
   - 드롭다운 메뉴가 열림

5. **브랜치 선택**
   - "Use workflow from" 드롭다운에서 `main` 브랜치 선택
   - (기본값이 `main`일 수 있음)

6. **워크플로우 실행**
   - **"Run workflow"** 버튼 클릭
   - 워크플로우 실행이 시작됨

7. **배포 진행 상황 확인**
   - 워크플로우 실행이 시작되면 실행 목록에 표시됨
   - 실행 항목을 클릭하여 상세 로그 확인
   - 배포 완료까지 약 5-10분 소요

### 방법 2: 코드 푸시로 자동 실행

`main` 브랜치에 `backend/**` 경로 변경사항을 푸시하면 자동 배포됩니다:

```bash
# 변경사항 스테이징
git add backend/

# 커밋
git commit -m "feat: 배포 준비"

# 푸시 (자동 배포 트리거)
git push origin main
```

**주의**: 
- `backend/**` 경로의 파일만 변경되어야 자동 배포가 트리거됩니다
- 다른 경로의 파일만 변경되면 배포되지 않습니다

## 배포 로그 확인

### 실시간 로그 확인

1. **워크플로우 실행 페이지 접속**
   - Actions 탭 → 실행 중인 워크플로우 클릭

2. **단계별 로그 확인**
   - 왼쪽 사이드바에서 각 단계 클릭하여 로그 확인
   - 주요 확인 단계:
     - "Configure SSH" - SSH 연결 확인
     - "Build application" - 빌드 성공 여부
     - "Deploy to Lightsail" - 배포 진행 상황
     - "Deploy to Lightsail" (두 번째) - 마이그레이션 및 PM2 시작

### 확인할 주요 메시지

**성공 메시지:**
```
✅ 모든 필수 Secrets가 설정되었습니다!
✅ SSH 연결 성공!
✅ 빌드 완료
✅ 마이그레이션 완료
✅ 배포 성공! Health check 통과
```

**실패 시 확인할 메시지:**
```
❌ 필수 Secrets가 설정되지 않았습니다!
❌ SSH 연결 실패
❌ 빌드 실패
⚠️ 마이그레이션 실행 중 오류 발생
⚠️ Health check 실패
```

## 배포 프로세스 단계

GitHub Actions 워크플로우는 다음 단계를 수행합니다:

1. **코드 체크아웃**
   - 저장소 코드 다운로드

2. **의존성 설치**
   - `npm ci` 실행
   - 필수 패키지 확인

3. **애플리케이션 빌드**
   - `npm run build` 실행
   - TypeScript 컴파일

4. **배포 패키지 생성**
   - `dist`, `migrations`, `data-source.ts` 포함
   - `deploy.tar.gz` 생성

5. **SSH 연결 및 파일 전송**
   - Lightsail 인스턴스에 SSH 연결
   - 배포 파일 전송

6. **환경 변수 설정**
   - `.env` 파일 생성
   - `DATABASE_URL` 등 설정

7. **의존성 설치**
   - 서버에서 `npm ci` 실행

8. **마이그레이션 실행**
   - TypeORM 마이그레이션 실행

9. **PM2 시작**
   - `ecosystem.config.js` 사용
   - 애플리케이션 시작

10. **Health Check**
    - `http://localhost:3000/health` 확인
    - 성공 시 배포 완료

## 배포 실패 시 해결 방법

### SSH 연결 실패

**증상**: `❌ SSH 연결 실패`

**해결 방법**:
1. `EC2_SSH_KEY` Secret 확인 (Lightsail SSH 키)
   - GitHub 저장소 → Settings → Secrets → EC2_SSH_KEY
   - SSH 키 전체 내용이 포함되어 있는지 확인
   - 첫 줄과 마지막 줄도 포함되어야 함

2. `EC2_HOST` Secret 확인 (Lightsail Public IP)
   - 값이 `YOUR_LIGHTSAIL_IP`인지 확인

3. Lightsail 인스턴스 상태 확인
   - 인스턴스가 Running 상태인지 확인
   - 네트워킹 설정에서 SSH(포트 22) 규칙 확인

### 빌드 실패

**증상**: `❌ npm run build 실패`

**해결 방법**:
1. 로컬에서 빌드 테스트:
   ```bash
   cd backend
   npm ci
   npm run build
   ```

2. `package.json` 확인
3. TypeScript 오류 확인

### 마이그레이션 실패

**증상**: `⚠️ 마이그레이션 실행 중 오류 발생`

**해결 방법**:
1. 브라우저 SSH에서 수동 실행:
   ```bash
   cd /home/ubuntu/chalog-backend
   export $(cat .env | xargs)
   npx typeorm-ts-node-commonjs migration:run -d dist/src/database/data-source.ts
   ```

2. 데이터베이스 연결 확인:
   ```bash
   docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "SELECT 1"
   ```

### Health Check 실패

**증상**: `⚠️ Health check 실패`

**해결 방법**:
1. 브라우저 SSH에서 PM2 상태 확인:
   ```bash
   pm2 status
   pm2 logs chalog-backend --lines 50
   ```

2. 애플리케이션 재시작:
   ```bash
   pm2 restart chalog-backend
   ```

## 배포 성공 후 확인

배포가 성공하면 다음을 확인하세요:

1. **Health Check**
   ```bash
   curl http://YOUR_LIGHTSAIL_IP:3000/health
   ```

2. **브라우저 SSH에서 확인**
   ```bash
   pm2 status
   pm2 logs chalog-backend --lines 50
   ```

3. **Nginx 설정** (한 번만 실행)
   - 로컬 SSH 가능: `./scripts/setup-nginx.sh YOUR_LIGHTSAIL_IP`
   - 브라우저 SSH: [Nginx 설정 가이드](./NGINX_SETUP_GUIDE.md) 참고

## 관련 문서

- [GitHub Secrets 체크리스트](./GITHUB_SECRETS_CHECKLIST.md)
- [배포 실행 가이드](./DEPLOYMENT_EXECUTION_GUIDE.md)
- [배포 체크리스트](./DEPLOYMENT_CHECKLIST.md)
- [빠른 배포 시작 가이드](./QUICK_START_DEPLOYMENT.md)
