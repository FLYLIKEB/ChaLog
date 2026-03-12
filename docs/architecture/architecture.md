# ChaLog Architecture

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS v4 + Radix UI (shadcn/ui) |
| Backend | NestJS + TypeORM + MySQL |
| Infra | Frontend → Vercel, Backend → AWS EC2, DB → AWS Lightsail MySQL |
| Node.js | 22.x |

---

## Frontend 구조 (`src/`)

### 진입점
- `src/main.tsx` → `src/App.tsx` 부트스트랩
- `App.tsx`: `BrowserRouter` + 라우트 테이블, `ThemeProvider`, `AuthProvider`, `SidebarProvider`, `PullToRefreshProvider`, FAB 스위처, `Toaster`

### 레이아웃
- 데스크톱(`md` 이상): `AppSidebar` (좌측) + `DesktopHeader` (상단) + 메인 콘텐츠 (`max-w-5xl~6xl`)
- 모바일: `Header` (상단 고정) + `BottomNav` (하단 고정) + 메인 콘텐츠 (`max-w-2xl`)
- 어드민 라우트(`/admin/*`): `AdminLayout` (별도 쉘, `AdminRouteGuard` 보호)

### 디렉토리

```
src/
├── pages/                  # 라우트 컴포넌트
│   ├── Home.tsx
│   ├── Search.tsx          # 탐색 (/sasaek)
│   ├── TeaDetail.tsx
│   ├── NewTea.tsx / EditTea.tsx
│   ├── NoteDetail.tsx
│   ├── NewNote.tsx / EditNote.tsx
│   ├── MyNotes.tsx
│   ├── Saved.tsx
│   ├── UserProfile.tsx
│   ├── Settings.tsx
│   ├── Cellar.tsx / NewCellarItem.tsx / EditCellarItem.tsx
│   ├── Community.tsx       # 차담 (/chadam)
│   ├── PostDetail.tsx / NewPost.tsx / EditPost.tsx
│   ├── TagDetail.tsx
│   ├── ShopDetail.tsx / NewShop.tsx / EditShop.tsx
│   ├── Notifications.tsx
│   ├── Report.tsx
│   ├── Login.tsx / Register.tsx
│   ├── ForgotPassword.tsx / ResetPassword.tsx / FindEmail.tsx
│   ├── Onboarding.tsx
│   ├── SessionNew.tsx / SessionInProgress.tsx / SessionSummary.tsx / SessionHistory.tsx
│   ├── BlindSessionNew.tsx / BlindSessionJoin.tsx / BlindSessionDetail.tsx
│   ├── BlindNoteWrite.tsx / BlindSessionReport.tsx
│   └── admin/
│       ├── AdminDashboard.tsx
│       ├── AdminReports.tsx
│       ├── AdminUsers.tsx
│       ├── AdminNotes.tsx
│       ├── AdminPosts.tsx
│       ├── AdminAudit.tsx
│       ├── AdminMonitoring.tsx
│       └── AdminMaster.tsx
├── components/             # 재사용 UI 컴포넌트
│   ├── ui/                 # shadcn/ui 래퍼 + cn() 유틸
│   ├── Header.tsx / BottomNav.tsx / BottomNavSpacer.tsx
│   ├── AppSidebar.tsx / DesktopHeader.tsx / MoreMenu.tsx
│   ├── FloatingActionButton.tsx
│   ├── TeaCard.tsx / TeaCardSkeleton.tsx / TeaNewCard.tsx / TeaRankingCard.tsx
│   ├── NoteCard.tsx / NoteCardSkeleton.tsx
│   ├── PostCard.tsx / PostCardSkeleton.tsx
│   ├── CellarCardSkeleton.tsx
│   ├── EmptyState.tsx / DetailFallback.tsx
│   ├── RatingSlider.tsx / RatingVisualization.tsx / RatingGuideModal.tsx
│   ├── ProfileEditModal.tsx / ProfileImageEditModal.tsx
│   ├── OnboardingPreferenceEditModal.tsx / OnboardingTagSelector.tsx
│   ├── AddTemplateModal.tsx / TemplateSelect.tsx
│   ├── ReportModal.tsx / PostReportModal.tsx
│   ├── CommentList.tsx / CreatorCard.tsx
│   ├── ImageUploader.tsx / PostImageUploader.tsx
│   ├── TeaTypeBadge.tsx / TeaTypeSelector.tsx
│   ├── SellerCombobox.tsx / BrewColorPicker.tsx
│   ├── TagInput.tsx / StarRating.tsx / AxisStarRow.tsx / QuantityAdjuster.tsx
│   ├── InfiniteScrollSentinel.tsx
│   ├── HeroSection.tsx / ChadamBanner.tsx / ChaLogLogo.tsx
│   ├── PWAInstallBanner.tsx
│   ├── AdminLayout.tsx / AdminRouteGuard.tsx
│   └── figma/
├── hooks/
│   ├── useAsyncData.ts
│   ├── useDebounce.ts
│   ├── useLocale.ts
│   ├── useNotificationCount.ts
│   ├── usePullToRefresh.ts
│   ├── useRecentSearches.ts
│   ├── useReportData.ts
│   └── useSearchFilters.ts
├── contexts/
│   ├── AuthContext.tsx
│   ├── SidebarContext.tsx
│   └── PullToRefreshContext.tsx
├── lib/
│   ├── api.ts              # API 클라이언트 (teasApi, notesApi, authApi, ...)
│   ├── logger.ts
│   └── teaSearch.ts
├── utils/                  # 유틸리티 (teaTags, logging, ...)
├── constants/              # 전역 상수 (PAGE_BG_GRADIENT 등)
├── types/                  # TypeScript 타입 정의
└── styles/                 # TailwindCSS v4 토큰 (globals.css @theme inline)
```

