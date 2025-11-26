# ChaLog App Structure

차 기록을 위한 모바일 퍼스트 SPA입니다. React 18 + Vite 기반으로 홈·검색·노트·설정 등 핵심 플로우가 미리 구현돼 있으며, mock 데이터/디자인 토큰/Edge 함수 뼈대까지 포함되어 바로 실험하거나 확장할 수 있습니다.

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
- Node.js 18 이상
- npm 9 이상 (또는 pnpm/yarn 사용 가능)

### 설치
```bash
npm install
```

### 개발 서버
```bash
npm run dev
```
Vite 기본 포트(`http://localhost:5173`)에서 SPA가 실행됩니다.

### 환경 변수
백엔드 API URL을 설정하려면 `.env` 파일에 `VITE_API_BASE_URL`을 설정하세요. 기본값은 `http://localhost:3000`입니다.
```bash
VITE_API_BASE_URL=http://localhost:3000
```

### NPM 스크립트
| 명령 | 설명 |
| --- | --- |
| `npm run dev` | Vite 개발 서버 실행 |
| `npm run build` | 프로덕션 번들 생성 (`dist/`) |
| `npm run preview` | 로컬에서 번들 미리보기 |
| `npm run lint` *(존재 시)* | 린트/타입 검사 |
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

자세한 사용법은 [`docs/SCRIPTS.md`](./docs/SCRIPTS.md)를 참고하세요.

## 폴더 구조 하이라이트
```
src/
├─ App.tsx               # Router + FAB + Toaster 셸
├─ pages/                # Home, Search, TeaDetail, NoteDetail, MyNotes, Settings
├─ components/           # Header, NoteCard, TeaCard, EmptyState, FAB 등 UI 조각
├─ components/ui/        # shadcn 기반 래퍼와 `cn` 유틸
├─ lib/api.ts            # API 클라이언트 및 엔드포인트 함수들
├─ supabase/functions/   # Hono Edge 함수 + KV 스토어 래퍼
└─ styles/               # Tailwind v4 토큰(`globals.css`, `index.css`)
```

## 아키텍처 개요
- `src/main.tsx` → `src/App.tsx`에서 React Router DOM을 부트스트랩하고, 모든 화면은 `max-w-2xl` 컨테이너 안에서 렌더링됩니다.
- 라우트별 FAB 동작은 `FloatingActionButtonSwitcher`가 관리해 향후 경로별 숨김/위치 오버라이드가 간단합니다.
- 글로벌 알림은 `sonner`, 폼·컴포넌트 스타일은 shadcn/ui + Tailwind 유틸 조합을 사용합니다.

## 데이터 & 외부 연동
- 모든 데이터는 NestJS 백엔드 API를 통해 제공되며, `src/lib/api.ts`의 `apiClient`를 통해 통신합니다.
- `teasApi`, `notesApi`, `authApi`를 통해 차, 노트, 인증 관련 API를 호출합니다.
- API 응답의 날짜 문자열은 자동으로 Date 객체로 변환되며, Note 응답은 백엔드의 관계 데이터에서 `teaName`, `userName`을 추출하여 정규화됩니다.
- Supabase Edge 함수(`src/supabase/functions/server/index.tsx`)는 Hono 기반으로 구성됐으며, `kv_store.tsx`에서 KV 테이블 CRUD를 제공합니다.
- 클라이언트 측 프로젝트 정보는 `src/utils/supabase/info.tsx`에 정의되어 있어 실제 연결 시 참고하거나 `.env`로 대체할 수 있습니다.

## UI · 스타일 시스템
- Tailwind CSS v4 디자인 토큰이 `src/styles/globals.css`에 정의되어 있으며, `@theme inline`을 이용해 색상·타이포를 중앙 관리합니다.
- shadcn/ui 래핑 컴포넌트와 `lucide-react` 아이콘 세트를 조합해 일관된 UI를 유지합니다.
- `components/ui/utils.ts`의 `cn` 헬퍼로 조건부 클래스 병합을 단순화했습니다.

## 개발 가이드라인

프로젝트의 코딩 스타일, 컴포넌트 패턴, 테스팅 전략 등 상세한 개발 가이드라인은 다음 문서들을 참고하세요:

