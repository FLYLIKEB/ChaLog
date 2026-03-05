# SSH 연결 문제 해결 가이드

Lightsail 인스턴스에 SSH 연결이 안 될 때 해결 방법입니다.

## 증상

- `Connection timed out during banner exchange`
- `Connection to 3.39.48.139 port 22 timed out`
- 포트 22는 열려있지만 SSH 연결 실패

## 해결 방법

### 1. Lightsail 인스턴스 상태 확인

**AWS Lightsail 콘솔에서 확인:**

1. https://lightsail.aws.amazon.com/ 접속
2. 인스턴스 선택 (IP: 3.39.48.139)
3. 상태 확인:
   - ✅ **Running** (실행 중) → 다음 단계로
   - ❌ **Stopped** (중지됨) → "Start" 버튼 클릭하여 시작

### 2. 네트워킹 설정 확인

**Lightsail 콘솔 → 네트워킹 탭:**

1. **브라우저 SSH 설정 확인:**
   - "Allow Lightsail browser SSH" 옵션이 활성화되어 있는지 확인
   - ✅ **활성화 권장**: 브라우저 SSH와 로컬 SSH 모두 사용 가능
   - ❌ 비활성화: 브라우저 SSH만 차단 (로컬 SSH는 여전히 작동해야 함)
   - **참고**: 이 옵션은 브라우저 SSH만 제어하며, 로컬 Terminal이나 다른 SSH 클라이언트에는 영향을 주지 않습니다

2. **방화벽 규칙 확인:**
   - SSH (포트 22) 규칙이 있는지 확인:
     - 애플리케이션: `Custom`
     - 프로토콜: `TCP`
     - 포트 범위: `22`
     - 소스: `Anywhere (0.0.0.0/0)` 또는 특정 IP

3. **규칙이 없으면 추가:**
   - "Add rule" 클릭
   - 애플리케이션: `SSH`
   - 소스: `Anywhere (0.0.0.0/0)`
   - "Create" 클릭

### 3. 브라우저 SSH 활성화 및 사용

**브라우저 SSH 활성화:**

1. Lightsail 콘솔 → 인스턴스 선택
2. **네트워킹** 탭 클릭
3. "Allow Lightsail browser SSH" 옵션 확인/활성화
   - ✅ 체크되어 있으면 브라우저 SSH 사용 가능
   - ❌ 체크 해제되어 있으면 활성화 필요

**브라우저 SSH 사용:**

로컬 SSH가 안 될 때 Lightsail 콘솔의 브라우저 SSH를 사용:

1. Lightsail 콘솔 → 인스턴스 선택
2. "브라우저에서 연결" 버튼 클릭
3. 브라우저 터미널이 열림
4. 필요한 명령어 실행

**참고**: 
- 브라우저 SSH 활성화는 브라우저 기반 SSH 클라이언트만 제어합니다
- 로컬 Terminal, PuTTY 등 다른 SSH 클라이언트는 이 설정과 무관하게 작동합니다
- 로컬 SSH 연결 문제는 보통 방화벽 규칙이나 인스턴스 상태 문제입니다

**브라우저 SSH에서 확인할 명령어:**

```bash
# 시스템 상태 확인
uptime
free -h
df -h

# Docker MySQL 컨테이너 확인
docker ps | grep chalog-mysql

# PM2 상태 확인
pm2 status

# 애플리케이션 로그 확인
pm2 logs chalog-backend --lines 50
```

### 4. SSH 키 확인

**로컬에서 SSH 키 형식 확인:**

```bash
cd /Users/jwp/Documents/programming/ChaLog
head -1 LightsailDefaultKey-ap-northeast-2.pem
tail -1 LightsailDefaultKey-ap-northeast-2.pem
```

예상 출력:
- 첫 줄: `-----BEGIN RSA PRIVATE KEY-----` 또는 `-----BEGIN OPENSSH PRIVATE KEY-----`
- 마지막 줄: `-----END RSA PRIVATE KEY-----` 또는 `-----END OPENSSH PRIVATE KEY-----`

**SSH 키 권한 확인:**

```bash
chmod 400 LightsailDefaultKey-ap-northeast-2.pem
```

### 5. 공개 키 확인 및 추가

**브라우저 SSH에서:**

```bash
# authorized_keys 확인
cat ~/.ssh/authorized_keys

# 공개 키가 없으면 추가 필요
# (로컬에서 공개 키 추출 후 추가)
```

**로컬에서 공개 키 추출:**

```bash
ssh-keygen -y -f LightsailDefaultKey-ap-northeast-2.pem
```

출력된 공개 키를 브라우저 SSH에서 추가:

```bash
echo "공개-키-내용" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## GitHub Actions 배포 (로컬 SSH 불필요)

로컬 SSH가 안 되어도 GitHub Actions를 통한 배포는 가능합니다:

1. **GitHub Secrets 확인:**
   - GitHub 저장소 → Settings → Secrets and variables → Actions
   - `EC2_SSH_KEY` Secret이 올바르게 설정되어 있는지 확인

2. **GitHub Actions 배포 실행:**
   - Actions 탭 → "Deploy Backend to EC2" 워크플로우
   - "Run workflow" 클릭
   - GitHub Actions는 다른 IP에서 접속하므로 성공할 수 있음

3. **배포 로그 확인:**
   - 워크플로우 실행 로그에서 SSH 연결 상태 확인
   - 성공하면 배포 완료

## 연결 테스트 스크립트

```bash
# 연결 테스트
./scripts/check-lightsail-connection.sh

# 또는 직접 테스트
ssh -i LightsailDefaultKey-ap-northeast-2.pem \
    -o ConnectTimeout=10 \
    -o StrictHostKeyChecking=no \
    ubuntu@3.39.48.139 \
    "echo '연결 성공' && hostname"
```

## 문제가 계속되면

1. **Lightsail 인스턴스 재시작:**
   - Lightsail 콘솔 → 인스턴스 → "Restart" 클릭

2. **새 인스턴스 생성 고려:**
   - 현재 인스턴스에 문제가 있는 경우
   - 새 인스턴스 생성 후 마이그레이션

3. **AWS 지원 문의:**
   - Lightsail 콘솔 → Support → Create case

## 참고 문서

- [빠른 배포 시작 가이드](./QUICK_START_DEPLOYMENT.md)
- [배포 실행 가이드](./DEPLOYMENT_EXECUTION_GUIDE.md)
- [GitHub Secrets 체크리스트](./GITHUB_SECRETS_CHECKLIST.md)
