## Code Style

### Frontend (React + TypeScript)
- Functional components with hooks, `cn()` utility, shadcn/ui patterns
- Import alias: `@/` for `src/`, TypeScript strict types
- Components: `src/components/`, Pages: `src/pages/`

### Backend (NestJS)
- DI with `@Injectable()`, Controller → Service → Entity pattern
- DTOs for validation, NestJS exceptions for errors
- Modules: `backend/src/{module}/`

### Testing
- Frontend: Vitest + Testing Library (`*.test.tsx` in `__tests__/`)
- Backend: Jest (`*.spec.ts` alongside source)
- Pattern: Arrange → Act → Assert