### 라우트 테이블 (App.tsx)

| 경로 | 컴포넌트 | 로드 방식 |
|------|----------|-----------|
| `/` | Home | 즉시 |
| `/sasaek` | Search | 즉시 |
| `/login` | Login | 즉시 |
| `/tea/:id` | TeaDetail | lazy |
| `/tea/new`, `/tea/:id/edit` | NewTea, EditTea | lazy |
| `/note/:id` | NoteDetail | lazy |
| `/note/new`, `/note/:id/edit` | NewNote, EditNote | lazy |
| `/my-notes` | MyNotes | lazy |
| `/saved` | Saved | lazy |
| `/user/:id` | UserProfile | lazy |
| `/settings` | Settings | lazy |
| `/cellar`, `/cellar/new`, `/cellar/:id/edit` | Cellar, NewCellarItem, EditCellarItem | lazy |
| `/chadam`, `/chadam/new`, `/chadam/:id`, `/chadam/:id/edit` | Community, NewPost, PostDetail, EditPost | lazy |
| `/tag/:name` | TagDetail | lazy |
| `/teahouse/:name`, `/teahouse/new`, `/teahouse/:name/edit` | ShopDetail, NewShop, EditShop | lazy |
| `/notifications` | Notifications | lazy |
| `/report` | Report | lazy |
| `/register` | Register | lazy |
| `/forgot-password`, `/reset-password`, `/find-email` | ForgotPassword, ResetPassword, FindEmail | lazy |
| `/onboarding` | Onboarding | lazy |
| `/session/new`, `/session/:id`, `/session/:id/summary`, `/sessions` | Session* | lazy |
| `/blind/new`, `/blind/join/:code`, `/blind/:id`, `/blind/:id/write`, `/blind/:id/report` | BlindSession* | lazy |
| `/admin/*` | Admin* (AdminLayout 내) | lazy |

> `App.tsx` 에 신규 페이지 추가 시 **lazy import + `<Route>` + `shouldHide` 배열** 3곳 모두 수정 필요

### 데이터 흐름
1. `src/lib/api.ts` (`apiClient`) → Vite 프록시(`/api` → `:3000`) → NestJS
2. Date 문자열 자동 변환, DECIMAL ratings → number 정규화
3. Note 응답 정규화: 백엔드 관계 데이터 → `teaName`, `userName` 플랫 필드
4. 에러 메시지: 백엔드 한국어, 프론트 영어→한국어 번역

---

## Backend 구조 (`backend/src/`)

### 모듈

