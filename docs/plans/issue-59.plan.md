다음 GitHub 이슈를 기반으로 개발 계획(plan)을 작성해주세요.

---

## 이슈 정보
- 번호: #59
- 제목: [성능 최적화] 프로덕션 코드에서 console.log 제거
- 라벨: enhancement
- URL: https://github.com/FLYLIKEB/ChaLog/issues/59

## 이슈 본문

## 문제점
프로덕션 코드에 `console.log`가 다수 남아있어 성능에 영향을 줄 수 있습니다.

## 영향
- 브라우저 콘솔에 불필요한 로그 출력
- 프로덕션 환경에서 성능 저하 가능성

## 해결 방안
- 모든 `console.log` 제거 또는 개발 환경에서만 작동하도록 조건부 처리
- `logger` 유틸리티를 사용하여 개발 환경에서만 로그 출력

## 관련 파일
- `src/components/NoteCard.tsx` (북마크 관련 console.log)
- `src/pages/NoteDetail.tsx` (북마크 관련 console.log)

## 우선순위
높음

---

## 조건
- .cursor/rules/github-issue-workflow.mdc 규칙을 따르세요.
- 브랜치 명명: feature/issue-59-{기능명-kebab-case}
- 테스트 계획을 포함하세요 (프론트엔드: npm run test:run, 백엔드: cd backend && npm run test, E2E: cd backend && npm run test:e2e)
- 테스트 후 커밋 전, 변경사항에 대한 셀프 코드리뷰를 진행하세요. .cursor/rules/ 의 rule 파일들을 참조해 코드리뷰를 진행하세요.
- 구현 전 단계별 계획만 제시하고, 코드 작성은 하지 마세요.

## 필수: 구체적인 Todo
반드시 TodoWrite 형식의 구체적인 todo 목록을 포함하세요. 각 todo는 실행 가능한 단위 작업으로, 파일/경로·기능을 명시하고 5~10개 이상 구체적으로 나열하세요.
**todo 순서: 구현 → 테스트 → 셀프 코드리뷰(.cursor/rules/ 참조) → 커밋 → PR → main 브랜치로 이동**
