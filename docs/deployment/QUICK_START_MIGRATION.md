# 빠른 시작: Lightsail Docker MySQL 마이그레이션

SSH 연결 문제가 있는 경우를 포함한 모든 상황에서 마이그레이션을 실행할 수 있는 가이드입니다.

## 🚀 빠른 실행 방법

### 방법 1: 브라우저 SSH 사용 (권장 - SSH 연결 문제 시)

SSH 연결이 안 되는 경우, Lightsail 콘솔의 브라우저 SSH 기능을 사용하세요:

```bash
# 로컬에서 브라우저 가이드 실행
cd /Users/jwp/Documents/programming/ChaLog
./scripts/run-migration-via-browser.sh
```

이 스크립트는 브라우저 터미널에서 실행할 명령어들을 출력합니다.

**단계:**
1. AWS Lightsail 콘솔 접속: https://lightsail.aws.amazon.com/
2. 인스턴스 선택 (IP: YOUR_LIGHTSAIL_IP)
3. "브라우저에서 연결" 클릭
4. 출력된 명령어들을 복사하여 브라우저 터미널에 붙여넣기

### 방법 2: 직접 SSH 연결 (연결 가능한 경우)

```bash
cd /Users/jwp/Documents/programming/ChaLog

# 연결 확인
./scripts/check-lightsail-connection.sh

# 연결이 성공하면 마이그레이션 실행
./scripts/execute-migration-plan.sh
```

### 방법 3: 단계별 수동 실행

각 단계를 개별적으로 실행:

```bash
# 1. SSH 접속 후 마이그레이션 실행
ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@YOUR_LIGHTSAIL_IP
cd /home/ubuntu/chalog-backend
export $(cat .env | xargs)
npx typeorm-ts-node-commonjs migration:run -d dist/src/database/data-source.js

# 2. Nginx 설정
./scripts/setup-nginx.sh YOUR_LIGHTSAIL_IP
```

## 📋 준비된 스크립트

| 스크립트 | 용도 |
|---------|------|
| `scripts/check-lightsail-connection.sh` | SSH 연결 확인 및 문제 진단 |
| `scripts/setup-nginx.sh` | Nginx 설정 및 활성화 |
| `scripts/execute-migration-plan.sh` | 전체 프로세스 자동화 |
| `scripts/run-migration-via-browser.sh` | 브라우저 SSH용 마이그레이션 명령어 생성 |

## ⚠️ 문제 해결

### SSH 연결 실패

**증상:** `Connection timed out` 또는 `Connection refused`

**해결 방법:**
1. Lightsail 인스턴스가 실행 중인지 확인
2. 브라우저 SSH 사용: `./scripts/run-migration-via-browser.sh`
3. 네트워크 연결 확인
4. SSH 키 권한 확인: `chmod 400 LightsailDefaultKey-ap-northeast-2.pem`

### Docker MySQL 연결 실패

**증상:** `ERROR 2003` 또는 `Access denied`

**해결 방법:**
1. Docker MySQL 컨테이너 실행 확인: `docker ps | grep chalog-mysql`
2. `.env`의 `DATABASE_URL` 확인: `mysql://chalog_user:changeme_password@chalog-mysql:3306/chalog`
3. 컨테이너 재시작: `docker compose up -d mysql`

### Docker MySQL 컨테이너 없음

**증상:** `Docker MySQL 컨테이너가 실행 중이 아닙니다`

**해결 방법:**
```bash
# Lightsail에서 실행
cd /home/ubuntu/chalog-backend
docker compose up -d mysql
```

## ✅ 체크리스트

마이그레이션 전 확인:

- [ ] Lightsail 인스턴스 실행 중
- [ ] Docker MySQL 컨테이너 실행 중 (`docker ps | grep chalog-mysql`)
- [ ] SSH 키 권한 설정됨 (`chmod 400`)
- [ ] GitHub Secrets 설정 완료 (배포용)

마이그레이션 후 확인:

- [ ] 마이그레이션 완료
- [ ] Docker MySQL에 테이블 확인
- [ ] 애플리케이션 배포 완료
- [ ] Health check 통과 (`curl http://YOUR_LIGHTSAIL_IP/health`)
- [ ] Nginx 설정 완료
- [ ] 모든 기능 테스트 완료

## 📚 상세 문서

- **전체 실행 가이드**: `docs/deployment/MIGRATION_EXECUTION_GUIDE.md`
- **GitHub Secrets 설정**: `docs/deployment/GITHUB_SECRETS_SETUP.md`
- **Docker MySQL 설정**: `docs/deployment/LIGHTSAIL_DOCKER_MYSQL.md`

## 🆘 도움이 필요하신가요?

문제가 계속되면:

1. 연결 확인: `./scripts/check-lightsail-connection.sh`
2. 브라우저 SSH 사용: `./scripts/run-migration-via-browser.sh`
3. 로그 확인:
   - PM2: `pm2 logs chalog-backend`
   - Nginx: `sudo tail -f /var/log/nginx/chalog-backend-error.log`
   - MySQL: `docker logs chalog-mysql`
