# GitHub Secrets 설정 가이드 (Lightsail)

Lightsail 배포를 위한 GitHub Secrets 설정 가이드입니다.

## 필수 Secrets

### 1. EC2_HOST (Lightsail Public IP)
- **값**: `YOUR_LIGHTSAIL_IP` (Lightsail Public IP)
- **설정 위치**: GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret

### 2. EC2_USER (Lightsail SSH 사용자명)
- **값**: `ubuntu`
- **설정 위치**: GitHub 저장소 → Settings → Secrets and variables → Actions

### 3. EC2_SSH_KEY (Lightsail SSH 키)
- **값**: Lightsail SSH 키 전체 내용 (`LightsailDefaultKey-ap-northeast-2.pem`)
- **형식**: 
  ```
  -----BEGIN RSA PRIVATE KEY-----
  [키 내용]
  -----END RSA PRIVATE KEY-----
  ```
- **설정 위치**: GitHub 저장소 → Settings → Secrets and variables → Actions

### 4. EC2_DATABASE_URL (Lightsail DB 연결)
- **값**: `mysql://chalog_user:changeme_password@localhost:3306/chalog`
- **설명**: Docker MySQL 연결 URL (localhost 사용)
- **설정 위치**: GitHub 저장소 → Settings → Secrets and variables → Actions

### 5. EC2_JWT_SECRET
- **값**: 기존 JWT Secret 값 (Lightsail .env 파일에서 확인)
- **설정 위치**: GitHub 저장소 → Settings → Secrets and variables → Actions

## 설정 방법

1. GitHub 저장소 접속
2. Settings → Secrets and variables → Actions
3. "New repository secret" 클릭
4. Name과 Secret 값 입력
5. "Add secret" 클릭

## 확인 방법

GitHub Actions 워크플로우 실행 시 다음 메시지가 표시되어야 합니다:
- `EC2_HOST: 설정됨`
- `EC2_USER: 설정됨`
- `EC2_SSH_KEY: 설정됨`
- `EC2_DATABASE_URL: 설정됨`
- `EC2_JWT_SECRET: 설정됨`

## SSH 키 추출 방법

로컬에서 SSH 키 내용 확인:
```bash
cat /Users/jwp/Documents/programming/ChaLog/LightsailDefaultKey-ap-northeast-2.pem
```

전체 내용을 복사하여 `EC2_SSH_KEY` Secret(Lightsail SSH 키)에 붙여넣기하세요.
