## Git 브랜치 운영 전략

| 브랜치 | 용도 | 병합 규칙 |
| --- | --- | --- |
| `main` | 실제 배포·버전 태깅 전용 | PR + CI 통과만 허용, 보호 규칙으로 직접 push 금지 |
| `develop` | 다음 배포를 준비하는 통합 브랜치 | `feature/*`·`hotfix/*` PR만 병합 |
| `feature/*` | 단일 기능/버그 작업 (`feature/note-filter` 등) | 구현·테스트 후 리뷰 → `develop` merge |
| `release/*` | 릴리스 안정화, 버전 넘버/릴리스 노트 정리 | QA 완료 시 `main`, `develop` 모두에 병합 |
| `hotfix/*` | 운영 긴급 수정 | `main`에서 분기해 패치 후 동일 커밋을 `main`·`develop`에 반영 |

### 작업 흐름
1. 새 작업은 `develop`에서 `feature/*`로 분기해 진행합니다.
2. 기능 구현·테스트 후 PR을 열어 코드 리뷰와 CI를 통과시키고 `develop`에 병합합니다.
3. 배포가 필요하면 `release/*`를 생성해 QA/버전 태깅/문서화를 마친 뒤 `main`에 병합하고 태그를 남깁니다.
4. 같은 커밋을 `develop`에도 병합해 이력 차이를 없애고, 릴리스 노트·배포 아티팩트를 보관합니다.
5. 운영 이슈가 발생하면 `hotfix/*`를 즉시 만들어 패치하고, 완료 즉시 `main`·`develop`에 병합합니다.

### 커밋 메시지 규칙
- 한글로 작성 (예: `feat: 노트 필터 기능 추가`, `fix: 인증 버그 수정`)
- 커밋 타입: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:` 등
- 커밋 전 체크: `npm test`, `npm run lint`, `tsc --noEmit`

## Cursor AI 자동화 명령어

프로젝트는 Cursor AI를 활용한 Git 워크플로우 자동화를 지원합니다. **상세한 명령어 정의와 사용법은 `.cursor/rules` 파일을 참고하세요.** (단일 소스)

**주요 명령어 요약:**
- **Quick Commit & Push ("ch")**: 변경사항을 분석하여 기능별로 자동 커밋하고 푸시
- **Quick Pull ("pl")**: 현재 브랜치와 주요 브랜치(`main`, `develop`)를 최신화
- **Merge Main ("mg")**: 모든 로컬 브랜치에 `main`의 변경사항을 자동 머지 및 푸시
- **Clean Branches ("clean" 또는 "cl")**: 원격에 없는 로컬 브랜치 자동 정리
- **Create PR ("pr" 또는 "pr생성")**: 현재 브랜치의 PR 자동 생성

## 자동화 스크립트

### 전체 릴리스 (`scripts/full-release.sh`)
테스트, 린트, 타입 체크부터 배포까지 전체 프로세스를 자동화합니다.

**사용법**:
```bash
scripts/full-release.sh "<commit-message>" "<version-tag>" [feature-branch]
```

**예시**:
```bash
scripts/full-release.sh "feat: 노트 필터 기능 추가" v0.5.0
```

**프로세스**:
1. 테스트/린트/타입 체크 실행
2. feature 브랜치 커밋 및 푸시
3. `develop`에 병합
4. `release/*` 브랜치 생성 및 푸시
5. `main`에 병합 및 태그 생성
6. `develop` 재동기화 및 `release/*` 정리

## 브랜치 관리 팁

### 원격에 없는 브랜치 정리
로컬에만 존재하는 브랜치를 확인하고 삭제:
```bash
git fetch --prune
git branch -vv | grep ': gone]' | awk '{print $1}'  # 확인
git branch -D <branch-name>  # 삭제
```

### 브랜치 동기화
주기적으로 모든 브랜치를 `main`과 동기화:
- `mg` 명령어 사용 또는 수동으로 각 브랜치에 `main` 머지

### 브랜치 정리
원격에 없는 브랜치를 자동으로 정리:
- `clean` 또는 `cl` 명령어 사용

### Pre-commit 검증
모든 커밋 전에 자동으로 실행되는 검증:
- Lint 검사 (`npm run lint`)
- 타입 검사 (`tsc --noEmit`)
- 테스트 실행 (`npm run test:run`)
- 검증 실패 시 커밋이 차단됩니다

### Pull Request 자동 생성
브랜치 푸시 후 PR을 자동으로 생성:
- `pr` 또는 `pr생성` 명령어 사용
- 브랜치명과 커밋 메시지를 기반으로 PR 제목 및 설명 자동 생성

### 정책 · 자동화 권장 사항
- GitHub에서 `main`, `develop` 브랜치 보호 규칙을 설정해 최소 1인 리뷰·CI 통과·squash merge를 요구합니다.
- CI 파이프라인에 `release/*` 생성 시 버전 검증, `main` 병합 시 태그·배포 스텝을 자동화합니다.
- 브랜치 네이밍과 릴리스 절차를 README와 본 문서에 유지해 온보딩 시 공유합니다.

