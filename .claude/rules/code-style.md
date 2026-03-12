# Code Style

## Frontend (React + TypeScript)
- Functional components + hooks only
- Import alias: `@/` for `src/`
- Class merging: `cn()` from `components/ui/utils.ts`
- TypeScript strict mode — no `any`
- shadcn/ui patterns for UI components
- Components: `src/components/`, Pages: `src/pages/`

## Backend (NestJS)
- DI with `@Injectable()`, Controller → Service → Entity pattern
- DTOs for all input validation
- NestJS built-in exceptions for errors (`NotFoundException`, `BadRequestException`, etc.)
- Module structure: `backend/src/{module}/`

## General
- No unnecessary comments — code should be self-explanatory
- No `console.log` in committed code (use NestJS Logger on backend)
- Korean commit messages: `feat: #번호 설명` / `fix: #번호 설명`
