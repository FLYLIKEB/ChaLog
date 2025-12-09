## Rules Management

### Structure
- Rules are organized in `.cursor/rules/` by category:
  - `development/`: Development practices (code-style, debugging, error-handling, testing)
  - `workflow/`: Workflow processes (git, pr, database, development-server, scripts, file-management)

### Naming Convention
- Use specific, descriptive names (e.g., `git.md`, `pr.md` instead of generic `workflow.md`)
- Avoid numbered prefixes (e.g., `01-debugging.md` → `debugging.md`)

### Writing Rules
- Keep it concise - Remove unnecessary explanations, focus on core principles
- Use bullet points and clear sections
- Avoid redundancy and verbose descriptions
- Do not use bold markdown (`**text**`) - use plain text only

### Documentation Alignment
- When adding or editing rules, confirm every statement against the actual code or configuration files (never trust outdated docs)
- If the rule references a file or API, open the source file and verify names, ports, env vars, etc.
- Keep docs and rules synchronized: update the relevant `docs/**` entry immediately after changing a rule

### Updating Rules
- When modifying rules, update all references in:
  - Other rule files
  - `docs/` documentation files
  - `README.md`
- Ensure consistency across the codebase

### Task Tracking
- Use GitHub Issues for tasks, features, and improvements (not markdown files)
- Link issues in commits and PRs using `#123` format

