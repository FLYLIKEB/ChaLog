# Architecture Overview

## 기술 스택
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS v4 + Radix UI
- **Backend**: NestJS + TypeORM + MySQL
- **Infra**: Frontend → Vercel, Backend → AWS EC2, DB → AWS Lightsail MySQL

## Frontend 구조 (`src/`)
```
pages/          # 라우트 컴포넌트 (Home, Search, TeaDetail, NoteDetail, MyNotes, Settings, Login, Register,
                #   Cellar, Community(차담), Session*, BlindSession*, ShopDetail, Notifications, ...)
pages/admin/    # 어드민 (AdminDashboard, AdminUsers, AdminNotes, AdminPosts, AdminReports, AdminMaster, ...)
components/     # 재사용 UI (Header, BottomNav, AppSidebar, DesktopHeader, MoreMenu,
                #   TeaCard, NoteCard, SpeedDialFAB, EmptyState, ...)
components/ui/  # shadcn/ui 래퍼 + cn() 유틸
lib/api.ts      # API 클라이언트 (teasApi, notesApi, authApi, ...)
hooks/          # 커스텀 훅 (useAsyncData, useSearchFilters, useReportData, ...)
contexts/       # React Context (AuthContext, SidebarContext, PullToRefreshContext, AppModeContext)
utils/          # 유틸리티 (teaTags, logging, ...)
constants/      # 전역 상수
styles/         # TailwindCSS v4 토큰 (globals.css @theme inline)
```

## 레이아웃
- **모바일**: `Header` (상단 고정) + `BottomNav` (하단 고정)
- **데스크톱(md↑)**: `AppSidebar` (좌측) + `DesktopHeader` (상단)
- **어드민**: `AdminLayout` (별도 쉘, `AdminRouteGuard` 보호)

## Backend 구조 (`backend/src/`)
```
auth/           # 로그인/회원가입/OAuth(Google·Apple)/JWT/비밀번호 재설정/이메일 찾기
users/          # 프로필, 팔로우, 공개 설정
teas/           # 차 CRUD, 검색
notes/          # 차록 CRUD, 북마크, 좋아요, 평가 축
posts/          # 차담 게시글 CRUD
comments/       # 댓글
tags/           # 태그
cellar/         # 찻장 (재고 관리)
tea-sessions/   # 시음 세션
blind-tasting/  # 블라인드 테이스팅 세션
notifications/  # 알림
reports/        # 신고
follows/        # 팔로우/팔로워
mail/           # 이메일 발송
admin/          # 어드민 API
health/         # 헬스체크
database/       # TypeORM 설정
```
- Global prefix: `/api`

## API 엔드포인트
- **Auth**: POST /api/auth/register, /api/auth/login, /api/auth/profile, /api/auth/google, /api/auth/apple, /api/auth/forgot-password, /api/auth/reset-password, /api/auth/find-email
- **Teas**: GET /api/teas (search: `?q=`), GET /api/teas/:id, POST /api/teas
- **Notes**: GET /api/notes (`?userId`, `?public=true`, `?teaId`), GET/POST/PATCH/DELETE /api/notes/:id
- **Posts**: GET/POST /api/posts, GET/PATCH/DELETE /api/posts/:id
- **Cellar**: GET/POST /api/cellar, GET/PATCH/DELETE /api/cellar/:id
- **Tea Sessions**: GET/POST /api/tea-sessions, GET/PATCH/DELETE /api/tea-sessions/:id
- **Blind Tasting**: POST /api/blind-sessions, GET /api/blind-sessions/:id, POST /api/blind-sessions/join
- **Notifications**: GET /api/notifications
- **Health**: GET /api/health

## App.tsx 라우트 추가 시 3곳 모두 수정
1. lazy import
2. `<Route>` 추가
3. `FloatingActionButtonSwitcher` 내 `shouldHide` 조건

## 데이터 흐름
1. `src/lib/api.ts` (apiClient) → HTTP 통신
2. Date 문자열 자동 변환, DECIMAL ratings → number
3. Note 응답 정규화: 백엔드 관계 데이터 → `teaName`, `userName`
4. 에러 메시지: 백엔드 한국어 메시지, 프론트 영어→한국어 번역

## Vite 프록시
- `/api` → `http://localhost:3000` (NestJS)

## 상세 문서
- 전체 아키텍처: `docs/architecture/Architecture.md`
- 서버 아키텍처: `docs/architecture/SERVER_ARCHITECTURE.md`
- 환경변수: `docs/configuration/ENVIRONMENT_VARIABLES.md`
- 배포: `docs/deployment/COMPLETE_DEPLOYMENT_SUMMARY.md`
