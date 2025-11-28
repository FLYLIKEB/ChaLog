# 스크립트 사용 가이드

ChaLog 프로젝트에서 사용하는 스크립트들의 역할과 사용법입니다.

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

**동작:** 테스트/린트/타입체크 → feature 커밋 → develop 병합 → release 생성 → main 병합 + 태그 → develop 재동기화

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

### migrate-uuid-to-int.sh / migrate-uuid-to-int.js

UUID에서 INT AUTO_INCREMENT로 마이그레이션

**⚠️ 중요: 실행 전 반드시 데이터베이스 백업을 수행하세요!**

```bash
cd backend
./scripts/migrate-uuid-to-int.sh
```

또는 Node.js 스크립트 직접 실행:

```bash
cd backend
node scripts/migrate-uuid-to-int.js
```

**환경 변수:**
- `DATABASE_URL`: `mysql://user:password@host:port/database`
- 또는 개별 설정: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

**동작:**
1. UUID → INT 매핑 테이블 생성
2. 기존 데이터 순서 유지하며 새 INT ID 할당
3. 외래키 관계 유지
4. 기존 UUID 컬럼 제거 및 새 INT 컬럼으로 교체
5. 인덱스 및 제약조건 재생성

**주의사항:**
- 기존 데이터가 있는 경우에만 실행
- 마이그레이션 중 데이터베이스 접근 불가
- 트랜잭션으로 안전하게 처리 (실패 시 롤백)

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
