# ChaLog App Structure

차 기록을 위한 모바일 퍼스트 SPA입니다. React 18 + Vite 기반으로 홈·검색·노트·설정 등 핵심 플로우가 구현되어 있으며, NestJS 백엔드 API와 AWS RDS 데이터베이스를 통해 실제 데이터를 관리합니다.

- Figma 디자인: https://www.figma.com/design/yCBAKnVYnhz2ZDj7ECRLe9/ChaLog-App-Structure  
- 코드 루트: `/Users/jwp/Documents/programming/ChaLog`

## 주요 기능
- 홈 피드에서 오늘의 차 추천과 공개 노트를 카드 형태로 노출
- 차 검색 및 자동완성, 상세 정보, 해당 차로 노트 작성 CTA
- 다섯 가지 평점 슬라이더·메모·공개 여부를 포함한 노트 작성 폼
- 내 노트 탭/정렬, 노트 상세 공개 전환, 삭제 다이얼로그, 레이더 차트
- 글로벌 FAB·하단 내비게이션·토스트가 모든 페이지에 일관된 셸 제공

## 빠른 시작
### 요구 사항
- Node.js 20 이상 (권장: 20.x LTS)
- npm 10 이상 (또는 pnpm/yarn 사용 가능)

### 설치
```bash
npm install
```

### 개발 서버

**전체 환경 실행 (권장):**
SSH 터널, 백엔드, 프론트엔드를 한 번에 실행합니다:
```bash
npm run dev:local
```
또는
```bash
./scripts/start-local.sh
```

**프론트엔드만 실행:**
```bash
npm run dev
```
Vite 기본 포트(`http://localhost:5173`)에서 SPA가 실행됩니다.

**서버 종료:**
```bash
npm run dev:stop
```
또는
```bash
./scripts/stop-local.sh
```

**Windows 사용자:**
- Git Bash 또는 WSL(Windows Subsystem for Linux)에서 위 명령어를 실행하세요.
- PowerShell에서는 `npm run dev:local`과 `npm run dev:stop`을 사용하세요 (스크립트 파일은 Git Bash/WSL 필요).
- 자세한 내용은 [`docs/workflow/SCRIPTS.md`](./docs/workflow/SCRIPTS.md)를 참고하세요.

### 환경 변수

**중앙 집중식 관리**: 모든 환경 변수는 `.env.example` 파일에 정의되어 있으며, 실제 값은 `.env` 파일에서 관리합니다.

**빠른 설정:**

```bash
# 프론트엔드
cp .env.example .env

# 백엔드
cd backend
cp .env.example .env
```

**환경 변수 목록:**

- **프론트엔드**: `VITE_API_BASE_URL` (백엔드 API URL)
- **백엔드**: 데이터베이스, JWT, 서버 설정 등

자세한 내용은 [`docs/configuration/ENVIRONMENT_VARIABLES.md`](./docs/configuration/ENVIRONMENT_VARIABLES.md)를 참고하세요.

### NPM 스크립트
| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 프론트엔드만 실행 (Vite 개발 서버) |
| `npm run dev:local` | 전체 환경 실행 (SSH 터널 + 백엔드 + 프론트엔드) |
| `npm run dev:stop` | 전체 환경 종료 |
| `npm run build` | 프로덕션 번들 생성 (`dist/`) |
| `npm run test` | Vitest + Testing Library 기반 단위/통합 테스트 실행 |
| `npm run test:run` | 워치 없이 일회성 테스트 실행 |

### 유틸리티 스크립트

프로젝트에는 개발 및 배포를 위한 유틸리티 스크립트가 포함되어 있습니다.

**Git 워크플로우:**
- `scripts/quick-commit.sh` - 빠른 커밋 및 푸시
- `scripts/full-release.sh` - 릴리스 자동화

**데이터베이스 관리:**
- `backend/scripts/start-ssh-tunnel.sh` - SSH 터널 시작
- `backend/scripts/stop-ssh-tunnel.sh` - SSH 터널 종료
- `backend/scripts/check-database.sh` - 데이터베이스 확인
- `backend/scripts/create-tables.js` - 테이블 생성 (Node.js 스크립트)
- `backend/scripts/create-tables.sql` - 테이블 생성 (SQL 스크립트)
- `backend/scripts/insert-sample-data.js` - 샘플 데이터 삽입

자세한 사용법은 [`docs/workflow/SCRIPTS.md`](./docs/workflow/SCRIPTS.md)를 참고하세요.

