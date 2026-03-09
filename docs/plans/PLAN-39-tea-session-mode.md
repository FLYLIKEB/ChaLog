# 개발 계획: #39 다회 모드(Tea Session Mode) - 세션 생성 및 탕별 기록

> **참고:** 이 문서는 이슈 #39용 계획이며, 다른 이슈(예: #133) PR에 포함된 경우 해당 PR과 무관한 향후 작업 참고용입니다.

## 이슈 정보

- **번호:** #39
- **제목:** [3단계] 다회 모드(Tea Session Mode) - 세션 생성 및 탕별 기록
- **URL:** https://github.com/FLYLIKEB/ChaLog/issues/39
- **브랜치:** `feature/issue-39-tea-session-mode`

---

## 목표

차를 여러 번 우려 마시는 과정을 체계적으로 기록할 수 있는 다회 모드를 구현합니다. 기존 노트 작성(`/note/new`)과 별도 플로우로 동작합니다.

---

## 요구사항 요약

| 요구사항 | 설명 |
|---------|------|
| 세션 생성 | 차 선택 후 다회 세션 시작 |
| 탕별 타이머 | 각 우림 시간 기록 (브라우저/백그라운드 고려) |
| 탕별 미니 기록 | 향, 맛, 색 등 간단한 평가 |
| 세션 요약 화면 | 모든 탕의 기록 종합 표시 |
| 노트 발행 | 세션 요약 후 한 번에 노트 발행 |
| 세션 히스토리 | 과거 세션 목록 조회 |

---

## 단계별 개발 계획

### Phase 1: 백엔드 - 데이터 모델 및 API

#### 1.1 DB 스키마 설계 및 마이그레이션

- **테이블 설계**
  - `tea_sessions`: 세션 메타데이터
    - `id`, `userId`, `teaId`, `createdAt`, `updatedAt`
    - `noteId` (nullable): 발행된 노트 ID (발행 시 연결)
  - `tea_session_steeps` (또는 `session_steeps`): 탕별 기록
    - `id`, `sessionId`, `steepNumber` (1, 2, 3...)
    - `steepDurationSeconds`: 우림 시간(초)
    - `aroma`, `taste`, `color` 등 미니 평가 (JSON 또는 개별 컬럼)
    - `memo` (nullable): 탕별 메모
    - `createdAt`
- **마이그레이션 파일** 생성 (예: `1800000000000-CreateTeaSessionsTable.ts`)
- **외래키**: `tea_sessions` → `users`, `teas`, `notes` (선택적)

#### 1.2 엔티티 및 DTO

- `TeaSession` 엔티티
- `TeaSessionSteep` 엔티티
- `CreateTeaSessionDto`, `CreateSessionSteepDto`, `UpdateSessionSteepDto`
- `PublishSessionToNoteDto` (세션 → 노트 발행 시)

#### 1.3 서비스 및 컨트롤러

- `TeaSessionsService`: CRUD, 세션 목록 조회, 노트 발행
- `TeaSessionsController`: REST API
  - `POST /tea-sessions` - 세션 생성
  - `GET /tea-sessions` - 내 세션 목록 (필터: teaId, 기간 등)
  - `GET /tea-sessions/:id` - 세션 상세 (steeps 포함)
  - `PATCH /tea-sessions/:id` - 세션 수정 (미발행 시)
  - `POST /tea-sessions/:id/steeps` - 탕 추가
  - `PATCH /tea-sessions/:id/steeps/:steepId` - 탕 수정
  - `DELETE /tea-sessions/:id/steeps/:steepId` - 탕 삭제
  - `POST /tea-sessions/:id/publish` - 노트 발행

#### 1.4 노트 발행 로직

- `notesService.create()` 재사용 또는 내부 호출
- 세션의 모든 탕 정보를 종합하여 하나의 노트로 변환
  - `memo`: 탕별 기록 요약 (예: "1탕 30초, 2탕 45초..." + 미니 평가 요약)
  - `overallRating`, `axisValues`: 세션 전체 평가 또는 대표 탕 기준
- 발행 후 `tea_sessions.noteId` 업데이트

---

### Phase 2: 프론트엔드 - 세션 생성 및 탕 기록

#### 2.1 API 클라이언트

- `src/lib/api.ts`에 `teaSessionsApi` 추가
  - `create`, `getAll`, `getById`, `addSteep`, `updateSteep`, `deleteSteep`, `publish`

#### 2.2 라우팅 및 네비게이션

- `/session/new` - 새 세션 생성 (차 선택)
- `/session/:id` - 세션 진행 화면 (탕별 타이머 + 미니 기록)
- `/session/:id/summary` - 세션 요약
- `/sessions` - 세션 히스토리 목록
- `App.tsx`에 라우트 등록
- FAB 또는 내비게이션에 "다회 모드" 진입점 추가 (설정/홈 등)

#### 2.3 세션 생성 화면 (`SessionNew`)

- 차 선택 (기존 `NewNote`의 차 검색 UI 참고)
- "세션 시작" 버튼 → `/session/:id`로 이동

