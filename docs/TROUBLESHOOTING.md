# Troubleshooting Guide

This document provides detailed error handling scenarios and troubleshooting steps.

## Git Operations

### Git Conflicts

**During merge:**
- Stop execution immediately
- Show conflict files to user
- Ask user to resolve conflicts manually
- Never force merge without user confirmation

**During pull:**
- Stop execution immediately
- Show conflict files to user
- Ask user to resolve conflicts manually
- Never force pull without user confirmation

**Resolution steps:**
1. Check conflicted files: `git status`
2. Open files and resolve conflicts manually
3. Stage resolved files: `git add <file>`
4. Complete merge: `git commit`

### Branch Issues

**Branch doesn't exist:**
- Create branch before operations: `git checkout -b feature/<name>`
- Check if branch exists: `git branch --list`

**Branch diverged:**
- Use `--force-with-lease` only after user confirmation
- Check divergence: `git status`
- Show user what will be overwritten before force push

**Cannot delete branch:**
- Inform user why (unmerged changes, current branch, etc.)
- Suggest alternatives (merge first, switch branch, etc.)

### Network Issues

**Push fails:**
- Retry once
- If fails, inform user to check network connection
- Check remote configuration: `git remote -v`

**Pull fails:**
- Check network connection
- Verify remote URL is correct
- Inform user to check remote repository access

**Remote not found:**
- Inform user to check remote configuration
- Verify remote URL: `git remote get-url origin`

## Pre-commit Validation

### Lint Errors

**When lint check fails:**
- Show specific file and line errors
- Do NOT proceed with commit
- Suggest fixes based on error messages
- Allow user to skip validation only if explicitly requested

**Common fixes:**
- Run `npm run lint --fix` for auto-fixable issues
- Manually fix remaining errors
- Re-run validation before committing

### Type Errors

**When TypeScript check fails:**
- Show TypeScript errors with file and line numbers
- Do NOT proceed with commit
- Suggest fixes based on error messages
- Check for missing type definitions or incorrect types

**Common fixes:**
- Add missing type definitions
- Fix type mismatches
- Use proper TypeScript types instead of `any`

### Test Failures

**When tests fail:**
- Show failing tests with error messages
- Do NOT proceed with commit
- Suggest fixes based on test failures
- Check for broken functionality or incorrect test expectations

**Common fixes:**
- Fix broken functionality
- Update test expectations if behavior changed intentionally
- Check test setup and mock data

## Script Execution

### Missing Scripts

**When script doesn't exist:**
- Check if script exists before execution
- If missing, provide manual alternative steps
- Never assume scripts exist
- Reference `docs/SCRIPTS.md` for available scripts

**Common scenarios:**
- Script path incorrect: Verify script location
- Script not executable: Check file permissions (`chmod +x`)
- Script dependencies missing: Check required tools are installed

### Script Execution Failures

**When script fails:**
- Show error output to user
- Check script prerequisites (environment variables, dependencies)
- Verify script is compatible with current environment
- Provide manual steps as alternative

## Database Operations

### Connection Issues

**SSH tunnel problems:**
- Verify SSH tunnel is running: `ps aux | grep ssh`
- Check `.env` file has correct SSH configuration
- Verify EC2 instance is accessible
- See `docs/DATABASE.md` for detailed setup

**Database connection failures:**
- Verify SSH tunnel is active
- Check database credentials in `.env`
- Verify database exists and is accessible
- Check network connectivity

### Migration Issues

**Migration script errors:**
- Check database schema matches expected state
- Verify migration script hasn't been run before
- Check for conflicting migrations
- Review migration script for errors

## API Errors

### Backend API Failures

**When API calls fail:**
- Check backend server is running
- Verify API endpoint exists and is correct
- Check request format matches API expectations
- Review error response for details

**Common issues:**
- CORS errors: Check backend CORS configuration
- Authentication errors: Verify tokens are valid
- Validation errors: Check request data format

### Frontend API Integration

**When API integration fails:**
- Check API client configuration
- Verify API endpoints match backend
- Check network requests in browser DevTools
- Verify error handling is implemented

## Development Environment

### Dependency Issues

**When npm install fails:**
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`
- Reinstall: `npm install`
- Check Node.js version compatibility

**When build fails:**
- Check TypeScript errors: `tsc --noEmit`
- Verify all dependencies are installed
- Check for version conflicts in `package.json`
- Review build error messages

### Environment Variables

**When env variables are missing:**
- Check `.env` file exists
- Verify required variables are set
- Check `.env.example` for reference
- Ensure `.env` is in `.gitignore`

## General Troubleshooting Steps

1. **Check logs**: Review error messages carefully
2. **Verify prerequisites**: Ensure all required tools/configurations are in place
3. **Check documentation**: Reference relevant docs (DATABASE.md, SCRIPTS.md, etc.)
4. **Isolate the issue**: Test components individually
5. **Ask for help**: If issue persists, provide detailed error information

