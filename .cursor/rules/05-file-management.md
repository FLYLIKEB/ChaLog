## File Management

- Migration scripts: Delete after successful execution
- Temporary docs: Already in `.gitignore`, delete when no longer needed
- Documentation: Reference `docs/` files for detailed information
  - Use relative paths: `docs/FILENAME.md` or `../docs/FILENAME.md` depending on context
  - Available docs: architecture.md, DATABASE.md, SECURITY.md, SCRIPTS.md, PR_REVIEW_PROCESS.md, ENVIRONMENT_VARIABLES.md, AWS_EC2_DEPLOYMENT.md, GITHUB_ACTIONS_SETUP.md, HTTPS_SETUP_GUIDE.md
  - When referencing docs in rules: Use format `docs/FILENAME.md` (relative to project root)
  - Note: Code style and Git strategy are summarized in `.cursor/rules/` (03-code-style.md, 02-workflow.md)