#### 2.4 세션 진행 화면 (`SessionInProgress`)

- **탕별 타이머**
  - 시작/일시정지/리셋
  - 경과 시간 표시 (초 단위)
  - 브라우저 백그라운드/포그라운드 전환 시 동작 고려 (예: `visibilitychange` 이벤트, 또는 Web Worker)
- **탕 추가**
  - "탕 완료" 시 현재 타이머 값을 steep duration으로 저장
  - 미니 기록 입력: 향, 맛, 색 (간단한 텍스트 또는 1~5 점수)
  - 탕별 메모 (선택)
- **탕 목록** 미리보기 (진행 중인 탕들)

#### 2.5 타이머 백그라운드 동작 (참고)

- `document.visibilityState` 활용: 탭 전환 시에도 `setInterval`/`requestAnimationFrame` 유지
- 필요 시 `SharedWorker` 또는 `Service Worker` 검토 (3단계에서 선택적)

---

### Phase 3: 세션 요약 및 노트 발행

#### 3.1 세션 요약 화면 (`SessionSummary`)

- 모든 탕의 기록 종합 표시
  - 탕 번호, 우림 시간, 향/맛/색, 메모
- "노트로 발행" 버튼
- 발행 전 수정: 전체 메모, 공개 여부, 평가 스키마 선택 등

#### 3.2 노트 발행 플로우

- `POST /tea-sessions/:id/publish` 호출
- 요청 본문: `schemaId`, `overallRating`, `axisValues`, `memo`, `isPublic` 등 (기존 `CreateNoteDto`와 유사)
- 성공 시 `/note/:id` 또는 `/my-notes`로 이동

---

### Phase 4: 세션 히스토리

#### 4.1 세션 목록 화면 (`SessionHistory`)

- `GET /tea-sessions` 호출
- 카드 형태: 차 이름, 세션 일시, 탕 수, 발행 여부
- 클릭 시 `/session/:id/summary` 또는 `/note/:id` (발행된 경우)

#### 4.2 필터/정렬

- 차별 필터, 기간 필터 (선택)
- 최신순 정렬 기본

---

### Phase 5: 통합 및 UX

#### 5.1 다회 모드 진입점

- 홈 또는 설정에 "다회 모드" 링크/버튼
- 또는 FAB 확장 메뉴 (새 노트 / 다회 세션)

#### 5.2 기존 노트와의 관계

- 세션에서 발행한 노트는 `notes` 테이블에 저장되며, 기존 노트 목록/상세에서 동일하게 표시
- 노트 상세에 "다회 세션에서 발행됨" 배지 또는 링크 (선택)

---

## 테스트 계획

### 프론트엔드

```bash
npm run test:run
```

- `SessionNew`, `SessionInProgress`, `SessionSummary`, `SessionHistory` 컴포넌트 단위 테스트
- `teaSessionsApi` 모킹하여 API 호출 검증
- 타이머 로직 단위 테스트 (경과 시간, 시작/정지)

### 백엔드

```bash
cd backend && npm run test
```

- `TeaSessionsService` 단위 테스트: 세션 CRUD, 탕 추가/수정/삭제, 노트 발행
- `TeaSessionsController` 단위 테스트: 인증, 권한, DTO 검증

### E2E

```bash
cd backend && npm run test:e2e
```

- `POST /tea-sessions` → `POST /tea-sessions/:id/steeps` → `POST /tea-sessions/:id/publish` 플로우
- 발행된 노트가 `GET /notes`에 포함되는지 검증

---

## 구현 순서 요약

| 순서 | 단계 | 산출물 |
|-----|------|--------|
| 1 | Phase 1.1 | 마이그레이션, 테이블 생성 |
| 2 | Phase 1.2 | 엔티티, DTO |
| 3 | Phase 1.3 | 서비스, 컨트롤러 |
| 4 | Phase 1.4 | 노트 발행 로직 |
| 5 | Phase 2.1 | API 클라이언트 |
| 6 | Phase 2.2 | 라우팅 |
| 7 | Phase 2.3 | 세션 생성 화면 |
| 8 | Phase 2.4 | 세션 진행 화면 (타이머 + 탕 기록) |
| 9 | Phase 3 | 세션 요약 및 노트 발행 |
| 10 | Phase 4 | 세션 히스토리 |
| 11 | Phase 5 | 진입점 및 UX 정리 |

---

## PR 체크리스트 (작업 완료 시)

- [ ] `npm run test:run` 통과 (프론트엔드)
- [ ] `cd backend && npm run test` 통과 (백엔드 단위)
- [ ] `cd backend && npm run test:e2e` 통과 (E2E)
- [ ] 수동 테스트: 세션 생성 → 탕 기록 → 요약 → 노트 발행
- [ ] PR 본문에 `Closes #39` 포함

---

## 참고

- 기존 노트 작성(`NewNote`)과 별도 플로우
- 타이머: 브라우저 포그라운드 기본 지원, 백그라운드 동작은 3단계에서 선택적 개선
- 우선순위: 3단계 - 헤비유저/차쟁이 전용
