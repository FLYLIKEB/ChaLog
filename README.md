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
실제 Supabase를 붙일 계획이라면 `.env` 혹은 `src/utils/supabase/info.tsx`를 참조해 공개 키/프로젝트 URL을 분리하세요. 현재 mock 데이터 모드에서는 추가 설정이 필요 없습니다.

### NPM 스크립트
| 명령 | 설명 |
| --- | --- |
| `npm run dev` | Vite 개발 서버 실행 |
| `npm run build` | 프로덕션 번들 생성 (`dist/`) |
| `npm run preview` | 로컬에서 번들 미리보기 |
| `npm run lint` *(존재 시)* | 린트/타입 검사 |
| `npm run test` | Vitest + Testing Library 기반 단위/통합 테스트 실행 |
| `npm run test:run` | 워치 없이 일회성 테스트 실행 |

## 폴더 구조 하이라이트
```
src/
├─ App.tsx               # Router + FAB + Toaster 셸
├─ pages/                # Home, Search, TeaDetail, NoteDetail, MyNotes, Settings
├─ components/           # Header, NoteCard, TeaCard, EmptyState, FAB 등 UI 조각
├─ components/ui/        # shadcn 기반 래퍼와 `cn` 유틸
├─ lib/mockData.ts       # currentUser, mockTeas, mockNotes
├─ supabase/functions/   # Hono Edge 함수 + KV 스토어 래퍼
└─ styles/               # Tailwind v4 토큰(`globals.css`, `index.css`)
```

## 아키텍처 개요
- `src/main.tsx` → `src/App.tsx`에서 React Router DOM을 부트스트랩하고, 모든 화면은 `max-w-2xl` 컨테이너 안에서 렌더링됩니다.
- 라우트별 FAB 동작은 `FloatingActionButtonSwitcher`가 관리해 향후 경로별 숨김/위치 오버라이드가 간단합니다.
- 글로벌 알림은 `sonner`, 폼·컴포넌트 스타일은 shadcn/ui + Tailwind 유틸 조합을 사용합니다.

## 데이터 & 외부 연동
- 임시 데이터는 `src/lib/mockData.ts` 하나에 모여 있어 상태 관리 라이브러리 없이도 플로우 점검이 가능합니다.
- Supabase Edge 함수(`src/supabase/functions/server/index.tsx`)는 Hono 기반으로 구성됐으며, `kv_store.tsx`에서 KV 테이블 CRUD를 제공합니다.
- 클라이언트 측 프로젝트 정보는 `src/utils/supabase/info.tsx`에 정의되어 있어 실제 연결 시 참고하거나 `.env`로 대체할 수 있습니다.

## UI · 스타일 시스템
- Tailwind CSS v4 디자인 토큰이 `src/styles/globals.css`에 정의되어 있으며, `@theme inline`을 이용해 색상·타이포를 중앙 관리합니다.
- shadcn/ui 래핑 컴포넌트와 `lucide-react` 아이콘 세트를 조합해 일관된 UI를 유지합니다.
- `components/ui/utils.ts`의 `cn` 헬퍼로 조건부 클래스 병합을 단순화했습니다.

## 개발 가이드라인

### 코드 스타일 및 패턴

#### 프론트엔드 (React + TypeScript)
- 함수형 컴포넌트와 훅 사용, 클래스 컴포넌트 지양
- `components/ui/utils.ts`의 `cn()` 유틸리티로 className 병합
- shadcn/ui 컴포넌트 패턴 준수: Radix UI 프리미티브 + CVA로 variants 구현
- Import 경로: `@/` 별칭 사용 (예: `@/components/Button`)
- 컴포넌트 구조: Props 인터페이스 → 컴포넌트 → export default
- TypeScript strict 타입 사용, `any` 지양
- 유틸리티는 named export, 컴포넌트는 default export 선호

#### 백엔드 (NestJS)
- `@Injectable()` 데코레이터로 의존성 주입 사용
- NestJS 모듈 패턴 준수: Controller → Service → Entity
- DTO를 사용한 요청/응답 검증
- 에러 처리: NestJS 내장 예외 사용 (`NotFoundException`, `ForbiddenException` 등)
- 서비스 메서드는 async로 Promise 반환
- TypeORM 리포지토리는 `@InjectRepository()` 데코레이터 사용

#### 파일 구조
- 컴포넌트: `src/components/` (UI 컴포넌트는 `components/ui/`)
- 페이지: `src/pages/` (라우트 컴포넌트)
- 백엔드 모듈: `backend/src/{module}/` (controller, service, entities, dto)
- 공유 타입: `packages/types/` (프론트엔드/백엔드 공용)
- 유틸리티: `src/lib/` (프론트엔드), `backend/src/common/` (백엔드)

