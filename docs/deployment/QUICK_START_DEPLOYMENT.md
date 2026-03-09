# 빠른 배포 시작 가이드

Lightsail Docker MySQL 배포를 빠르게 시작하는 가이드입니다.

## 사전 준비 (5분)

### 1. GitHub Secrets 확인

GitHub 저장소 → Settings → Secrets and variables → Actions에서 다음 Secrets 확인:

- ✅ `EC2_HOST`: Lightsail Public IP (예: `3.39.48.139`)
- ✅ `EC2_USER`: `ubuntu` (Lightsail SSH 사용자명)
- ✅ `EC2_SSH_KEY`: Lightsail SSH 키 전체 내용
- ✅ `EC2_DATABASE_URL`: `mysql://chalog_user:changeme_password@localhost:3306/chalog`
- ✅ `EC2_JWT_SECRET`: JWT Secret 값

**자세한 내용**: [GitHub Secrets 체크리스트](./GITHUB_SECRETS_CHECKLIST.md)

### 2. Docker MySQL 컨테이너 확인

```bash
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.39.48.139
docker ps | grep chalog-mysql
```

컨테이너가 실행 중이 아니면:

```bash
cd /home/ubuntu/chalog-backend
docker-compose up -d mysql
```

## 배포 실행 (10분)

### 방법 1: GitHub Actions 자동 배포 (권장)

1. GitHub 저장소 → **Actions** 탭
2. "Deploy Backend to EC2" 워크플로우 선택
3. **Run workflow** 버튼 클릭
4. 브랜치 선택 (`main`)
5. **Run workflow** 클릭
6. 배포 완료 대기 (약 5-10분)

**자세한 내용**: [배포 실행 가이드](./DEPLOYMENT_EXECUTION_GUIDE.md)

### 방법 2: 코드 푸시로 자동 배포

```bash
git add backend/
git commit -m "feat: 배포 준비"
git push origin main
```

`backend/**` 경로 변경사항이 `main` 브랜치에 푸시되면 자동 배포됩니다.

## 배포 후 설정 (5분)

### 1. Nginx 설정

```bash
./scripts/setup-nginx.sh 3.39.48.139
```

**자세한 내용**: [Nginx 설정 가이드](./NGINX_SETUP_GUIDE.md)

### 2. Health Check 확인

```bash
# 직접 접근
curl http://3.39.48.139:3000/health

# Nginx를 통한 접근
curl http://3.39.48.139/health
```

예상 응답:

```json
{
  "status": "ok",
  "timestamp": "2026-03-05T12:00:00.000Z"
}
```

## 테스트 (5분)

### 1. 기본 확인

```bash
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.39.48.139

# PM2 상태
pm2 status

# Docker MySQL 컨테이너
docker ps | grep chalog-mysql
```

### 2. API 테스트

```bash
# Health check
curl http://3.39.48.139/health

# API 엔드포인트 (예시)
curl http://3.39.48.139/api/...
```

**자세한 내용**: [테스트 가이드](./TESTING_GUIDE.md)

## 모니터링

### 실시간 모니터링

```bash
# PM2 모니터링
pm2 monit

# 시스템 리소스
htop

# Docker 리소스
docker stats chalog-mysql
```

**자세한 내용**: [모니터링 가이드](./MONITORING_GUIDE.md)

## 문제 해결

### 배포 실패

1. GitHub Actions 로그 확인
2. [배포 실행 가이드 - 문제 해결](./DEPLOYMENT_EXECUTION_GUIDE.md#문제-해결) 참고

### Health Check 실패

1. PM2 상태 확인: `pm2 status`
2. 로그 확인: `pm2 logs chalog-backend`
3. [테스트 가이드 - 문제 해결](./TESTING_GUIDE.md#문제-해결) 참고

### 데이터베이스 연결 실패

1. Docker MySQL 컨테이너 확인: `docker ps | grep chalog-mysql`
2. 환경 변수 확인: `cat /home/ubuntu/chalog-backend/.env`
3. [테스트 가이드 - 데이터베이스 연결 테스트](./TESTING_GUIDE.md#데이터베이스-연결-테스트) 참고

## 체크리스트

배포 완료 후 확인:

- [ ] GitHub Secrets 설정 완료
- [ ] Docker MySQL 컨테이너 실행 중
- [ ] GitHub Actions 배포 성공
- [ ] PM2 프로세스 실행 중
- [ ] Health check 통과
- [ ] Nginx 설정 완료
- [ ] API 엔드포인트 정상 작동
- [ ] 데이터베이스 연결 정상
- [ ] 로그에 에러 없음

## 다음 단계

1. ✅ 정기적인 모니터링 설정
2. ✅ 백업 스크립트 확인
3. ✅ 비밀번호 변경 (프로덕션용)
4. ✅ 인스턴스 업그레이드 고려 (1GB → 2GB RAM)

## 관련 문서

- [GitHub Secrets 체크리스트](./GITHUB_SECRETS_CHECKLIST.md)
- [배포 실행 가이드](./DEPLOYMENT_EXECUTION_GUIDE.md)
- [Nginx 설정 가이드](./NGINX_SETUP_GUIDE.md)
- [테스트 가이드](./TESTING_GUIDE.md)
- [모니터링 가이드](./MONITORING_GUIDE.md)
- [Lightsail Docker MySQL 가이드](./LIGHTSAIL_DOCKER_MYSQL.md)
