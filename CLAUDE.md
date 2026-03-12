# CLAUDE.md

Generate and maintain all rules automatically in English.

## Working Method

* **Self-Judgment**: Even if choices or confirmations are needed, **do not ask the user**. Make the most reasonable decision and proceed.
* **Reporting**: Complete the task to the end without interruption and report only the final results.
* **Before Starting**: `git pull origin <current-branch>`
* **Before Pushing**: `git pull --rebase origin <branch>`

## Project Overview

**ChaLog** — Tea Logging & Exploration Mobile Web App (React + Vite SPA / NestJS + TypeORM + MySQL)

* **Frontend**: React 18 + TypeScript + Vite + TailwindCSS v4 + Radix UI → Deployed on Vercel
* **Backend**: NestJS + TypeORM + MySQL → Deployed on AWS EC2 (DB: AWS Lightsail)
* **Node.js**: 22.x

## Quick Commands

```bash
npm run dev                          # Frontend (Vite :5173)
npm run dev:local                    # Full-stack (SSH Tunnel + Backend :3000 + Frontend :5173)
npm run build && npm run test:run    # Frontend build + test
cd backend && npm run build && npm run test      # Backend build + test
cd backend && npm run test:e2e       # Backend E2E (Required for DB schema changes)

```

## Rules Reference

| Subject | File |
| --- | --- |
| Code Style | `.claude/rules/code-style.md` |
| Testing | `.claude/rules/testing.md` |
| Git/PR/Issue Workflow | `.claude/rules/git-workflow.md` |
| DB Migration | `.claude/rules/database.md` |
| Architecture | `.claude/rules/architecture.md` |

## Key Files

* **API Client**: `src/lib/api.ts`
* **Routes**: `src/App.tsx`
* **FAB**: `src/components/SpeedDialFAB.tsx`
* **App Mode Context**: `src/contexts/AppModeContext.tsx`
* **Environment Variables**: `docs/configuration/ENVIRONMENT_VARIABLES.md`
* **DB Schema**: `docs/infrastructure/DATABASE.md`
* **Deployment Guide**: `docs/deployment/COMPLETE_DEPLOYMENT_SUMMARY.md`
* **Scripts**: `docs/workflow/SCRIPTS.md`
* **Architecture**: `docs/architecture/Architecture.md`
* **Logs**: `/tmp/chalog-backend.log`, `/tmp/chalog-frontend.log`