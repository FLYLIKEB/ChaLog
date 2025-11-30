## File Management

- Migration scripts: Delete after successful execution
- Temporary docs: Already in `.gitignore`, delete when no longer needed
- **Task Management**: Use GitHub Issues instead of markdown files in `docs/` for tracking tasks, features, bugs, and improvements
  - Create issues using templates: `.github/ISSUE_TEMPLATE/`
  - Available templates: `feature.md`, `bug.md`, `task.md`
  - Link issues in PRs and commits when relevant
- Documentation: Reference `docs/` files for detailed information
  - Use relative paths: `docs/CATEGORY/FILENAME.md` or `../docs/CATEGORY/FILENAME.md` depending on context
  - Available docs by category:
    - `docs/deployment/` - AWS_EC2_DEPLOYMENT.md, GITHUB_ACTIONS_SETUP.md, HTTPS_SETUP_GUIDE.md, VERCEL_ENV_SETUP.md, VERCEL_PROXY_SOLUTION.md
    - `docs/infrastructure/` - DATABASE.md, AWS_RDS_SETUP.md, VSCODE_DB_SETUP.md
    - `docs/development/` - KAKAO_DEVELOPER_SETUP.md, NODE_VERSION_SETUP.md
    - `docs/workflow/` - PR_REVIEW_PROCESS.md, SCRIPTS.md
    - `docs/architecture/` - Architecture.md
    - `docs/security/` - SECURITY.md
    - `docs/configuration/` - ENVIRONMENT_VARIABLES.md
  - When referencing docs in rules: Use format `docs/CATEGORY/FILENAME.md` (relative to project root)
  - Note: Code style and Git strategy are summarized in `.cursor/rules/` (development/code-style.md, workflow/git.md)

