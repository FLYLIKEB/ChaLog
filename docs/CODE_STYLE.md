# Code Style Guide

This document provides detailed code style guidelines for the ChaLog project.

## Frontend (React + TypeScript)

### Component Structure
- Use functional components with hooks, avoid class components
- Component structure: Props interface → component → export default
- Use `cn()` utility from `components/ui/utils.ts` for className merging
- Follow shadcn/ui component patterns: use Radix UI primitives + CVA for variants

### Import Paths
- Use `@/` alias for `src/` directory (e.g., `@/components/Button`)
- Prefer named exports for utilities, default exports for components
- Import icons individually from `lucide-react`

### TypeScript
- Use TypeScript strict types, avoid `any` unless necessary
- Define component props as TypeScript interfaces above component
- Use TypeScript utility types (`Pick`, `Omit`, `Partial`) when appropriate

### Styling
- Use Tailwind CSS classes, prefer utility classes over custom CSS
- Include proper ARIA labels and keyboard navigation for accessibility

### File Organization
- Components: `src/components/` (UI components in `components/ui/`)
- Pages: `src/pages/` (route components)
- Utils: `src/lib/` (frontend utilities)

## Backend (NestJS)

### Module Pattern
- Follow NestJS module pattern: Controller → Service → Entity
- Use dependency injection with `@Injectable()` decorator
- Service methods should be async and return Promises

### Validation & Error Handling
- Use DTOs for request/response validation with class-validator decorators
- Throw appropriate NestJS exceptions (`NotFoundException`, `ForbiddenException`, etc.)
- Let exception filters handle responses

### Data Access
- Use TypeORM repositories with `@InjectRepository()` decorator
- Modules: `backend/src/{module}/` (controller, service, entities, dto)

### File Organization
- Backend modules: `backend/src/{module}/` (controller, service, entities, dto)
- Shared types: `packages/types/` (use in both frontend and backend)
- Utils: `backend/src/common/` (backend utilities)

## Type Definitions

- Shared types: Define in `packages/types/index.ts` for frontend/backend sharing
- Component props: Define inline or in same file
- API types: Match backend DTOs in `packages/types/`

## Testing

### Frontend
- Use Vitest + Testing Library
- Tests in `__tests__/` directories
- Test naming: `*.test.tsx`
- Mock data: Use `src/lib/mockData.ts` for frontend tests (if exists)

### Backend
- Use Jest
- Tests alongside source files (`.spec.ts`)
- Test naming: `*.spec.ts`

### Test Structure
- Follow Arrange → Act → Assert pattern

## Error Handling

### Frontend
- Use try-catch blocks
- Show user-friendly error messages with `sonner` toast
- Handle API errors consistently

### Backend
- Throw appropriate NestJS exceptions
- Return consistent error format from backend
- Use exception filters for centralized error handling

## Performance

### React
- Use `React.memo()` for expensive components
- Use `useMemo()`/`useCallback()` when needed
- Avoid unnecessary re-renders: Check dependencies in hooks

### Code Splitting
- Lazy load routes with `React.lazy()` if needed
- Images: Use proper sizing and lazy loading

