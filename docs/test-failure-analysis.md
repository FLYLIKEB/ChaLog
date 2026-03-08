# 테스트 실패 분석 (해결 완료)

## 요약

모든 테스트가 통과합니다 (24 파일, 189 passed, 1 skipped).

### 적용한 수정 사항

1. **setup.ts**: 전역 fetch mock 추가 - localhost/api 요청 시 404 반환 (ECONNREFUSED 방지)
2. **api.ts**: ApiError(plain object) 재throw 처리 추가
3. **api.upload.test.ts**: `global.fetch = vi.fn()` → `vi.spyOn(globalThis, 'fetch')` 로 변경
4. **UserProfile.test.tsx, Cellar.test.tsx**: Header의 `notificationsApi.getUnreadCount` mock 추가

### 이전 이슈 (참고용)

| 파일 | 실패 테스트 | 원인 |
|------|------------|------|
| Home.test.tsx | 1 | API mock 누락 |
| Saved.test.tsx | 2 | 텍스트 불일치 / mock |
| Search.test.tsx | 1 | API mock 또는 타이밍 |
| ShopDetail.test.tsx | 2 | API mock 누락 |
| UserProfile.test.tsx | 1 | 에러 처리 검증 |
| (병렬 실행 시) | - | ECONNREFUSED - NoteDetail 등에서 실제 fetch 호출 |

---

## 1. Home.test.tsx

**실패**: `오늘의 차 카드와 공개 차록을 렌더링한다` (타임아웃 5000ms)

**원인**: API mock 불완전
- Home은 `teasApi.getTrending('7d')`, `usersApi.getTrending('7d')` 호출
- 현재 mock: `teasApi.getAll`, `notesApi.getAll`만 존재
- `teasApi.getTrending is not a function` 에러 발생 → API 실패 → 로딩 무한 대기 → 타임아웃

**해결**: mock에 `teasApi.getTrending`, `usersApi.getTrending` 추가

```ts
vi.mock('../../lib/api', () => ({
  teasApi: {
    getAll: vi.fn(() => Promise.resolve(mockTeas)),
    getTrending: vi.fn(() => Promise.resolve(mockTeas)),
  },
  notesApi: {
    getAll: vi.fn(() => Promise.resolve(mockNotes.filter(note => note.isPublic))),
  },
  usersApi: {
    getTrending: vi.fn(() => Promise.resolve([])),
  },
}));
```

---

## 2. Saved.test.tsx

**실패**: `북마크한 차록 리스트를 표시한다`, `빈 상태 메시지를 표시한다`

**원인**: 
- UI 텍스트 변경: 실제는 `📌 저장한 차록`, 테스트는 `저장한 차록` 검색
- 또는 mock이 `notesApi.getAll(undefined, undefined, undefined, true)` 시그니처와 맞지 않음

**해결**: 
- `getByText(/저장한 차록/)` 또는 `getByText('📌 저장한 차록', { exact: false })` 사용
- mock이 `getAll(undefined, undefined, undefined, true)` 호출에 응답하는지 확인

---

## 3. Search.test.tsx

**실패**: `사색 섹션(인기, 신규, 차선, 찻집)을 렌더링한다`

**원인**: 
- Search는 `teasApi.getPopularRankings`, `getNewRankings`, `getCuration`, `getSellers` 호출
- mock에는 해당 메서드들이 있으나, 실제 호출 시그니처나 반환 형식 불일치 가능
- 또는 `getSellers()` 반환값이 `{ sellers: Seller[] }` 형태인지 확인 필요

---

## 4. ShopDetail.test.tsx

**실패**: `찻집명과 차 개수를 표시한다`, `해당 seller의 차 목록을 렌더링한다`

**원인**: API mock 누락
- ShopDetail은 `teasApi.getBySeller(name)`과 `teasApi.getSellerByName(name)` 둘 다 호출
- 현재 mock: `getBySeller`만 있음, `getSellerByName` 없음
- `teasApi.getSellerByName is not a function` → Promise.all 실패 → teas가 빈 배열 → 테스트 실패

**해결**: mock에 `getSellerByName` 추가

```ts
vi.mock('../../lib/api', () => ({
  teasApi: {
    getBySeller: vi.fn((name: string) => { ... }),
    getSellerByName: vi.fn(() => Promise.resolve(null)),
  },
}));
```

---

## 5. UserProfile.test.tsx

**실패**: `사용자를 불러오는데 실패하면 에러 메시지를 표시해야 함`

**원인**: 
- `usersApi.getById`를 reject하도록 mock했을 때, 에러 UI/토스트 검증 방식이 실제 구현과 맞지 않을 수 있음
- 또는 에러 바운더리/조건부 렌더링으로 인해 예상한 요소가 렌더되지 않음

---

## 6. ECONNREFUSED (병렬 실행 시)

**원인**: 
- `NoteDetail.test.tsx` 등에서 `importActual`로 부분 mock 사용
- `notesApi`만 mock하고 `teasApi`는 실제 구현 사용 → `teasApi.getById`가 실제 fetch 호출
- 테스트 환경에 서버(localhost:3000)가 없어 `ECONNREFUSED` 발생

**해결**: 
- NoteDetail은 `teasApi.getById`도 mock
- 또는 테스트용으로 `global.fetch` mock하여 네트워크 호출 차단

---

## API Base URL (참고)

- `vite.config.ts` proxy: `/api` → `http://localhost:3000`
- 테스트(jsdom)에서 `origin`은 `http://localhost:3000`
- 상대 URL `/api/...` → `http://localhost:3000/api/...`로 해석
- 서버가 없으면 `ECONNREFUSED`
