## Testing

### Test Structure
- Frontend: Vitest + Testing Library (`*.test.tsx` in `__tests__/`)
- Backend: Jest (`*.spec.ts` alongside source, E2E in `test/`)
- Pattern: Arrange → Act → Assert

### Test Database Isolation (Backend E2E)
- Always use separate test database (never use production DB)
- Test DB name must contain `test` or `_test` (e.g., `chalog_test`)
- Use `TEST_DATABASE_URL` in `.env.test` file
- Test DB is automatically cleaned up after all tests complete
- Each test group (`describe`) cleans up its own data in `beforeEach`
- Foreign key constraints are handled during cleanup

### Test Execution
- Backend E2E: `cd backend && npm run test:e2e`
- Tests automatically load `.env.test` if available
- Verify test DB name in console output before running tests
- If test DB name doesn't contain `test`, fix `.env.test` configuration

### Test Isolation Requirements
- Each test group must clean up data in `beforeEach` or `afterEach`
- Use `cleanupDatabase()` helper function for consistent cleanup order
- Cleanup order (used by `cleanupDatabase()`): child tables first → parent tables
  - `note_bookmarks` → `note_likes` → `note_tags` → `tags` → `notes` → `teas` → `user_authentications` → `users`
- Note: Individual test groups may perform more granular cleanup in their `beforeEach` handlers
- Disable foreign key checks during cleanup: `SET FOREIGN_KEY_CHECKS = 0`

### Before Writing Tests
- Ensure test database exists and has all required tables
- Verify `.env.test` file is configured correctly
- Check that test DB name contains `test` or `_test`

### Import Rules
- Always use default import for `supertest`: `import request from 'supertest'`
- Never use namespace import: `import * as request from 'supertest'` (causes TypeScript call signature errors)