### 컴포넌트 가이드라인
- UI 컴포넌트: `components/ui/`의 shadcn/ui 컴포넌트를 기본으로 사용
- 커스텀 컴포넌트: `components/`에 설명적인 이름(PascalCase)으로 생성
- Props: 컴포넌트 위에 TypeScript 인터페이스 정의
- 스타일링: Tailwind CSS 클래스 사용, 커스텀 CSS보다 유틸리티 클래스 선호
- 접근성: 적절한 ARIA 레이블 및 키보드 내비게이션 포함
- 아이콘: `lucide-react` 아이콘 사용, 개별 import

### 타입 정의
- 공유 타입: 프론트엔드/백엔드 공용으로 `packages/types/index.ts`에 정의
- 컴포넌트 props: 인라인 또는 같은 파일에 정의
- API 타입: 백엔드 DTO와 `packages/types/`에서 일치
- TypeScript 유틸리티 타입 (`Pick`, `Omit`, `Partial`) 적절히 활용

### 테스팅
- 프론트엔드: Vitest + Testing Library, `__tests__/` 디렉토리에 테스트 파일
- 백엔드: Jest, 소스 파일과 함께 `.spec.ts` 파일
- 테스트 네이밍: `*.test.tsx` (프론트엔드), `*.spec.ts` (백엔드)
- Mock 데이터: 프론트엔드 테스트는 `src/lib/mockData.ts` 사용
- 테스트 구조: Arrange → Act → Assert 패턴

### 에러 처리
- 프론트엔드: try-catch 블록 사용, `sonner` 토스트로 사용자 친화적 에러 메시지 표시
- 백엔드: 적절한 NestJS 예외 throw, 예외 필터가 응답 처리
- API 에러: 백엔드에서 일관된 에러 형식 반환
- 검증: DTO에 class-validator 데코레이터 사용 (백엔드)

### 성능 최적화
- React: 비용이 큰 컴포넌트는 `React.memo()` 사용, 필요시 `useMemo()`/`useCallback()` 활용
- 코드 스플리팅: 필요시 `React.lazy()`로 라우트 지연 로드
- 이미지: 적절한 크기 조정 및 지연 로드
- 불필요한 리렌더링 방지: 훅의 의존성 배열 확인

## Cursor AI 명령어

### Quick Commit & Push ("ch" 명령어)
챗에 "ch" 또는 "커밋" 입력 시 자동 실행:
1. 브랜치 관리: 현재 브랜치 확인 → `main`/`develop`이면 변경사항 기반 `feature/*` 브랜치 생성
2. 변경사항 분석: `git status` → 기능별 그룹화 (auth, notes, teas, components, config 등)
3. 기능별 커밋: 각 그룹별 스테이징 → 한글로 자동 커밋 메시지 생성 (`feat:`, `fix:`, `refactor:` 등) → 커밋
4. 푸시 및 요약: 모든 커밋 완료 후 푸시 → 브랜치/커밋 요약 제공

### Quick Pull ("pl" 명령어)
챗에 "pl" 또는 "풀" 입력 시 자동 실행:
1. 원격 업데이트: `git fetch --all --prune`
2. 현재 브랜치 pull: `git pull origin <현재브랜치>`
3. 주요 브랜치 pull: `main`, `develop` 최신화 (체크아웃 → pull → 복귀)
4. 요약 제공: 업데이트된 브랜치 및 변경사항 요약

### Git 워크플로우
- 커밋/푸시 전: `docs/git-strategy.md` 확인 (브랜치 네이밍, 병합 절차)
- 화면/라우트 수정 시: `docs/architecture.md` 확인 및 필요시 업데이트
- 커밋 전 체크: `npm test`, `npm run lint`, `tsc --noEmit`
- 커밋 메시지: 한글로 작성 (예: `feat: 노트 필터 기능 추가`, `fix: 인증 버그 수정`)

### 릴리스 자동화
- 전체 릴리스: `scripts/full-release.sh "<commit-msg>" "<version-tag>" [feature/branch]`
  - 예: `scripts/full-release.sh "feat: add note filters" v0.5.0`
  - 프로세스: 테스트/린트 → feature push → develop 병합 → release 생성 → main 병합+태깅 → develop 재병합

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
- 아키텍처·페이지별 세부 흐름이 필요한 경우 `docs/architecture.md`를 참고하세요. 기존 README의 상세 설명과 코드 스니펫이 그대로 정리되어 있습니다.
- Git 브랜치 전략 상세 내용은 `docs/git-strategy.md`를 참고하세요.
- Cursor AI 개발 환경 설정 및 룰은 `.cursor/rules` 파일을 참고하세요.

필요한 정보가 README에 없다면 이 문서를 업데이트하거나 `src/guidelines/Guidelines.md`를 참고해 주세요.

