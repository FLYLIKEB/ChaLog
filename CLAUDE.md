# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ChaLog** is a mobile-first React + Vite SPA for tea logging and discovery. It features home feed (tea recommendations, public notes), tea search with auto-complete, detailed note creation with 5-point rating sliders, note management, and a radar chart for visualization. The backend is NestJS + TypeORM with MySQL on AWS Lightsail. Frontend is deployed to Vercel, backend to EC2.

**Key Tech:**
- Frontend: React 18 + TypeScript + Vite + TailwindCSS v4 + Radix UI
- Backend: NestJS + TypeORM + MySQL
- Testing: Vitest (frontend) + Jest/E2E (backend)
- Monorepo: Root (frontend), `backend/`, `packages/types/`

**Node.js version:** 22.x (see `.nvmrc`)

## Common Commands

### Development
```bash
npm run dev                    # Frontend only (Vite on :5173)
npm run dev:local            # Full stack: SSH tunnel + backend (:3000) + frontend (:5173)
npm run dev:stop             # Kill all local servers
```

### Building & Testing
```bash
npm run build                # Frontend production build → dist/
npm run test                 # Frontend tests (watch mode)
npm run test:run             # Frontend tests (single run)

cd backend && npm run build   # Backend NestJS build
cd backend && npm run start:dev    # Backend dev server (watch mode)
cd backend && npm run test    # Backend unit tests
cd backend && npm run test:e2e     # Backend E2E tests (requires .env.test)
```

### Database (Backend)

**접속 방식:**
- **원격 (Lightsail MySQL):** SSH 터널 경유 → `cd backend/scripts && ./start-ssh-tunnel.sh` (로컬 포트 3307 → 원격 3306). `DATABASE_URL` 사용.
- **로컬 (MySQL):** `LOCAL_DATABASE_URL=mysql://root:<pw>@127.0.0.1:3306/chalog` 직접 접속. 로컬 MySQL 서버 필요.
- **테스트:** `TEST_DATABASE_URL` (DB명에 반드시 "test" 포함)

```bash
cd backend/scripts
./start-ssh-tunnel.sh         # Start SSH tunnel to Lightsail MySQL
./stop-ssh-tunnel.sh          # Stop SSH tunnel
./check-database.sh           # Verify DB connection
node create-tables.js         # Create schema (use with TEST_DATABASE_URL for tests)
node insert-sample-data.js    # Seed test data
```

## Project Architecture

