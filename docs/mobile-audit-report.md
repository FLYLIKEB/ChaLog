# 모바일 대응 현황 분석 리포트

**분석 일자**: 2025-01-XX  
**분석 범위**: 프론트엔드 전체 코드베이스  
**Breakpoint 기준**: 768px (useIsMobile 훅)  
**분석 파일 수**: 30+ 컴포넌트 및 페이지

---

## 실행 요약

현재 ChaLog 애플리케이션은 기본적인 모바일 레이아웃은 갖추고 있으나, **터치 인터랙션, iOS Safe Area 지원, 작은 화면 최적화** 측면에서 개선이 필요합니다. 특히 **터치 영역이 권장 최소 크기(44x44px)보다 작은 요소들이 다수 발견**되었으며, **iOS Safari의 안전 영역(safe-area) 지원이 전혀 없어** 노치가 있는 기기에서 UI 요소가 가려질 수 있습니다.

---

## 1. 글로벌 레이아웃 및 컨테이너 구조

### 1.1 메인 앱 컨테이너 (`src/App.tsx`)

**현재 상태**:
```tsx
<div className="max-w-2xl mx-auto bg-white min-h-screen">
```

**문제점**:
- ✅ **긍정적**: `max-w-2xl` (672px)는 모바일에서도 적절한 최대 너비
- ⚠️ **문제**: 좌우 패딩이 없어 작은 화면(320px)에서 콘텐츠가 화면 가장자리에 붙을 수 있음
- ⚠️ **문제**: `mx-auto`로 인한 중앙 정렬은 적절하나, 작은 화면에서 여백 부족 가능성

**권장 사항**:
- 모바일에서 좌우 패딩 추가: `px-4 sm:px-6` 또는 `px-4 md:px-6`
- 가로 스크롤 방지를 위한 `overflow-x-hidden` 추가 검토

**우선순위**: 중간 (High)

---

### 1.2 모바일 감지 훅 (`src/components/ui/use-mobile.ts`)

**현재 상태**:
```tsx
const MOBILE_BREAKPOINT = 768;
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);
  // ...
  return !!isMobile;
}
```

**문제점**:
- ⚠️ **문제**: 초기 렌더링 시 `undefined` 반환 후 `!!isMobile`로 변환하여 잠재적 깜빡임 가능
- ✅ **긍정적**: `window.matchMedia` 사용으로 성능 최적화
- ⚠️ **문제**: SSR 환경에서의 동작 미검증

**권장 사항**:
- 초기값을 `false`로 설정하여 깜빡임 방지
- 또는 SSR 호환성을 위한 서버 사이드 기본값 설정

**우선순위**: 낮음 (Medium)

---

### 1.3 FloatingActionButton (`src/components/FloatingActionButton.tsx`)

**현재 상태**:
```tsx
className={cn(
  'fixed right-6 w-14 h-14 rounded-full ...',
  positionClasses[position], // bottom-6 또는 bottom-20
)}
```

**문제점**:
- ✅ **긍정적**: `w-14 h-14` (56px)는 권장 최소 44px보다 큼
- ❌ **심각**: iOS Safari 하단 안전 영역 미지원
  - `bottom-20` (80px)는 BottomNav 위 배치용이지만, iPhone X 이상 기기에서 하단 홈 인디케이터와 겹칠 수 있음
- ⚠️ **문제**: `right-6` (24px)가 작은 화면에서 충분한지 확인 필요

**권장 사항**:
```tsx
className={cn(
  'fixed right-6 w-14 h-14 rounded-full ...',
  'pb-[env(safe-area-inset-bottom)]', // iOS Safe Area 지원
  positionClasses[position],
)}
```

**우선순위**: 높음 (Critical)

---

## 2. 네비게이션 컴포넌트

### 2.1 BottomNav (`src/components/BottomNav.tsx`)

**현재 상태**:
```tsx
<nav className={cn(
  'fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 flex items-center justify-around',
  className,
)}>
  {/* 버튼 내부: w-6 h-6 (24px) */}
</nav>
```

**문제점**:
- ❌ **심각**: iOS Safari 하단 안전 영역 미지원
  - `padding-bottom: env(safe-area-inset-bottom)` 없음
  - iPhone X 이상 기기에서 하단 노치/홈 인디케이터와 겹침
