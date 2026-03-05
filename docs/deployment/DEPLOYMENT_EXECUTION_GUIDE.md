# 배포 실행 가이드

Lightsail Docker MySQL 배포를 실행하는 단계별 가이드입니다.

## 사전 준비

### 1. GitHub Secrets 확인

배포 전에 다음 Secrets가 설정되어 있는지 확인하세요:

- `EC2_HOST`: `3.39.48.139`
- `EC2_USER`: `ubuntu`
- `EC2_SSH_KEY`: Lightsail SSH 키 전체 내용
- `EC2_DATABASE_URL`: `mysql://chalog_user:changeme_password@localhost:3306/chalog`
- `EC2_JWT_SECRET`: JWT Secret 값

**확인 방법**: [GitHub Secrets 체크리스트](./GITHUB_SECRETS_CHECKLIST.md)

### 2. Docker MySQL 컨테이너 확인

Lightsail 인스턴스에서 Docker MySQL 컨테이너가 실행 중인지 확인:

```bash
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.39.48.139
docker ps | grep chalog-mysql
```

컨테이너가 실행 중이 아니면:

```bash
cd /home/ubuntu/chalog-backend
docker-compose up -d mysql
```

## 배포 실행

### 방법 1: GitHub Actions 자동 배포 (권장)

#### 자동 트리거

`main` 브랜치에 `backend/**` 경로 변경사항을 푸시하면 자동 배포됩니다:

```bash
git add backend/
git commit -m "feat: 배포 준비"
git push origin main
```

#### 수동 실행

1. GitHub 저장소 → **Actions** 탭
2. "Deploy Backend to EC2" 워크플로우 선택
3. **Run workflow** 버튼 클릭
4. 브랜치 선택 (보통 `main`)
5. **Run workflow** 클릭

### 방법 2: 로컬에서 배포 스크립트 실행

로컬에서 배포를 직접 실행하려면:

```bash
# 배포 스크립트 실행 (있는 경우)
./scripts/deploy-to-lightsail.sh
```

## 배포 프로세스

GitHub Actions 워크플로우는 다음 단계를 수행합니다:

1. ✅ 코드 체크아웃 및 의존성 설치
2. ✅ 애플리케이션 빌드 (`npm run build`)
3. ✅ 배포 패키지 생성 (`deploy.tar.gz`)
4. ✅ SSH를 통한 Lightsail 연결 및 파일 전송
5. ✅ `.env` 파일 생성 (`DATABASE_URL` 포함)
6. ✅ 의존성 설치 (`npm ci`)
7. ✅ TypeORM 마이그레이션 실행
8. ✅ PM2로 애플리케이션 시작
9. ✅ Health check 확인

## 배포 후 확인

### 1. GitHub Actions 로그 확인

GitHub Actions 워크플로우 실행 로그에서 다음을 확인:

- ✅ 빌드 성공
- ✅ SSH 연결 성공
- ✅ 배포 파일 전송 성공
- ✅ 마이그레이션 실행 성공
- ✅ Health check 통과

### 2. Lightsail 인스턴스에서 확인

```bash
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.39.48.139

# PM2 상태 확인
pm2 status

# PM2 로그 확인
pm2 logs chalog-backend --lines 50

# 애플리케이션 프로세스 확인
ps aux | grep node

# 포트 3000 리스닝 확인
sudo netstat -tlnp | grep 3000
```

### 3. Health Check

```bash
# 직접 접근
curl http://3.39.48.139:3000/health

# 또는 브라우저에서
# http://3.39.48.139:3000/health
```

예상 응답:

```json
{
  "status": "ok",
  "timestamp": "2026-03-05T12:00:00.000Z"
}
```

## 문제 해결

### 배포 실패

#### SSH 연결 실패

**증상**: `❌ SSH 연결 테스트 실패`

**해결 방법**:
1. `EC2_SSH_KEY` Secret 확인
2. Lightsail 인스턴스의 보안 그룹에서 SSH(22번 포트) 허용 확인
3. `EC2_USER` 값 확인 (`ubuntu`)

#### 빌드 실패

**증상**: `❌ npm ci 실패` 또는 `❌ npm run build 실패`

**해결 방법**:
1. `backend/package.json` 확인
2. `backend/package-lock.json` 확인
3. 로컬에서 빌드 테스트:
   ```bash
   cd backend
   npm ci --legacy-peer-deps
   npm run build
   ```

#### 마이그레이션 실패

**증상**: `⚠️ 마이그레이션 실행 중 오류 발생`

**해결 방법**:
1. Lightsail 인스턴스에서 수동 실행:
   ```bash
   cd /home/ubuntu/chalog-backend
   export $(cat .env | xargs)
   npx typeorm-ts-node-commonjs migration:run -d dist/src/database/data-source.ts
   ```
2. 마이그레이션 파일 확인:
   ```bash
   ls -la migrations/
   ```
3. 데이터베이스 연결 확인:
   ```bash
   docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "SELECT 1"
   ```

#### Health Check 실패

**증상**: `⚠️ Health check 실패`

**해결 방법**:
1. PM2 로그 확인:
   ```bash
   pm2 logs chalog-backend --lines 100
   ```
2. 애플리케이션 프로세스 확인:
   ```bash
   pm2 status
   ```
3. 포트 확인:
   ```bash
   sudo netstat -tlnp | grep 3000
   ```
4. 데이터베이스 연결 확인:
   ```bash
   docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "SHOW DATABASES;"
   ```

### 애플리케이션이 시작되지 않음

1. PM2 재시작:
   ```bash
   pm2 restart chalog-backend
   pm2 logs chalog-backend
   ```

2. 수동 시작:
   ```bash
   cd /home/ubuntu/chalog-backend
   export $(cat .env | xargs)
   node dist/src/main.js
   ```

3. 환경 변수 확인:
   ```bash
   cat .env
   ```

## 다음 단계

배포가 성공하면:

1. ✅ Nginx 설정 실행 (`scripts/setup-nginx.sh`)
2. ✅ API 엔드포인트 테스트
3. ✅ 모니터링 설정
4. ✅ 백업 확인

자세한 내용은 [Lightsail Docker MySQL 가이드](./LIGHTSAIL_DOCKER_MYSQL.md)를 참고하세요.
