# ChaLog Architecture Deep Dive

ChaLog App Structure용 코드 번들입니다. 원본 프로젝트는 https://www.figma.com/design/yCBAKnVYnhz2ZDj7ECRLe9/ChaLog-App-Structure 에서 확인할 수 있습니다.

## 전체 구조
- Vite+React 18 SPA로 `src/main.tsx` → `src/App.tsx` 경로를 통해 부트스트랩합니다. `BrowserRouter`와 라우트 테이블, 글로벌 FAB, `sonner` 알림이 최상위에 묶여 있어 모든 화면이 동일한 쉘(`max-w-2xl` 모바일 뷰)에 렌더링됩니다.  
```53:71:src/App.tsx
export default function App() {
  return (
    <BrowserRouter>
      <div className="max-w-2xl mx-auto bg-white min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/preview_page.html" element={<Navigate to="/" replace />} />
          <Route path="/search" element={<Search />} />
          <Route path="/tea/:id" element={<TeaDetail />} />
          <Route path="/note/new" element={<NewNote />} />
          <Route path="/note/:id" element={<NoteDetail />} />
          <Route path="/my-notes" element={<MyNotes />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <FloatingActionButtonSwitcher />
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
```
- 라우트별 FAB 동작은 스위처가 제어합니다. 기본적으로 “새 노트 작성”으로 이동하고, 향후 경로별 숨김·위치 오버라이드를 쉽게 덮어쓰도록 설계했습니다.  
```20:48:src/App.tsx
const floatingActionRouteOverrides: Record<string, FloatingActionRouteConfig> = {
  '/my-notes': { position: 'aboveNav' },
};

function FloatingActionButtonSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const override = floatingActionRouteOverrides[location.pathname];
  const config = {
    ...DEFAULT_FLOATING_ACTION_CONFIG,
    ...override,
  };

  if (config.hidden) {
    return null;
  }

  return (
    <FloatingActionButton
      onClick={() => navigate('/note/new')}
      ariaLabel={config.ariaLabel}
      position={config.position}
    >
      <Plus className="w-6 h-6" />
    </FloatingActionButton>
  );
}
```