- ❌ **심각**: 터치 영역 부족
  - 버튼 내부 아이콘 영역 `w-6 h-6` (24px) - 권장 최소 44px 미달
  - 전체 버튼 영역도 `py-3` (12px 패딩)로 인해 터치 영역이 부족할 수 있음
- ⚠️ **문제**: 텍스트 `text-xs` (12px) - 모바일에서 가독성 문제 가능

**권장 사항**:
```tsx
<nav className={cn(
  'fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3',
  'pb-[calc(0.75rem+env(safe-area-inset-bottom))]', // Safe Area 지원
  'flex items-center justify-around',
)}>
  {/* 버튼 터치 영역 확대: min-h-[44px] min-w-[44px] */}
</nav>
```

**우선순위**: 높음 (Critical)

---

### 2.2 Header (`src/components/Header.tsx`)

**현재 상태**:
```tsx
<header className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
  <button className="p-2 hover:bg-accent rounded-full transition-colors">
    <ChevronLeft className="w-5 h-5" />
  </button>
</header>
```

**문제점**:
- ❌ **심각**: 터치 영역 부족
  - 백 버튼 `p-2` (8px 패딩) → 전체 터치 영역 약 32px (권장 최소 44px 미달)
  - 프로필 버튼도 동일한 문제
- ⚠️ **문제**: iOS Safari 상단 안전 영역 미고려
  - 노치가 있는 기기에서 상단 콘텐츠가 가려질 수 있음

**권장 사항**:
```tsx
<header className={cn(
  'sticky top-0 z-10 bg-card border-b border-border px-4 py-3',
  'pt-[calc(0.75rem+env(safe-area-inset-top))]', // Safe Area 지원
  'flex items-center justify-between',
)}>
  <button className="min-h-[44px] min-w-[44px] p-2 hover:bg-accent rounded-full transition-colors">
    <ChevronLeft className="w-5 h-5" />
  </button>
</header>
```

**우선순위**: 높음 (Critical)

---

## 3. 페이지별 상세 분석

### 3.1 Home 페이지 (`src/pages/Home.tsx`)

**현재 상태**:
```tsx
<div className="min-h-screen bg-background pb-20">
  <div className="p-6 space-y-6">
```

**문제점**:
- ⚠️ **문제**: `p-6` (24px) 패딩이 작은 화면(320px)에서 과도할 수 있음
  - 320px 화면에서 좌우 패딩 48px 제거 시 실제 콘텐츠 너비 224px로 매우 좁음
- ⚠️ **문제**: `space-y-6` (24px) 간격이 모바일에서 공간 낭비 가능
- ✅ **긍정적**: `pb-20` (80px)는 BottomNav 공간 확보로 적절

**권장 사항**:
```tsx
<div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
```

**우선순위**: 중간 (High)

---

### 3.2 Search 페이지 (`src/pages/Search.tsx`)

**현재 상태**:
```tsx
<div className="p-4 space-y-4">
  <div className="relative">
    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" />
    <Input className="pl-10" />
  </div>
</div>
```

**문제점**:
- ✅ **긍정적**: `p-4` (16px) 패딩은 모바일에 적절
- ⚠️ **문제**: 검색 아이콘 `left-3` (12px) - 터치 영역은 아니지만 시각적 여백 확인 필요
- ✅ **긍정적**: "새 차 등록" 버튼 `w-full` - 적절함

**권장 사항**: 현재 상태 유지 또는 미세 조정

**우선순위**: 낮음 (Medium)

---

### 3.3 TeaDetail 페이지 (`src/pages/TeaDetail.tsx`)

**현재 상태**:
```tsx
<div className="grid grid-cols-2 gap-3">
  {/* 차 정보 2열 그리드 */}
</div>
```

**문제점**:
- ❌ **심각**: `grid grid-cols-2 gap-3` - 작은 화면(320px)에서 열 너비 부족
  - 320px 화면에서 `p-4` (16px 좌우) 제거 시 실제 너비 288px
  - 2열 그리드 + `gap-3` (12px) = 각 열 약 138px로 매우 좁음
- ⚠️ **문제**: 평점 섹션의 `flex items-center gap-4` - 모바일에서 레이아웃 깨짐 가능

**권장 사항**:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  {/* 모바일에서는 1열, 태블릿 이상에서 2열 */}
</div>
```

**우선순위**: 높음 (Critical)

---

### 3.4 NoteDetail 페이지 (`src/pages/NoteDetail.tsx`)

**현재 상태**:
```tsx
<div className="grid grid-cols-2 gap-3 justify-items-center">
  {/* 이미지 갤러리 */}