## 폴더 구조 하이라이트
```
src/
├─ App.tsx               # Router + FAB + Toaster 셸
├─ pages/                # Home, Search, TeaDetail, NoteDetail, MyNotes, Settings, Login, Register
├─ components/           # Header, NoteCard, TeaCard, EmptyState, FAB 등 UI 조각
├─ components/ui/        # shadcn 기반 래퍼와 `cn` 유틸
├─ lib/
│  ├─ api.ts            # API 클라이언트 및 엔드포인트 함수들
│  └─ logger.ts         # 로깅 유틸리티 (개발 환경 전용)
├─ hooks/               # 커스텀 훅 (useAsyncData 등)
├─ utils/                # 유틸리티 함수 (teaTags 등)
├─ constants/           # 전역 상수 정의
├─ contexts/            # React Context (AuthContext 등)
└─ styles/              # Tailwind v4 토큰(`globals.css`, `index.css`)

backend/
├─ src/
│  ├─ auth/            # 인증 모듈 (JWT, Local Strategy)
│  ├─ users/           # 사용자 모듈
│  ├─ teas/            # 차 모듈
│  ├─ notes/           # 노트 모듈
│  ├─ health/          # Health 체크 엔드포인트
│  └─ database/        # TypeORM 설정
└─ scripts/
   ├─ create-tables.js      # 테이블 생성 스크립트
   ├─ create-tables.sql     # 테이블 생성 SQL
   ├─ insert-sample-data.js # 샘플 데이터 삽입 스크립트
   ├─ start-ssh-tunnel.sh   # SSH 터널 시작
   ├─ stop-ssh-tunnel.sh    # SSH 터널 종료
   └─ check-database.sh     # 데이터베이스 확인
```

## 아키텍처 개요
- `src/main.tsx` → `src/App.tsx`에서 React Router DOM을 부트스트랩하고, 모든 화면은 `max-w-2xl` 컨테이너 안에서 렌더링됩니다.
- 라우트별 FAB 동작은 `FloatingActionButtonSwitcher`가 관리해 향후 경로별 숨김/위치 오버라이드가 간단합니다.
- 글로벌 알림은 `sonner`, 폼·컴포넌트 스타일은 shadcn/ui + Tailwind 유틸 조합을 사용합니다.

## 데이터 & 외부 연동
- 모든 데이터는 NestJS 백엔드 API를 통해 제공되며, `src/lib/api.ts`의 `apiClient`를 통해 통신합니다.
- `teasApi`, `notesApi`, `authApi`를 통해 차, 노트, 인증 관련 API를 호출합니다.
- API 응답의 날짜 문자열은 자동으로 Date 객체로 변환되며, DECIMAL 타입(평점)은 숫자로 자동 변환됩니다.
- Note 응답은 백엔드의 관계 데이터에서 `teaName`, `userName`을 추출하여 정규화됩니다.
- 에러 메시지는 백엔드에서 한글로 제공되며, 프론트엔드에서도 영어 메시지를 한글로 변환합니다.
- 데이터베이스는 AWS RDS MariaDB를 사용하며, SSH 터널을 통해 연결됩니다.
- Supabase Edge 함수(`src/supabase/functions/server/index.tsx`)는 Hono 기반으로 구성됐으며, `kv_store.tsx`에서 KV 테이블 CRUD를 제공합니다.
- 클라이언트 측 프로젝트 정보는 `src/utils/supabase/info.tsx`에 정의되어 있어 실제 연결 시 참고하거나 `.env`로 대체할 수 있습니다.

## UI · 스타일 시스템
- Tailwind CSS v4 디자인 토큰이 `src/styles/globals.css`에 정의되어 있으며, `@theme inline`을 이용해 색상·타이포를 중앙 관리합니다.
- shadcn/ui 래핑 컴포넌트와 `lucide-react` 아이콘 세트를 조합해 일관된 UI를 유지합니다.
- `components/ui/utils.ts`의 `cn` 헬퍼로 조건부 클래스 병합을 단순화했습니다.

## 개발 가이드라인

프로젝트의 코딩 스타일, 컴포넌트 패턴, 테스팅 전략 등 상세한 개발 가이드라인은 다음 문서들을 참고하세요:

- **Cursor AI 개발 룰**: `.cursor/rules` - 코드 스타일, 컴포넌트 가이드라인, 타입 정의, 테스팅, 에러 처리, 성능 최적화 등
- **아키텍처 가이드**: `docs/architecture/Architecture.md` - 프로젝트 구조, 라우팅, 데이터 흐름 등
- **Git 전략**: `.cursor/rules/workflow/git.md` - 브랜치 전략, 커밋 규칙, 릴리스 프로세스 등

## Cursor AI 명령어

Cursor AI 명령어는 `.cursor/rules` 파일에 정의되어 있습니다. 상세한 사용법과 워크플로우는 해당 파일을 참고하세요.