### Frontend Structure (`src/`)
- **pages/** — Route-level components (Home, Search, TeaDetail, NoteDetail, MyNotes, Settings, Login, Register)
- **components/** — Reusable UI components (Header, TeaCard, NoteCard, FAB, EmptyState, etc.)
- **components/ui/** — shadcn/ui wrapper components + `cn()` utility for class merging
- **lib/api.ts** — API client with endpoints (teasApi, notesApi, authApi)
- **hooks/** — Custom hooks (useAsyncData, etc.)
- **contexts/** — React Context (AuthContext for auth state)
- **utils/** — Utilities (teaTags, logging, etc.)
- **constants/** — Global constants
- **styles/** — Tailwind v4 tokens (globals.css with @theme inline)

### Backend Structure (`backend/src/`)
- **modules/** — Feature modules: auth, users, teas, notes, health
- **database/** — TypeORM configuration
- Global prefix: `/api` (NestJS `setGlobalPrefix('api')`)

### API Endpoints
- **Auth:** POST /auth/register, /auth/login, /auth/profile
- **Teas:** GET /teas (with search `?q=`), GET /teas/:id, POST /teas
- **Notes:** GET /notes (filters: ?userId, ?public=true, ?teaId), GET /notes/:id, POST/PATCH/DELETE /notes/:id
- **Health:** GET /health

### Data Flow
1. `src/lib/api.ts` (`apiClient`) handles all HTTP communication
2. Date strings auto-convert to Date objects, DECIMAL ratings → numbers
3. Note responses normalized: backend relationship data → `teaName`, `userName` extraction
4. Error messages: backend sends Korean messages, frontend translates English → Korean

## Development Practices

### Code Style
- **Import alias:** Use `@/` for `src/` (configured in vite.config.ts)
- **Components:** Functional components + hooks, use `cn()` from `components/ui/utils.ts` for class merging
- **TypeScript:** Strict mode enabled
- **Commits:** Korean format `feat: <description>` or `fix: #<issue-number> <description>`
  - Branch naming: `feature/issue-{number}-{description}` for issue-based work

### Git Workflow
- **Branch strategy:** GitHub Flow (main + feature branches)
- **PR requirement:** All feature work → PR → review → squash merge to main
- **E2E testing for notes schema changes:** If modifying `*.entity.ts` in backend, always include Migration files in commit

### Testing
**Frontend (Vitest + Testing Library):**
- Test files: `src/**/__tests__/*.test.tsx`
- Setup: `src/test/setup.ts`
- Pattern: Arrange → Act → Assert

**Backend E2E (Jest):**
- E2E test structure: `backend/test/`
  - `setup/test-setup.ts` — Shared setup/teardown, TestHelper class
  - `suites/*.e2e-spec.ts` — Feature-specific tests (auth, teas, notes-crud, notes-bookmark, etc.)
  - `helpers/test-helper.ts` — TestHelper with createUser, createTea, createNote, etc.
  - `constants/test-constants.ts` — Test data
- **Always use separate test database:** Set `TEST_DATABASE_URL` in `.env.test` (must contain "test" in name)
- **Import supertest as default:** `import request from 'supertest'` (never namespace import)
- **Cleanup order:** child tables first (note_bookmarks → users)
- Run: `cd backend && npm run test:e2e`

### Environment Variables
- **Centralized:** All env vars defined in `.env.example`, actual values in `.env`
- **Frontend:** VITE_API_BASE_URL (backend API URL)
- **Backend:** Database URL, JWT secret, server port, etc.
- **Copy template:** `cp .env.example .env` (root and `backend/` separately)

### Error Handling
- Stop on git conflicts (never force merge), show conflicting files, ask user
- Validation failures: show errors, don't commit, suggest fixes
- Missing scripts: check existence first, provide manual alternatives

## Important Notes

- **Vite proxy:** `/api` routes proxy to `http://localhost:3000` (matches NestJS global prefix)
- **Build chunks:** Markdown, charts, React, Radix UI split into separate bundles for optimization
- **Test DB cleanup:** Automatic after all tests; each suite cleans up in beforeEach with foreign key handling
- **Supabase Edge Functions:** Optional (in `src/supabase/functions/`), not required for core functionality
- **Logs:** When using `npm run dev:local`, check `/tmp/chalog-backend.log` and `/tmp/chalog-frontend.log` for real-time monitoring

## Key Files & References

- **Cursor rules:** `.cursor/rules/` — Code style, testing, git workflow (single source of truth)
- **README:** `README.chgbackup` — Full quickstart, deployment, API docs, folder structure
- **Architecture:** `docs/architecture/Architecture.md` — Detailed system design
- **Scripts:** `docs/workflow/SCRIPTS.md` — All utility scripts (git, database, deployment)
- **Environment:** `docs/configuration/ENVIRONMENT_VARIABLES.md` — All env var definitions
- **Database:** `docs/infrastructure/DATABASE.md` — Schema, migrations, relationships
- **Deployment:**
  - Backend: EC2 auto-deploy via GitHub Actions (main branch triggers)
  - Frontend: Vercel (auto-deploy on push, requires VITE_API_BASE_URL in Vercel settings)

## Issue-Based Feature Development

1. Create issue (or use existing)
2. Create branch: `git checkout -b feature/issue-{number}-{description}`
3. Use Plan mode if complex
4. Implement & test: `npm run build && npm run test:run` (frontend), `cd backend && npm run build && npm run test` (backend)
5. Commit with issue reference: `git commit -m "feat: #123 feature name"`
6. Create PR with `Closes #{number}` in description
7. Merge after approval

---

For team guidelines, code patterns, and additional context, always check `.cursor/rules/` and existing docs first.