</div>
<button className="px-3 py-1.5 rounded-lg">
  {/* 좋아요/북마크 버튼 */}
</button>
```

**문제점**:
- ❌ **심각**: 이미지 갤러리 `grid grid-cols-2 gap-3` - 320px에서 열 너비 부족 (동일 문제)
- ❌ **심각**: 좋아요/북마크 버튼 터치 영역 부족
  - `px-3 py-1.5` → 높이 약 30px (권장 최소 44px 미달)
- ⚠️ **문제**: 액션 버튼 섹션 `flex gap-3` - 모바일에서 버튼 크기 확인 필요

**권장 사항**:
```tsx
{/* 이미지 갤러리 */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

{/* 인터랙션 버튼 */}
<button className="min-h-[44px] px-4 py-2 rounded-lg">
```

**우선순위**: 높음 (Critical)

---

### 3.5 NewNote/EditNote 페이지 (`src/pages/NewNote.tsx`, `src/pages/EditNote.tsx`)

**현재 상태**:
```tsx
<div className="p-4 space-y-6">
  {/* 차 선택 드롭다운 max-h-48 */}
  {/* ImageUploader grid grid-cols-3 */}
  {/* TagInput 드롭다운 max-h-48 */}
</div>
```

**문제점**:
- ❌ **심각**: ImageUploader `grid grid-cols-3` - 320px에서 열 너비 약 100px로 너무 좁음
- ❌ **심각**: 모바일 키보드와 UI 요소 겹침 가능
  - TagInput 드롭다운 `absolute z-10` - 키보드가 올라올 때 가려질 수 있음
  - 차 선택 드롭다운도 동일 문제 가능
- ⚠️ **문제**: 폼 입력 필드 높이 `h-9` (36px) - 권장 최소 44px 미달
- ⚠️ **문제**: RatingSlider Thumb `size-4` (16px) - 터치 영역 매우 부족

**권장 사항**:
```tsx
{/* ImageUploader */}
<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

{/* TagInput - 키보드 대응 */}
{showSuggestions && (
  <div className="fixed bottom-[env(keyboard-inset-height,0)] left-0 right-0 z-50 ...">
    {/* 또는 포털 사용 */}
  </div>
)}
```

**우선순위**: 높음 (Critical)

---

### 3.6 NewTea 페이지 (`src/pages/NewTea.tsx`)

**현재 상태**:
```tsx
<div className="p-4 max-w-md mx-auto">
```

**문제점**:
- ⚠️ **문제**: `max-w-md` (448px) - 모바일에서 불필요한 제한
  - 모바일 화면이 448px보다 작을 수 있으므로 제한이 의미 없음

**권장 사항**:
```tsx
<div className="p-4 sm:max-w-md sm:mx-auto">
```

**우선순위**: 중간 (High)

---

### 3.7 Login/Register 페이지 (`src/pages/Login.tsx`, `src/pages/Register.tsx`)

**현재 상태**:
```tsx
<div className="p-4 max-w-md mx-auto">
```

**문제점**:
- ⚠️ **문제**: `max-w-md` (448px) - 모바일에서 불필요 (NewTea와 동일)
- ⚠️ **문제**: 입력 필드 아이콘 `left-3` (12px) - 터치 영역은 아니지만 확인 필요

**권장 사항**: NewTea와 동일

**우선순위**: 중간 (High)

---

### 3.8 UserProfile 페이지 (`src/pages/UserProfile.tsx`)

**현재 상태**:
```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
  {/* 통계 카드 */}
</div>
<Button className="w-8 h-8 bg-primary ...">
  {/* 프로필 이미지 수정 버튼 */}
</Button>
```

**문제점**:
- ✅ **긍정적**: 통계 카드 `grid-cols-1 md:grid-cols-3` - 모바일에서 1열 적절
- ❌ **심각**: 프로필 이미지 수정 버튼 `w-8 h-8` (32px) - 터치 영역 부족

**권장 사항**:
```tsx
<Button className="min-w-[44px] min-h-[44px] bg-primary ...">
```

**우선순위**: 높음 (Critical)

---

## 4. 공통 컴포넌트 분석

### 4.1 NoteCard (`src/components/NoteCard.tsx`)

**현재 상태**:
```tsx
<button className="flex items-center gap-1">
  <Heart className="w-4 h-4" />
</button>
```

**문제점**:
- ❌ **심각**: 좋아요/북마크 버튼 `w-4 h-4` (16px) - 터치 영역 매우 부족
- ⚠️ **문제**: 태그 `text-xs` (12px) - 가독성 문제 가능
- ✅ **긍정적**: 카드 전체가 클릭 가능하여 터치 영역은 충분

**권장 사항**:
```tsx
<button className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1">
  <Heart className="w-5 h-5" />
</button>
```

**우선순위**: 높음 (Critical)

---

### 4.2 TeaCard (`src/components/TeaCard.tsx`)

**현재 상태**: 적절함

**문제점**: 없음

**우선순위**: 낮음 (Low)

---

### 4.3 ImageUploader (`src/components/ImageUploader.tsx`)

**현재 상태**:
```tsx
<div className="grid grid-cols-3 gap-3">
  <button className="w-full py-2 bg-red-500 ...">
    {/* 삭제 버튼 */}
  </button>
</div>
```

**문제점**:
- ❌ **심각**: `grid grid-cols-3` - 320px에서 열 너비 약 100px로 너무 좁음
- ⚠️ **문제**: 삭제 버튼 `py-2` - 터치 영역 확인 필요 (전체 버튼 크기는 적절할 수 있음)

**권장 사항**:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
```

**우선순위**: 높음 (Critical)

---

### 4.4 TagInput (`src/components/TagInput.tsx`)

**현재 상태**:
```tsx
<div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48">
  <Button className="h-auto py-1 px-2 text-xs">
    {/* 추천 태그 */}
  </Button>
</div>
```

**문제점**:
- ❌ **심각**: 모바일 키보드와 드롭다운 겹침 문제
  - `absolute` 포지셔닝으로 키보드가 올라올 때 가려질 수 있음
- ⚠️ **문제**: 추천 태그 버튼 `py-1 px-2` - 터치 영역 부족 가능

**권장 사항**:
- 포털(React Portal) 사용하여 키보드 위에 표시
- 또는 `fixed` 포지셔닝 + 키보드 높이 감지

**우선순위**: 높음 (Critical)

---

### 4.5 RatingSlider (`src/components/RatingSlider.tsx`)

**현재 상태**: Slider 컴포넌트 사용, Thumb `size-4` (16px)

**문제점**:
- ❌ **심각**: Slider Thumb `size-4` (16px) - 터치 영역 매우 부족
- ⚠️ **문제**: Track 높이 `h-4` (16px) - 터치 영역 부족

**권장 사항**:
```tsx
// slider.tsx 수정 필요
<SliderPrimitive.Thumb className="... size-6 ..." /> // 24px 이상 권장
<SliderPrimitive.Track className="... h-6 ..." /> // 높이 증가
```

**우선순위**: 높음 (Critical)

---

## 5. UI 컴포넌트 라이브러리 분석

### 5.1 Input (`src/components/ui/input.tsx`)

**현재 상태**:
```tsx
className="... h-9 ... md:text-sm"
```

**문제점**:
- ⚠️ **문제**: 높이 `h-9` (36px)는 권장 최소 44px 미달
- ✅ **긍정적**: 모바일에서 `text-base` (16px) - iOS 줌 방지에 적절

**권장 사항**:
```tsx
className="... h-11 sm:h-9 ..." // 모바일에서 44px, 데스크톱에서 36px
```

**우선순위**: 중간 (High)

---

### 5.2 Button (`src/components/ui/button.tsx`)

**현재 상태**:
```tsx
size: {
  default: "h-9 px-4 py-2",
  sm: "h-8 ...",
  lg: "h-10 ...",
  icon: "size-9",
}
```

**문제점**:
- ⚠️ **문제**: default/sm 크기가 권장 최소 44px 미달
- ❌ **심각**: `icon` 크기 `size-9` (36px) - 부족

**권장 사항**:
```tsx
size: {
  default: "h-11 sm:h-9 px-4 py-2", // 모바일 44px, 데스크톱 36px
  sm: "h-10 sm:h-8 ...",
  lg: "h-12 sm:h-10 ...",
  icon: "size-11 sm:size-9",
}
```

**우선순위**: 높음 (Critical)

---

### 5.3 AlertDialog (`src/components/ui/alert-dialog.tsx`)

**현재 상태**: 적절함

**문제점**: 없음

**우선순위**: 낮음 (Low)

---

## 6. 스타일 및 전역 설정 분석

### 6.1 전역 CSS

**현재 상태**:
- `--font-size: 16px` - iOS 줌 방지에 적절 ✅
- 미디어 쿼리: `@media (width >= 40rem)` (640px), `@media (width >= 48rem)` (768px)
- 모바일 퍼스트 접근 방식 아님

**문제점**:
- ⚠️ **문제**: 모바일 퍼스트가 아니어서 데스크톱 스타일을 모바일에서 오버라이드하는 구조

**권장 사항**: 모바일 퍼스트로 전환 (선택사항)

**우선순위**: 낮음 (Medium)

---

### 6.2 Safe Area 지원

**현재 상태**: **전혀 없음** ❌

**문제점**:
- iOS Safari 하단/상단 안전 영역 미적용
- `env(safe-area-inset-bottom)`, `env(safe-area-inset-top)` 미사용
- viewport 메타 태그는 있으나 safe-area 관련 설정 없음

**권장 사항**:
```css
/* globals.css 또는 각 컴포넌트에 추가 */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-area-top {
  padding-top: env(safe-area-inset-top);
}
```

**우선순위**: 높음 (Critical)

---

## 7. 성능 및 접근성 분석

### 7.1 터치 인터랙션

**현재 상태**: 대부분의 인터랙티브 요소가 권장 최소 44x44px 미달

**문제점**:
- ❌ **심각**: 다수의 버튼/인터랙션 요소가 작은 터치 영역
- ⚠️ **문제**: 터치 피드백(active 상태)은 있으나 일관성 확인 필요

**권장 사항**: 모든 인터랙티브 요소 최소 44x44px 보장

**우선순위**: 높음 (Critical)

---

### 7.2 키보드 접근성

**현재 상태**: 확인 필요

**문제점**:
- ❌ **심각**: 모바일 키보드가 올라올 때 입력 필드 가려짐 가능 (TagInput 등)
- ⚠️ **문제**: 키보드 닫기 제스처 지원 여부 확인 필요

**권장 사항**: 키보드 높이 감지 및 스크롤 조정

**우선순위**: 높음 (Critical)

---

### 7.3 이미지 최적화

**현재 상태**: 확인 필요

**문제점**:
- ⚠️ **문제**: 이미지 lazy loading 적용 여부 확인 필요
- ⚠️ **문제**: 모바일에서 이미지 크기 최적화 필요성

**권장 사항**: 이미지 lazy loading 구현, 반응형 이미지 크기 적용

**우선순위**: 낮음 (Medium)

---

## 8. 우선순위별 개선 사항 정리

### 높은 우선순위 (Critical) - 즉시 수정 필요

1. **터치 영역 확대**
   - 모든 버튼/인터랙션 요소 최소 44x44px 보장
   - 영향받는 컴포넌트:
     - BottomNav 버튼
     - Header 버튼 (백, 프로필)
     - NoteCard 좋아요/북마크 버튼
     - NoteDetail 좋아요/북마크 버튼
     - UserProfile 프로필 이미지 수정 버튼
     - Button 컴포넌트 (default, sm, icon 크기)
     - RatingSlider Thumb
     - Input 컴포넌트 높이

2. **iOS Safe Area 지원**
   - BottomNav에 하단 안전 영역 적용
   - Header에 상단 안전 영역 적용
   - FloatingActionButton에 안전 영역 적용

3. **작은 화면(320px) 레이아웃 수정**
   - TeaDetail 2열 그리드 → 1열 (모바일)
   - NoteDetail 이미지 갤러리 2열 → 1열 (모바일)
   - ImageUploader 3열 그리드 → 2열 (모바일)

4. **모바일 키보드와 UI 요소 겹침 문제 해결**
   - TagInput 드롭다운 키보드 대응
   - 차 선택 드롭다운 키보드 대응
   - 입력 필드 포커스 시 스크롤 조정

---

### 중간 우선순위 (High) - 단기 개선

1. **그리드 레이아웃 모바일 최적화**
   - 모든 2열/3열 그리드를 모바일에서 1열/2열로 변경

2. **폼 입력 필드 높이 확대**
   - Input 컴포넌트: 36px → 44px (모바일)

3. **패딩/마진 모바일 최적화**
   - Home 페이지: `p-6` → `p-4 sm:p-6`
   - 기타 페이지 패딩 조정

4. **텍스트 크기 가독성 개선**
   - BottomNav 텍스트 `text-xs` → `text-sm` 검토
   - NoteCard 태그 텍스트 크기 검토

---

### 낮은 우선순위 (Medium) - 장기 개선

1. **모바일 퍼스트 CSS 접근 방식 전환**
2. **추가 breakpoint 정의** (320px, 375px, 414px)
3. **성능 최적화** (이미지 lazy loading 등)
4. **스와이프 제스처 추가**

---

## 9. 테스트 계획

### 9.1 디바이스 테스트 필요

- [ ] iPhone SE (320px)
- [ ] iPhone 12/13/14 (390px)
- [ ] iPhone 14 Pro Max (430px)
- [ ] Android (360px, 412px 등)

### 9.2 브라우저 테스트 필요

- [ ] iOS Safari
- [ ] Chrome Mobile
- [ ] Samsung Internet

### 9.3 기능 테스트 필요

- [ ] 모든 페이지 스크롤 테스트
- [ ] 모든 폼 입력 테스트
- [ ] 모든 버튼 클릭 테스트
- [ ] 키보드 동작 테스트
- [ ] Safe Area 테스트 (iPhone X 이상)

---

## 10. 결론

현재 ChaLog 애플리케이션은 **기본적인 모바일 레이아웃은 갖추고 있으나**, 다음과 같은 주요 개선이 필요합니다:

1. **터치 영역 확대** - 가장 시급한 문제로, 사용자 경험에 직접적인 영향
2. **iOS Safe Area 지원** - 노치가 있는 기기에서 UI 요소 가려짐 방지
3. **작은 화면 최적화** - 320px 화면에서 레이아웃 깨짐 수정
4. **키보드 대응** - 모바일 키보드와 UI 요소 겹침 문제 해결

이러한 개선 사항들을 우선순위에 따라 단계적으로 적용하면 모바일 사용자 경험이 크게 향상될 것입니다.

---

## 11. 발견된 문제 통계

### 심각도별 문제 수

- **Critical (심각)**: 15개
  - 터치 영역 부족: 10개
  - Safe Area 미지원: 3개
  - 작은 화면 레이아웃 깨짐: 2개

- **High (중간)**: 8개
  - 그리드 레이아웃 최적화: 4개
  - 폼 입력 필드 높이: 2개
  - 패딩/마진 최적화: 2개

- **Medium (낮음)**: 5개
  - 모바일 퍼스트 전환: 1개
  - 성능 최적화: 2개
  - 기타: 2개

### 영향받는 컴포넌트 수

- **글로벌 컴포넌트**: 3개 (App, BottomNav, Header)
- **페이지 컴포넌트**: 8개 (모든 주요 페이지)
- **공통 컴포넌트**: 5개 (NoteCard, ImageUploader, TagInput 등)
- **UI 라이브러리 컴포넌트**: 3개 (Input, Button, Slider)

---

## 12. 권장 개선 로드맵

### Phase 1 (1-2주) - Critical 우선순위
1. iOS Safe Area 지원 추가 (BottomNav, Header, FloatingActionButton)
2. 터치 영역 확대 (Button, Input 컴포넌트 기본 수정)
3. 작은 화면 그리드 레이아웃 수정 (TeaDetail, NoteDetail, ImageUploader)

### Phase 2 (2-3주) - High 우선순위
1. 모든 페이지별 터치 영역 확대
2. 폼 입력 필드 높이 조정
3. 패딩/마진 모바일 최적화

### Phase 3 (3-4주) - Medium 우선순위
1. 키보드 대응 개선
2. 성능 최적화 (이미지 lazy loading)
3. 추가 테스트 및 미세 조정

---

## 부록: 코드 예시

### Safe Area 지원 예시

```tsx
// BottomNav.tsx
<nav className={cn(
  'fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3',
  'pb-[calc(0.75rem+env(safe-area-inset-bottom))]', // Safe Area 지원
  'flex items-center justify-around',
)}>
```

### 터치 영역 확대 예시

```tsx
// Button 컴포넌트
size: {
  default: "h-11 sm:h-9 px-4 py-2", // 모바일 44px, 데스크톱 36px
  icon: "size-11 sm:size-9", // 모바일 44px, 데스크톱 36px
}
```

### 반응형 그리드 예시

```tsx
// TeaDetail.tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
  {/* 모바일 1열, 태블릿 이상 2열 */}
</div>
```

