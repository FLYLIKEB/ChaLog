# Architecture Overview

## 기술 스택
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS v4 + Radix UI
- **Backend**: NestJS + TypeORM + MySQL
- **Infra**: Frontend → Vercel, Backend → AWS EC2, DB → AWS Lightsail MySQL

## Frontend 구조 (`src/`)
```
pages/          # 라우트 컴포넌트 (Home, Search, TeaDetail, NoteDetail, MyNotes, Settings, Login, Register)
components/     # 재사용 UI (Header, TeaCard, NoteCard, FAB, EmptyState, ...)
components/ui/  # shadcn/ui 래퍼 + cn() 유틸
lib/api.ts      # API 클라이언트 (teasApi, notesApi, authApi)
hooks/          # 커스텀 훅 (useAsyncData, ...)
contexts/       # React Context (AuthContext)
utils/          # 유틸리티 (teaTags, logging, ...)
constants/      # 전역 상수
styles/         # TailwindCSS v4 토큰 (globals.css @theme inline)
```

## Backend 구조 (`backend/src/`)
```
modules/        # 기능 모듈: auth, users, teas, notes, health
database/       # TypeORM 설정
```
- Global prefix: `/api`

## API 엔드포인트
- **Auth**: POST /api/auth/register, /api/auth/login, /api/auth/profile
- **Teas**: GET /api/teas (search: `?q=`), GET /api/teas/:id, POST /api/teas
- **Notes**: GET /api/notes (`?userId`, `?public=true`, `?teaId`), GET/POST/PATCH/DELETE /api/notes/:id
- **Health**: GET /api/health

## App.tsx 라우트 추가 시 3곳 모두 수정
1. lazy import
2. `<Route>` 추가
3. `shouldHide` 배열

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
