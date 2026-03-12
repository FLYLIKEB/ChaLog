# CLAUDE.md

## 작업 방식
- 선택지나 확인이 필요해도 **사용자에게 묻지 말고** 가장 합리적인 방향으로 자체 판단
- 질문 없이 끝까지 완료 후 결과만 보고
- **작업 시작 전**: `git pull origin <현재 브랜치>`
- **푸시 전**: `git pull --rebase origin <브랜치>`

## 프로젝트 개요

**ChaLog** — 차 기록/탐색 모바일 웹앱 (React + Vite SPA / NestJS + TypeORM + MySQL)
- Frontend: React 18 + TypeScript + Vite + TailwindCSS v4 + Radix UI → Vercel
- Backend: NestJS + TypeORM + MySQL → AWS EC2 (DB: AWS Lightsail)
- Node.js: 22.x

## 빠른 명령어

```bash
npm run dev                          # 프론트엔드 (Vite :5173)
npm run dev:local                    # 풀스택 (SSH 터널 + 백엔드 :3000 + 프론트 :5173)
npm run build && npm run test:run    # 프론트엔드 빌드 + 테스트
cd backend && npm run build && npm run test      # 백엔드 빌드 + 테스트
cd backend && npm run test:e2e       # 백엔드 E2E (DB 스키마 변경 시 필수)
```

## 규칙 참조

| 주제 | 파일 |
|------|------|
| 코드 스타일 | `.claude/rules/code-style.md` |
| 테스트 | `.claude/rules/testing.md` |
| Git/PR/이슈 워크플로우 | `.claude/rules/git-workflow.md` |
| DB 마이그레이션 | `.claude/rules/database.md` |
| 아키텍처 구조 | `.claude/rules/architecture.md` |

## Key Files

- **API 클라이언트**: `src/lib/api.ts`
- **라우트**: `src/App.tsx`
- **FAB**: `src/components/SpeedDialFAB.tsx`
- **앱 모드 컨텍스트**: `src/contexts/AppModeContext.tsx`
- **환경변수**: `docs/configuration/ENVIRONMENT_VARIABLES.md`
- **DB 스키마**: `docs/infrastructure/DATABASE.md`
- **배포 가이드**: `docs/deployment/COMPLETE_DEPLOYMENT_SUMMARY.md`
- **스크립트**: `docs/workflow/SCRIPTS.md`
- **아키텍처**: `docs/architecture/Architecture.md`
- **로그**: `/tmp/chalog-backend.log`, `/tmp/chalog-frontend.log`
