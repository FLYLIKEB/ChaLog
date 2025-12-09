## Database Schema Management

### TypeORM Migrations

- Use TypeORM Migrations for all schema changes (never use synchronize in production)
- Migration files location: `backend/migrations/`
- Migration commands:
  - Generate: `npm run migration:generate -- migrations/MigrationName`
  - Run: `npm run migration:run`
  - Revert: `npm run migration:revert`
  - Show: `npm run migration:show`

### Schema Change Workflow

1. Modify entity files (`*.entity.ts`)
2. Generate Migration: `npm run migration:generate -- migrations/MigrationName`
3. Review generated Migration file (check `up` and `down` methods)
4. Apply to test DB: `TEST_DATABASE_URL=... ./scripts/sync-schema.sh test`
5. Run tests: `npm run test:e2e`
6. Commit entity and Migration files together
7. Production Migration runs automatically via CI/CD

### Required Checks

- Entity file changes must include Migration files
- Migration files must have both `up` and `down` methods
- Test DB must have Migration applied before PR merge
- Never commit entity changes without Migration files

### Scripts

- Sync schema: `./scripts/sync-schema.sh [test|prod]`
- Compare schemas: `./scripts/compare-schema.sh`
- Reference: `backend/MIGRATION_WORKFLOW.md` for detailed guide

