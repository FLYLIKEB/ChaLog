# 스크립트 사용 가이드

ChaLog 프로젝트에서 사용하는 스크립트들의 역할과 사용법입니다.

## 크로스 플랫폼 지원

### Windows 사용자

Windows에서 스크립트를 실행하려면 다음 중 하나의 방법을 사용하세요:

**방법 1: Git Bash 사용 (권장)**
- Git for Windows와 함께 설치되는 Git Bash를 사용하세요.
- Git Bash에서 위의 모든 스크립트 명령어를 그대로 사용할 수 있습니다.

**방법 2: WSL (Windows Subsystem for Linux) 사용**
- WSL을 설치하고 Linux 환경에서 스크립트를 실행하세요.
- WSL에서는 모든 스크립트가 정상적으로 작동합니다.

**방법 3: npm 스크립트 사용**
- PowerShell이나 cmd에서는 `npm run dev:local`과 `npm run dev:stop`을 사용하세요.
- 이 명령어들은 Git Bash/WSL 없이도 작동합니다.
- 단, SSH 터널 관련 스크립트는 Git Bash 또는 WSL이 필요합니다.

**주의사항:**
- `.sh` 파일은 Git Bash 또는 WSL에서만 실행 가능합니다.
- PowerShell이나 cmd에서는 직접 실행할 수 없으므로 `npm run` 명령어를 사용하세요.

## Git 워크플로우

### quick-commit.sh

빠른 커밋 및 푸시 자동화

```bash
./scripts/quick-commit.sh [브랜치명] [커밋메시지]

# 예시
./scripts/quick-commit.sh feature/new-feature "feat: 새로운 기능 추가"
```

**동작:** 변경사항 스테이징 → 커밋 → 푸시 (main 브랜치인 경우 새 브랜치 생성)

---

### full-release.sh

전체 릴리스 프로세스 자동화 (테스트 → 병합 → 태그 → 배포)

```bash
./scripts/full-release.sh "<commit-message>" "<version-tag>" [feature-branch]

# 예시
./scripts/full-release.sh "Release v1.2.3" "v1.2.3" feature/new-feature
```

**동작:** 테스트/린트/타입체크 → feature 커밋 → main 병합 + 태그 생성

**요구사항:** feature 브랜치는 `feature/*` 패턴, 버전 태그는 `v1.2.3` 형식

---

## 데이터베이스 관리

### start-ssh-tunnel.sh

SSH 터널을 통한 RDS 연결 시작

```bash
cd backend
./scripts/start-ssh-tunnel.sh
```

**환경 변수 (`.env`):**
```env
SSH_KEY_PATH=~/.ssh/your-key.pem
EC2_HOST=YOUR_EC2_HOST
EC2_USER=YOUR_EC2_USER
SSH_TUNNEL_LOCAL_PORT=3307
```

> `.env.example` 파일을 참고하여 실제 값으로 설정하세요.

**터널 확인:** `ps aux | grep "ssh.*3307"`

---

### stop-ssh-tunnel.sh

실행 중인 SSH 터널 종료

```bash
cd backend
./scripts/stop-ssh-tunnel.sh
```

---

### check-database.sh

데이터베이스 연결 확인 및 생성

```bash
cd backend
./scripts/check-database.sh
```

**주의:** SSH 터널이 실행 중이어야 함 (`start-ssh-tunnel.sh` 실행 필요)

---

### insert-sample-data.js

샘플 데이터 삽입 (개발/테스트용)

```bash
cd backend
node scripts/insert-sample-data.js
```

**환경 변수:**
- `DATABASE_URL`: `mysql://user:password@host:port/database`
- 또는 개별 설정: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

**동작:**
1. 3명의 샘플 사용자 생성 (비밀번호: `password123`)
2. 5개의 샘플 차 데이터 생성
3. 5개의 샘플 노트 데이터 생성 (사용자-차 관계 포함)

**주의사항:**
- **ID는 자동 생성됩니다**: `users`, `teas`, `notes` 테이블의 `id` 필드는 `INT AUTO_INCREMENT`이므로 스크립트에서 명시하지 않습니다
- 기존 데이터가 있는 경우 중복 오류가 발생할 수 있습니다
- 개발/테스트 환경에서만 사용하세요

**생성되는 데이터:**
- 사용자: 김차인, 이다원, 박녹차
- 차: 정산소종, 대홍포, 용정, 백호은침, 철관음
- 노트: 각 차에 대한 평가 및 메모

---

## 빠른 참조

### 개발 시작 시
```bash
cd backend
./scripts/start-ssh-tunnel.sh    # SSH 터널 시작
./scripts/check-database.sh      # DB 확인
npm run start:dev                # 백엔드 실행
```

### 개발 종료 시
```bash
cd backend
./scripts/stop-ssh-tunnel.sh     # SSH 터널 종료
```

### 커밋 및 릴리스
```bash
./scripts/quick-commit.sh feature/my-feature "feat: 기능 추가"
# PR 생성 후 승인되면:
./scripts/full-release.sh "Release v1.0.0" "v1.0.0" feature/my-feature
```

---

## 문제 해결

**스크립트 실행 권한 오류:**
```bash
chmod +x scripts/*.sh backend/scripts/*.sh
```

**SSH 터널 자동 종료:**
- 네트워크 연결 확인
- 터널 재시작: `./scripts/start-ssh-tunnel.sh`

**데이터베이스 연결 실패:**
- SSH 터널 확인: `ps aux | grep "ssh.*3307"`
- `.env` 파일의 `DATABASE_URL` 확인

---

## 관련 문서

- [데이터베이스 설정](./DATABASE.md)
- [보안 가이드](./SECURITY.md)
- [Git 전략](./git-strategy.md)