| 모듈 | 경로 | 역할 |
|------|------|------|
| auth | `auth/` | 로그인/회원가입/OAuth(Google·Apple)/JWT/비밀번호 재설정/이메일 찾기 |
| users | `users/` | 프로필, 팔로우, 공개 설정 |
| teas | `teas/` | 차 CRUD, 검색 |
| notes | `notes/` | 차록 CRUD, 북마크, 좋아요, 평가 축 |
| posts | `posts/` | 차담 게시글 CRUD |
| comments | `comments/` | 댓글 |
| tags | `tags/` | 태그 |
| cellar | `cellar/` | 찻장(재고 관리) |
| tea-sessions | `tea-sessions/` | 시음 세션 |
| blind-tasting | `blind-tasting/` | 블라인드 테이스팅 세션 |
| notifications | `notifications/` | 알림 |
| reports | `reports/` | 신고 |
| follows | `follows/` | 팔로우/팔로워 |
| mail | `mail/` | 이메일 발송 |
| admin | `admin/` | 어드민 API |
| health | `health/` | 헬스체크 |

- Global prefix: `/api`
- Controller → Service → Entity 패턴, DI(`@Injectable()`)
- DTOs: 모든 입력 검증
- 에러: NestJS 내장 예외 (`NotFoundException`, `BadRequestException` 등)

### 주요 API 엔드포인트

```
Auth
  POST /api/auth/register
  POST /api/auth/login
  GET  /api/auth/profile
  POST /api/auth/google
  POST /api/auth/apple
  POST /api/auth/forgot-password
  POST /api/auth/reset-password
  POST /api/auth/find-email

Users
  GET  /api/users/:id
  PATCH /api/users/:id
  GET  /api/users/:id/follows

Teas
  GET  /api/teas          (?q= 검색)
  GET  /api/teas/:id
  POST /api/teas

Notes
  GET  /api/notes         (?userId, ?public=true, ?teaId)
  POST /api/notes
  GET  /api/notes/:id
  PATCH /api/notes/:id
  DELETE /api/notes/:id

Posts (차담)
  GET/POST /api/posts
  GET/PATCH/DELETE /api/posts/:id

Cellar
  GET/POST /api/cellar
  GET/PATCH/DELETE /api/cellar/:id

Tea Sessions
  GET/POST /api/tea-sessions
  GET/PATCH/DELETE /api/tea-sessions/:id

Blind Tasting
  POST /api/blind-sessions
  GET  /api/blind-sessions/:id
  POST /api/blind-sessions/join  (body: { inviteCode })

Notifications
  GET  /api/notifications

Health
  GET  /api/health
```

---

## DB 마이그레이션

- 마이그레이션은 TypeORM CLI로만 생성 (`backend/migrations/`)
- `synchronize: true` 운영 환경 절대 금지
- 상세: `.claude/rules/database.md`

---

## 스타일 시스템

- TailwindCSS v4 + `@theme inline` 디자인 토큰 (`src/styles/globals.css`)
- 다크 모드: `next-themes` (`class` 전략)
- `cn()` 헬퍼: `clsx` + `tailwind-merge` (`src/components/ui/utils.ts`)

---

## 인프라 / 배포

| 항목 | 내용 |
|------|------|
| Frontend | Vercel (자동 배포) |
| Backend | AWS EC2 (NestJS, `:3000`) |
| DB | AWS Lightsail MySQL |
| SSH 터널 | 로컬 3307 → 원격 3306 (`backend/scripts/start-ssh-tunnel.sh`) |
| 로그 | `/tmp/chalog-backend.log`, `/tmp/chalog-frontend.log` |

---

## 관련 문서

- 서버 아키텍처: `docs/architecture/SERVER_ARCHITECTURE.md`
- DB 스키마/관계도: `docs/infrastructure/DATABASE.md`
- 환경변수: `docs/configuration/ENVIRONMENT_VARIABLES.md`
- 배포 가이드: `docs/deployment/COMPLETE_DEPLOYMENT_SUMMARY.md`
- 마이그레이션 워크플로우: `backend/MIGRATION_WORKFLOW.md`
- 스크립트: `docs/workflow/SCRIPTS.md`