**주요 명령어 요약:**
- **Quick Commit & Push ("ch")**: 변경사항을 분석하여 기능별로 자동 커밋하고 푸시합니다
- **Quick Pull ("pl")**: 현재 브랜치와 주요 브랜치(`main`, `develop`)를 최신화합니다
- **릴리스 자동화**: `scripts/full-release.sh`를 사용하여 전체 릴리스 프로세스를 자동화합니다

모든 Cursor AI 명령어, Git 워크플로우, 코드 스타일 가이드라인은 `.cursor/rules`에서 관리되며, 이 파일이 단일 소스입니다.

## 백엔드 실행

백엔드를 실행하려면:

1. **SSH 터널 시작** (RDS 연결용):
```bash
cd backend
./scripts/start-ssh-tunnel.sh
```

2. **데이터베이스 테이블 생성** (최초 1회):
```bash
cd backend
node scripts/create-tables.js
```

3. **샘플 데이터 삽입** (선택사항):
```bash
cd backend
node scripts/insert-sample-data.js
```

4. **백엔드 서버 실행**:
```bash
cd backend
npm run start:dev
```

백엔드 서버는 `http://localhost:3000`에서 실행됩니다.

## API 엔드포인트

### Health Check
- `GET /health` - 서버 및 데이터베이스 연결 상태 확인

### 인증
- `POST /auth/register` - 회원가입
- `POST /auth/login` - 로그인
- `POST /auth/profile` - 프로필 조회 (JWT 필요)

### 차(Tea)
- `GET /teas` - 차 목록 조회
- `GET /teas?q=검색어` - 차 검색
- `GET /teas/:id` - 차 상세 조회
- `POST /teas` - 차 생성 (JWT 필요)

### 노트(Note)
- `GET /notes` - 노트 목록 조회
- `GET /notes?userId=사용자ID` - 특정 사용자의 노트 조회
- `GET /notes?public=true` - 공개 노트만 조회
- `GET /notes?teaId=차ID` - 특정 차의 노트 조회
- `GET /notes/:id` - 노트 상세 조회
- `POST /notes` - 노트 생성 (JWT 필요)
- `PATCH /notes/:id` - 노트 수정 (JWT 필요)
- `DELETE /notes/:id` - 노트 삭제 (JWT 필요)

## 백엔드 배포

백엔드는 AWS EC2에 배포하며, GitHub Actions를 통해 자동 배포됩니다.

### 자동 배포 (GitHub Actions)

`main` 브랜치의 `backend/` 디렉토리에 변경사항을 푸시하면 자동으로 배포됩니다.

**초기 설정:**
1. GitHub Secrets 설정: [`docs/deployment/GITHUB_ACTIONS_SETUP.md`](./docs/deployment/GITHUB_ACTIONS_SETUP.md) 참고
2. EC2 초기 설정: [`docs/deployment/AWS_EC2_DEPLOYMENT.md`](./docs/deployment/AWS_EC2_DEPLOYMENT.md) 참고

### 수동 배포

```bash
cd backend
./deploy.sh your-ec2-ip ubuntu ~/.ssh/your-key.pem
```

## 프론트엔드 배포

프론트엔드는 Vercel에 배포됩니다.

### Vercel 환경 변수 설정

프로덕션 환경에서 백엔드 API와 통신하기 위해 다음 환경 변수를 설정해야 합니다:

1. **Vercel 대시보드 접속**
   - 프로젝트 → Settings → Environment Variables

2. **환경 변수 추가**
   - Key: `VITE_API_BASE_URL`
   - Value: 백엔드 API 서버 URL (예: `http://your-ec2-ip:3000` 또는 `https://api.yourdomain.com`)
   - Environment: Production, Preview, Development 모두 선택

3. **재배포**
   - 환경 변수 저장 후 자동으로 재배포됩니다
   - 또는 수동으로 "Redeploy" 클릭

> **주의**: 
> - IP 주소나 민감한 정보는 코드에 하드코딩하지 마세요
> - 환경 변수를 통해 관리하세요
> - 자세한 내용은 [`docs/deployment/AWS_EC2_DEPLOYMENT.md`](./docs/deployment/AWS_EC2_DEPLOYMENT.md) 참고

## 향후 작업 아이디어

작업 아이디어와 개선 사항은 GitHub Issues로 관리합니다.