## 주요 화면
- **홈(`src/pages/Home.tsx`)**: mock 데이터에서 랜덤 “오늘의 차”와 공개 노트 피드를 뿌리고, 하단 고정 내비게이션으로 홈/검색/내 노트를 이동합니다.  
```12:66:src/pages/Home.tsx
  const todayTea = mockTeas[Math.floor(Math.random() * mockTeas.length)];
  const publicNotes = mockNotes.filter(note => note.isPublic);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header showProfile />

      <div className="p-4 space-y-6">
        <section>
          <h2 className="mb-3">오늘의 차</h2>
          <TeaCard tea={todayTea} />
        </section>

        <section>
          <h2 className="mb-3">공개 노트</h2>
          {publicNotes.length > 0 ? (
            <div className="space-y-3">
              {publicNotes.map(note => (
                <NoteCard key={note.id} note={note} showTeaName />
              ))}
            </div>
          ) : (
            <EmptyState type="feed" message="아직 등록된 노트가 없습니다." />
          )}
        </section>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex items-center justify-around">
        <button onClick={() => navigate('/')} className="flex flex-col items-center gap-1 text-emerald-600">
          <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center" />
          <span className="text-xs">홈</span>
        </button>
        <button onClick={() => navigate('/search')} className="flex flex-col items-center gap-1 text-gray-500">
          <div className="w-6 h-6" />
          <span className="text-xs">검색</span>
        </button>
        <button onClick={() => navigate('/my-notes')} className="flex flex-col items-center gap-1 text-gray-500">
          <div className="w-6 h-6" />
          <span className="text-xs">내 노트</span>
        </button>
      </nav>
    </div>
```
- **검색(`src/pages/Search.tsx`)**: `mockTeas` 기반 자동완성·검색 결과·로딩 상태를 단일 화면에서 관리합니다. 검색어가 없으면 `EmptyState` 안내가 뜨고, 입력 중에는 상단 추천 리스트 → 결과 영역 순으로 조건부 렌더링합니다.
- **차 상세(`src/pages/TeaDetail.tsx`)**: URL 파라미터로 차를 찾아 기본 정보, 평균 평점/태그, 공개 노트 목록, “이 차로 노트 작성” CTA를 표시합니다. 데이터가 없으면 서버 오류용 `EmptyState`를 노출합니다.
- **새 노트(`src/pages/NewNote.tsx`)**: 차 검색·선택, 다섯 가지 평점 슬라이더, 메모, 공개 스위치, 기본 검증/토스트 처리까지 포함된 기록 작성 폼입니다.  
```46:112:src/pages/NewNote.tsx
  const handleSave = () => {
    if (!selectedTea) {
      toast.error('차를 선택해주세요.');
      return;
    }
    if (!memo.trim()) {
      toast.error('메모를 작성해주세요.');
      return;
    }

    toast.success('기록이 저장되었습니다.');
    setTimeout(() => navigate('/my-notes'), 500);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <Header showBack title="새 노트 작성" />
      
      <div className="p-4 space-y-6">
        <section className="bg-white rounded-lg p-4">
          <Label className="mb-2 block">차 선택</Label>
          <Input
            type="text"
            placeholder="차 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedTea('');
            }}
          />
          
          {searchQuery && !selectedTea && filteredTeas.length > 0 && (
            <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
              {filteredTeas.map(tea => (
                <button
                  key={tea.id}
                  onClick={() => {
                    setSelectedTea(tea.id);
                    setSearchQuery(tea.name);
                  }}
                  className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm">{tea.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {tea.type} · {tea.seller}
                  </p>
                </button>
              ))}
            </div>
          )}

          {selectedTeaData && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-emerald-900">{selectedTeaData.name}</span>
              </div>
              <div className="text-xs text-emerald-700 space-y-1">
                {selectedTeaData.year && <p>연도: {selectedTeaData.year}년</p>}
                <p>종류: {selectedTeaData.type}</p>
                {selectedTeaData.seller && <p>구매처: {selectedTeaData.seller}</p>}
              </div>
            </div>
          )}
```
- **노트 상세(`src/pages/NoteDetail.tsx`)**: 노트·차 결합 데이터를 보여주고 공개/비공개 토글, 삭제 다이얼로그, `RatingVisualization` 그래프를 제공합니다.  
```26:133:src/pages/NoteDetail.tsx
  const note = mockNotes.find(n => n.id === id);
  const tea = note ? mockTeas.find(t => t.id === note.teaId) : null;
  const isMyNote = note?.userId === currentUser.id;
...
        <section className="bg-white rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
              <span className="text-2xl">{note.rating.toFixed(1)}</span>
            </div>
            <Badge variant={note.isPublic ? 'default' : 'secondary'}>
              {note.isPublic ? (
                <><Globe className="w-3 h-3 mr-1" /> 공개</>
              ) : (
                <><Lock className="w-3 h-3 mr-1" /> 비공개</>
              )}
            </Badge>
          </div>
...
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className="px-4"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
...
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          ...
        </AlertDialogContent>
      </AlertDialog>
```
- **내 노트(`src/pages/MyNotes.tsx`)**: 탭+드롭다운 조합으로 공개/비공개/전체 필터와 최신순/별점순 정렬을 적용합니다.  
```20:69:src/pages/MyNotes.tsx
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('latest');

  let myNotes = mockNotes.filter(note => note.userId === currentUser.id);

  if (filter === 'public') {
    myNotes = myNotes.filter(note => note.isPublic);
  } else if (filter === 'private') {
    myNotes = myNotes.filter(note => !note.isPublic);
  }

  myNotes = [...myNotes].sort((a, b) => {
    if (sort === 'latest') {
      return b.createdAt.getTime() - a.createdAt.getTime();
    } else {
      return b.rating - a.rating;
    }
  });
```
- **설정(`src/pages/Settings.tsx`)**: 현재 사용자 프로필, 약관 버튼, 로그아웃 토스트만 있는 정적 페이지로 확장 여지를 남겨둡니다.

