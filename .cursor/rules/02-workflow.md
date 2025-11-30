## Core Workflow

### Local Development Server

To run the local development environment (SSH tunnel, backend, frontend) all at once:
- Run `npm run dev:local` (recommended)
- Or run `./scripts/start-local.sh`

To stop the local development environment:
- Run `npm run dev:stop` (recommended)
- Or run `./scripts/stop-local.sh`

Note: The 'run' command executes 'pkill -f "next dev" || true && npm run dev'
- Note: This project uses Vite, so the above command only runs the frontend
- To run the full environment (SSH tunnel+backend+frontend), use `npm run dev:local`

### Git Operations
- Commit messages: Korean format `<type>: <description>` (e.g., `feat: 노트 필터 기능 추가`)
- Pre-commit: Run `npm run lint` (if exists), `tsc --noEmit`, `npm run test:run` (if exists)
  - If validation fails: Show errors, don't commit, suggest fixes
- Branch naming: Use `feature/*` pattern based on changed files
- Documentation: Auto-update README.md, docs/architecture/Architecture.md when code changes
  - Triggers: New features, API changes, component changes, route/page changes, dependency changes

### PR Review Process
- Input: PR URL or PR number
- Process: Automatically fetch all review threads, apply fixes, commit changes, push to remote, and resolve all review threads
- Output: All review feedback implemented and review threads resolved

Workflow:
1. Parse PR number from URL or use provided number
2. Fetch all unresolved review threads using GitHub GraphQL API
3. Analyze and apply review feedback to code
4. Commit all changes with review reference
5. Push all commits to remote in one batch
6. Automatically resolve all review threads via GitHub API

Detailed Guide: docs/workflow/PR_REVIEW_PROCESS.md

### PR Creation
- Check branch is `feature/*` and pushed to remote
- Generate title from branch name, description from commits
- Use `gh pr create` if available, otherwise provide GitHub URL