- **Cursor AI 개발 룰**: `.cursor/rules` - 코드 스타일, 컴포넌트 가이드라인, 타입 정의, 테스팅, 에러 처리, 성능 최적화 등
- **아키텍처 가이드**: `docs/architecture.md` - 프로젝트 구조, 라우팅, 데이터 흐름 등
- **Git 전략**: `docs/git-strategy.md` - 브랜치 전략, 커밋 규칙, 릴리스 프로세스 등

## Cursor AI 명령어

Cursor AI 명령어는 `.cursor/rules` 파일에 정의되어 있습니다. 상세한 사용법과 워크플로우는 해당 파일을 참고하세요.

**주요 명령어 요약:**
- **Quick Commit & Push ("ch")**: 변경사항을 분석하여 기능별로 자동 커밋하고 푸시합니다
- **Quick Pull ("pl")**: 현재 브랜치와 주요 브랜치(`main`, `develop`)를 최신화합니다
- **릴리스 자동화**: `scripts/full-release.sh`를 사용하여 전체 릴리스 프로세스를 자동화합니다

모든 Cursor AI 명령어, Git 워크플로우, 코드 스타일 가이드라인은 `.cursor/rules`에서 관리되며, 이 파일이 단일 소스입니다.

## 향후 작업 아이디어
- Supabase Auth/DB와의 실시간 연동, RLS 적용
- 노트 CRUD API와 Edge 함수 연결, optimistic update
- Playwright/Cypress 기반 E2E 테스트 도입
- 다국어(i18n)·다크 모드 토글·접근성 개선

## Git 브랜치 전략
- `main`: 실제 배포용 브랜치. PR 통과·CI 성공 후에만 병합하고 보호 규칙으로 직접 push를 막습니다.
- `develop`: 다음 릴리스를 모으는 통합 브랜치. 모든 기능 작업은 여기에서 분기·병합합니다.
- `feature/*`: 기능·버그 단위 작업 브랜치(`feature/note-filter` 등). 완료 후 PR을 통해 `develop`에 병합합니다.
- `release/*`: 배포 준비 단계에서 생성해 QA·버전 태깅을 수행하고, 안정화되면 `main`과 `develop`에 모두 병합합니다.
- `hotfix/*`: 운영 중 긴급 수정. `main`에서 분기해 패치 후 같은 커밋을 `main`·`develop`에 동시에 반영합니다.

### 운영 플로우
1. `develop`에서 작업을 위한 `feature/*`를 생성합니다.
2. 기능 구현·테스트 완료 시 PR을 열어 리뷰 후 `develop`에 병합합니다.
3. 배포 주기에 맞춰 `release/*`를 만들어 QA·문서화를 마친 뒤 `main`에 병합하고 태그를 남깁니다.
4. `main` 병합 직후 동일 커밋을 `develop`에 다시 병합해 이력 차이를 없앱니다.
5. 사고 대응이 필요하면 `hotfix/*`로 즉시 수정하고, `main`과 `develop` 모두에 반영합니다.

### 권장 설정
- GitHub 브랜치 보호 규칙: `main`, `develop` 모두 최소 1인 리뷰와 CI 통과를 요구하고 squash merge를 권장합니다.
- 자동화: `release/*` 생성 시 버전 검증, `main` 병합 시 태그·배포 스크립트를 실행하도록 CI를 구성합니다.
- 문서화: 브랜치 명명 규칙·릴리스 절차를 `docs/architecture.md`와 이 README에 유지해 팀 합의를 공유합니다.

## 추가 참고 문서
- **스크립트 사용법**: [`docs/SCRIPTS.md`](./docs/SCRIPTS.md) - 모든 유틸리티 스크립트의 역할과 사용법
- **아키텍처**: [`docs/architecture.md`](./docs/architecture.md) - 프로젝트 구조, 라우팅, 데이터 흐름
- **데이터베이스**: [`docs/DATABASE.md`](./docs/DATABASE.md) - 데이터베이스 설정 및 연결 가이드
- **보안**: [`docs/SECURITY.md`](./docs/SECURITY.md) - 보안 가이드 및 모범 사례
- **Git 전략**: [`docs/git-strategy.md`](./docs/git-strategy.md) - 브랜치 전략, 커밋 규칙, 릴리스 프로세스
- **Cursor AI 룰**: [`.cursor/rules`](./.cursor/rules) - 개발 환경 설정 및 코딩 가이드라인

필요한 정보가 README에 없다면 이 문서를 업데이트하거나 `src/guidelines/Guidelines.md`를 참고해 주세요.