**작업 등록 방법:**
- 새로운 기능: [Feature Request 템플릿](https://github.com/FLYLIKEB/ChaLog/issues/new?template=feature.md) 사용
- 버그 리포트: [Bug Report 템플릿](https://github.com/FLYLIKEB/ChaLog/issues/new?template=bug.md) 사용
- 일반 작업: [Task 템플릿](https://github.com/FLYLIKEB/ChaLog/issues/new?template=task.md) 사용

**현재 제안된 작업들:**
- [Issues 목록](https://github.com/FLYLIKEB/ChaLog/issues)에서 확인 가능
- 라벨별 필터링: `enhancement`, `bug`, `task` 등

> **참고**: 작업 아이디어는 MD 파일이 아닌 GitHub Issue로 관리합니다.

## Git 브랜치 전략 (GitHub Flow)
- `main`: 배포 가능한 안정 버전. PR 통과·CI 성공 후에만 병합하고 보호 규칙으로 직접 push를 막습니다.
- `feature/*`: 기능·버그 단위 작업 브랜치(`feature/note-filter` 등). 완료 후 PR을 통해 `main`에 직접 병합합니다.

### 운영 플로우
1. `main`에서 작업을 위한 `feature/*`를 생성합니다.
2. 기능 구현·테스트 완료 시 PR을 열어 리뷰 후 `main`에 병합합니다 (squash merge 권장).
3. 배포가 필요하면 `main`에 태그를 생성하고 배포합니다.
4. 긴급 수정도 동일한 프로세스: `feature/hotfix-*` 브랜치 생성 → PR → `main` 병합 → 배포.

### 권장 설정
- GitHub 브랜치 보호 규칙: `main` 브랜치에 최소 1인 리뷰와 CI 통과를 요구하고 squash merge를 권장합니다.
- 자동화: `main` 병합 시 태그·배포 스크립트를 실행하도록 CI를 구성합니다.
- 문서화: 브랜치 명명 규칙·릴리스 절차를 `.cursor/rules/workflow/git.md`와 이 README에 유지해 팀 합의를 공유합니다.

## 추가 참고 문서

### 배포
- **EC2 배포**: [`docs/deployment/AWS_EC2_DEPLOYMENT.md`](./docs/deployment/AWS_EC2_DEPLOYMENT.md) - EC2 배포 구조 및 사용 가이드
- **GitHub Actions**: [`docs/deployment/GITHUB_ACTIONS_SETUP.md`](./docs/deployment/GITHUB_ACTIONS_SETUP.md) - GitHub Actions 사용 가이드
- **HTTPS 설정**: [`docs/deployment/HTTPS_SETUP_GUIDE.md`](./docs/deployment/HTTPS_SETUP_GUIDE.md) - HTTPS 사용 가이드
- **Vercel 설정**: [`docs/deployment/VERCEL_ENV_SETUP.md`](./docs/deployment/VERCEL_ENV_SETUP.md) - Vercel 환경 변수 설정

### 인프라
- **데이터베이스**: [`docs/infrastructure/DATABASE.md`](./docs/infrastructure/DATABASE.md) - 데이터베이스 구조 및 사용 가이드
- **RDS 설정**: [`docs/infrastructure/aws-rds-setup.md`](./docs/infrastructure/aws-rds-setup.md) - AWS RDS 설정 가이드

### 개발 환경
- **Node.js 버전**: [`docs/development/NODE_VERSION_SETUP.md`](./docs/development/NODE_VERSION_SETUP.md) - Node.js 버전 설정
- **카카오 로그인**: [`docs/development/KAKAO_DEVELOPER_SETUP.md`](./docs/development/KAKAO_DEVELOPER_SETUP.md) - 카카오 개발자 설정

### 워크플로우
- **스크립트 사용법**: [`docs/workflow/SCRIPTS.md`](./docs/workflow/SCRIPTS.md) - 모든 유틸리티 스크립트의 역할과 사용법
- **PR 리뷰 프로세스**: [`docs/workflow/PR_REVIEW_PROCESS.md`](./docs/workflow/PR_REVIEW_PROCESS.md) - PR 리뷰 처리 프로세스

### 기타
- **환경 변수 관리**: [`docs/configuration/ENVIRONMENT_VARIABLES.md`](./docs/configuration/ENVIRONMENT_VARIABLES.md) - 모든 환경 변수와 민감 정보 관리 가이드 ⭐
- **아키텍처**: [`docs/architecture/Architecture.md`](./docs/architecture/Architecture.md) - 프로젝트 구조, 라우팅, 데이터 흐름
- **보안**: [`docs/security/SECURITY.md`](./docs/security/SECURITY.md) - 보안 가이드 및 모범 사례
- **Cursor AI 룰**: [`.cursor/rules`](./.cursor/rules) - 개발 환경 설정 및 코딩 가이드라인 (코드 스타일, Git 전략 포함)

필요한 정보가 README에 없다면 이 문서를 업데이트하거나 `src/guidelines/Guidelines.md`를 참고해 주세요.

