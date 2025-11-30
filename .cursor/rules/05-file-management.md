## File Management

- Migration scripts: Delete after successful execution
- Temporary docs: Already in `.gitignore`, delete when no longer needed
- Documentation: Reference `docs/` files for detailed information
  - Use relative paths: `docs/FILENAME.md` or `../docs/FILENAME.md` depending on context
  - Available docs: git-strategy.md, architecture.md, DATABASE.md, SECURITY.md, CODE_STYLE.md, TROUBLESHOOTING.md, PR_REVIEW_PROCESS.md, ENVIRONMENT_VARIABLES.md, AWS_EC2_DEPLOYMENT.md
  - When referencing docs in rules: Use format `docs/FILENAME.md` (relative to project root)

