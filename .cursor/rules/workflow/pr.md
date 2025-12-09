## PR Review Process

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

## PR Creation

- Check branch is `feature/*` and pushed to remote
- Generate title from branch name, description from commits
- Link related issues in PR description:
  - Use `Closes #123` or `Fixes #123` to auto-close issues when PR is merged
  - Use `Related to #123` for related but not directly closing issues
- Use `gh pr create` if available, otherwise provide GitHub URL

## DB Schema Changes (Migration Required)

- When entity files (`*.entity.ts`) are modified, Migration files must be included
- Check for Migration files in `backend/migrations/` directory
- Verify Migration file has both `up` and `down` methods implemented
- Entity files and Migration files must be committed together
- If entity changes exist without Migration files, request Migration creation
- Test DB must have Migration applied before PR merge
- Reference: `backend/MIGRATION_WORKFLOW.md` for detailed workflow