## 재사용 컴포넌트 · 상태
- FAB는 위치 프리셋(`default`/`aboveNav`)과 접근성 속성을 추상화한 독립 컴포넌트입니다.  
```17:36:src/components/FloatingActionButton.tsx
export function FloatingActionButton({
  onClick,
  ariaLabel = '새 항목 추가',
  className,
  position = 'default',
  children,
}: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'fixed right-6 w-14 h-14 rounded-full bg-emerald-600 text-white shadow-lg flex items-center justify-center transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
        positionClasses[position],
        className
      )}
    >
      {children}
    </button>
  );
}
```
- `Header`, `NoteCard`, `TeaCard`, `EmptyState`, `RatingSlider`, `RatingVisualization` 등이 모든 페이지에 공통 스타일을 제공하며, 대부분 `lucide-react` 아이콘과 `shadcn/ui` 래퍼(`src/components/ui/*`)를 활용합니다.
- `mockData`는 현재 사용자를 포함해 차·노트 데이터를 in-memory로 제공하는 단일 소스이며 모든 화면이 이를 참조합니다.  
```3:152:src/lib/mockData.ts
export const currentUser: User = {
  id: 'user-1',
  name: '김차인',
  email: 'tea@example.com',
};

export const mockTeas: Tea[] = [
  {
    id: 'tea-1',
    name: '정산소종',
    year: 2023,
    type: '홍차',
    seller: '차향',
    origin: '중국 푸젠',
    averageRating: 4.5,
    reviewCount: 12,
  },
  ...
];

export const mockNotes: Note[] = [
  {
    id: 'note-1',
    teaId: 'tea-1',
    teaName: '정산소종',
    userId: 'user-1',
    userName: '김차인',
    rating: 4.5,
    ratings: {
      richness: 4,
      strength: 3,
      smoothness: 5,
      clarity: 4,
      complexity: 4,
    },
    memo: '은은한 훈향이 매력적입니다. 부드러운 목넘김과 긴 여운이 좋았어요.',
    isPublic: true,
    createdAt: new Date('2024-11-10'),
  },
  ...
];
```
- Tailwind 유틸 결합을 위해 `cn` 헬퍼를 두고 있습니다.  
```1:6:src/components/ui/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Supabase · 외부 연동
- `src/supabase/functions/server`는 Hono 기반 Deno Edge 함수로 CORS/로깅/헬스체크를 제공합니다. 앱 본체에서 아직 호출하지는 않지만, `npm:@supabase/supabase-js`를 이용한 KV 스토리지 CRUD가 준비돼 있습니다.  
```1:35:src/supabase/functions/server/index.tsx
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();
app.use('*', logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);
app.get("/make-server-860b2c16/health", (c) => c.json({ status: "ok" }));
if (typeof Deno !== "undefined") {
  Deno.serve(app.fetch);
}
```
```28:95:src/supabase/functions/server/kv_store.tsx
export const set = async (key: string, value: any): Promise<void> => {
  const supabase = client()
  const { error } = await supabase.from("kv_store_860b2c16").upsert({
    key,
    value
  });
  if (error) {
    throw new Error(error.message);
  }
};
...
export const getByPrefix = async (prefix: string): Promise<any[]> => {
  const supabase = client()
  const { data, error } = await supabase.from("kv_store_860b2c16").select("key, value").like("key", prefix + "%");
  if (error) {
    throw new Error(error.message);
  }
  return data?.map((d) => d.value) ?? [];
};
```
- `src/utils/supabase/info.tsx`에는 프로젝트 ID와 공개 키가 하드코딩돼 있어 클라이언트 초기화 시 사용할 수 있습니다.

## 스타일 · 빌드
- `src/styles/globals.css`와 거대한 `src/index.css`는 Tailwind v4 피처(`@theme inline`, design tokens, 다크 모드 variants`)를 정의해 전역 타이포그래피/컬러 시스템을 통일합니다.  
```3:78:src/styles/globals.css
:root {
  --font-size: 16px;
  --background: #ffffff;
  --foreground: oklch(0.145 0 0);
  --card: #ffffff;
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: #030213;
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.95 0.0058 264.53);
  --secondary-foreground: #030213;
  --muted: #ececf0;
  --muted-foreground: #717182;
  --accent: #e9ebef;
  --accent-foreground: #030213;
  --destructive: #d4183d;
  --destructive-foreground: #ffffff;
  --border: rgba(0, 0, 0, 0.1);
  --input: transparent;
  --input-background: #f3f3f5;
  --switch-background: #cbced4;
  --font-weight-medium: 500;
  --font-weight-normal: 400;
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: #030213;
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}
```
- `build/`에는 `vite build` 결과물이 들어 있어 배포 시 그대로 활용 가능하며, 루트 `README.md`는 `npm i`, `npm run dev`만 안내합니다.

이 구조를 기반으로 실제 API 연동(예: Supabase)이나 상태 관리, 인증 등을 추가하면 곧바로 프로덕션 수준으로 확장할 수 있습니다.

## 실행 방법

`npm i` 명령으로 의존성을 설치하세요.

`npm run dev` 명령으로 개발 서버를 실행하세요.

