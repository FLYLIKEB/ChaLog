# GitHub Secrets 체크리스트

Lightsail Docker MySQL 배포를 위한 GitHub Secrets 확인 체크리스트입니다.

## 필수 Secrets 확인

GitHub 저장소 → Settings → Secrets and variables → Actions에서 다음 Secrets가 설정되어 있는지 확인하세요.

### ✅ 필수 Secrets

- [ ] **EC2_HOST** (Lightsail Public IP)
  - 값: `3.39.48.139`
  - 설명: Lightsail 인스턴스 Public IP 주소

- [ ] **EC2_USER**
  - 값: `ubuntu`
  - 설명: Lightsail 인스턴스 SSH 사용자명

- [ ] **EC2_SSH_KEY**
  - 값: Lightsail SSH 키 전체 내용 (Lightsail 콘솔에서 다운로드)
  - 형식: `-----BEGIN RSA PRIVATE KEY-----`로 시작하는 전체 키 내용
  - 확인 방법: `cat LightsailDefaultKey-ap-northeast-2.pem`

- [ ] **EC2_DATABASE_URL**
  - 값: `mysql://chalog_user:changeme_password@localhost:3306/chalog`
  - 설명: Docker MySQL 연결 URL (localhost 사용)
  - **중요**: 비밀번호를 프로덕션용으로 변경하세요

- [ ] **EC2_JWT_SECRET**
  - 값: 기존 JWT Secret 값
  - 설명: JWT 토큰 서명용 비밀키 (최소 32자 이상)

### 선택적 Secrets

- [ ] **EC2_FRONTEND_URL**
  - 값: `https://cha-log-gilt.vercel.app` (또는 실제 프론트엔드 URL)
  - 설명: 프론트엔드 URL (CORS 허용용)

- [ ] **EC2_FRONTEND_URLS**
  - 값: `https://cha-log-gilt.vercel.app,http://localhost:5173,http://localhost:5174`
  - 설명: 허용할 프론트엔드 URL 목록 (쉼표로 구분)

## Secrets 확인 방법

### 1. GitHub 웹 인터페이스

1. GitHub 저장소 접속
2. Settings → Secrets and variables → Actions
3. Secret 목록 확인
4. 각 Secret 클릭하여 값 확인 (값은 마스킹되어 표시됨)

### 2. GitHub Actions 로그 확인

워크플로우 실행 시 다음 메시지가 표시되어야 합니다:

```
🔍 환경 변수 확인:
EC2_HOST: 설정됨 (길이: 13)
EC2_USER: 설정됨 (값: 'ubuntu')
EC2_SSH_KEY: 설정됨 (길이: 1679)
✅ 모든 필수 Secrets가 설정되었습니다!
```

## Secrets 설정 방법

### 새 Secret 추가

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. Name 입력 (예: `EC2_HOST`)
4. Secret 값 입력
5. "Add secret" 클릭

### Secret 수정

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. 수정할 Secret 클릭
3. "Update" 클릭
4. 새 값 입력
5. "Update secret" 클릭

### Secret 삭제

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. 삭제할 Secret 클릭
3. "Delete" 클릭
4. 확인

## SSH 키 추출 방법

로컬에서 SSH 키 내용 확인:

```bash
cat /Users/jwp/Documents/programming/ChaLog/LightsailDefaultKey-ap-northeast-2.pem
```

전체 내용을 복사하여 `EC2_SSH_KEY` Secret에 붙여넣기하세요.

**주의**: 
- 키의 첫 줄과 마지막 줄도 포함해야 합니다
- 줄바꿈이 포함되어야 합니다
- 공백이나 추가 문자를 넣지 마세요

## 문제 해결

### Secrets가 설정되지 않았다는 오류

워크플로우 실행 시 다음 오류가 발생하면:

```
❌ 필수 Secrets가 설정되지 않았습니다!
누락된 Secrets:
  - EC2_HOST
```

**해결 방법**:
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. 누락된 Secret 추가
3. 워크플로우 다시 실행

### SSH 연결 실패

워크플로우 실행 시 SSH 연결이 실패하면:

1. `EC2_SSH_KEY` Secret 확인
   - 키 형식이 올바른지 확인 (`-----BEGIN RSA PRIVATE KEY-----`로 시작)
   - 전체 키 내용이 포함되었는지 확인

2. Lightsail 인스턴스에서 공개 키 확인
   ```bash
   ssh -i LightsailDefaultKey-ap-northeast-2.pem ubuntu@3.39.48.139
   cat ~/.ssh/authorized_keys
   ```

3. `EC2_USER` 값 확인
   - Ubuntu 인스턴스: `ubuntu`
   - Amazon Linux 인스턴스: `ec2-user`

### 데이터베이스 연결 실패

애플리케이션이 데이터베이스에 연결하지 못하면:

1. `EC2_DATABASE_URL` Secret 확인
   - 형식: `mysql://user:password@localhost:3306/database`
   - Docker MySQL 컨테이너가 실행 중인지 확인

2. Lightsail 인스턴스에서 확인:
   ```bash
   docker ps | grep chalog-mysql
   docker exec chalog-mysql mysql -uroot -pchangeme_root_password -e "SELECT 1"
   ```

## 참고 문서

- [GitHub Secrets 설정 가이드](./GITHUB_SECRETS_SETUP.md)
- [GitHub Actions 설정 가이드](./GITHUB_ACTIONS_SETUP.md)
- [Lightsail Docker MySQL 가이드](./LIGHTSAIL_DOCKER_MYSQL.md)
