import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Bell, Package, FileText, Trash2, ChevronUp, ChevronDown, Pencil, CheckCircle2, Coffee, ChevronRight, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { Button } from '../components/ui/button';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { cellarApi } from '../lib/api';
import { CellarItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { CellarCardSkeleton } from '../components/CellarCardSkeleton';
import { logger } from '../lib/logger';
import { TEA_TYPES, TEA_TYPE_COLORS } from '../constants';
import { TeaTypeBadge } from '../components/TeaTypeBadge';
import { cn } from '../components/ui/utils';
import { InfiniteScrollSentinel } from '../components/InfiniteScrollSentinel';

const UNIT_LABELS: Record<string, string> = {
  g: 'g',
  ml: 'ml',
  bag: '개',
  cake: '병',
};

type SortKey = 'createdAt' | 'quantity' | 'remindAt' | 'openedAt' | 'name';
type SortDir = 'asc' | 'desc';

const SORT_OPTIONS: { key: SortKey; label: string; defaultDir: SortDir }[] = [
  { key: 'createdAt', label: '추가일', defaultDir: 'desc' },
  { key: 'quantity', label: '잔량', defaultDir: 'desc' },
  { key: 'remindAt', label: '리마인더', defaultDir: 'asc' },
  { key: 'openedAt', label: '개봉일', defaultDir: 'desc' },
  { key: 'name', label: '이름', defaultDir: 'asc' },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function CellarCard({
  item,
  onDelete,
  onEdit,
  onNoteClick,
  onSessionClick,
}: {
  item: CellarItem;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  onNoteClick: (teaId: number) => void;
  onSessionClick: (teaId: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`"${item.tea.name}" 찻장 아이템을 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      await cellarApi.remove(item.id);
      onDelete(item.id);
      toast.success('찻장 아이템이 삭제되었습니다.');
    } catch (error) {
      logger.error('Failed to delete cellar item:', error);
      toast.error('삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const tea = item.tea;
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="truncate font-medium text-base text-foreground">{tea.name}</h3>
            {tea.type && <TeaTypeBadge type={tea.type} className="shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {Number(item.quantity)}{UNIT_LABELS[item.unit] ?? item.unit}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 truncate whitespace-nowrap">
            <span className={!tea.year ? 'text-muted-foreground/50' : undefined}>
              {tea.year ? `${tea.year}년` : '연도미상'}
            </span>
            {' · '}
            <span className={!(tea.price != null && tea.price > 0) ? 'text-muted-foreground/50' : undefined}>
              {tea.price != null && tea.price > 0 ? `${tea.price.toLocaleString()}원` : '가격미상'}
            </span>
            {' · '}
            <span className={!(tea.weight != null && tea.weight > 0) ? 'text-muted-foreground/50' : undefined}>
              {tea.weight != null && tea.weight > 0 ? `${tea.weight}g` : '용량미상'}
            </span>
          </p>
          {tea.seller && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate whitespace-nowrap">
              <Link
                to={`/teahouse/${encodeURIComponent(tea.seller)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-primary hover:underline"
              >
                {tea.seller}
              </Link>
            </p>
          )}
          {!tea.seller && (
            <p className="text-xs text-muted-foreground/50 mt-0.5">판매처 미상</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(item.id)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="수정"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
            aria-label="삭제"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {item.openedAt && (
        <p className="text-xs text-muted-foreground">
          개봉일: {formatDate(item.openedAt)}
        </p>
      )}

      {item.memo && (
        <p className="text-sm text-foreground/80 line-clamp-2">{item.memo}</p>
      )}

      <div className="flex gap-0 pt-1 overflow-hidden rounded-lg border border-border">
        <button
          type="button"
          onClick={() => onNoteClick(item.teaId)}
          className="flex-1 flex items-center justify-center gap-1 py-2 px-2 text-xs font-medium border-r border-border bg-background hover:bg-muted/50 transition-colors"
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">차록</span>
        </button>
        <button
          type="button"
          onClick={() => onSessionClick(item.teaId)}
          className="flex-1 flex items-center justify-center gap-1 py-2 px-2 text-xs font-medium bg-background hover:bg-muted/50 transition-colors"
          title="다회 모드"
        >
          <Coffee className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">다회</span>
        </button>
      </div>
    </div>
  );
}


const CELLAR_PAGE_SIZE = 20;

export function Cellar() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CellarItem[]>([]);
  const [reminders, setReminders] = useState<CellarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(CELLAR_PAGE_SIZE);

  // 필터·정렬 상태
  const [activeType, setActiveType] = useState<'all' | string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [sortOpen, setSortOpen] = useState(false);
  const [finishedOpen, setFinishedOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [allItems, reminderItems] = await Promise.all([
        cellarApi.getAll(),
        cellarApi.getReminders(),
      ]);
      setItems(Array.isArray(allItems) ? allItems : []);
      setReminders(Array.isArray(reminderItems) ? reminderItems : []);
    } catch (error) {
      logger.error('Failed to fetch cellar items:', error);
      toast.error('찻장 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      navigate('/login', { replace: true });
      return;
    }
    fetchData();
  }, [isAuthenticated, user, authLoading, navigate, fetchData]);

  // 잔량 > 0: 찻장 목록, 잔량 = 0: 다 마신 차 목록
  const activeItems = useMemo(
    () => items.filter((item) => Number(item.quantity) > 0),
    [items],
  );
  const finishedItems = useMemo(
    () =>
      items
        .filter((item) => Number(item.quantity) <= 0)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [items],
  );

  // 차 종류별 아이템 수 집계 (보유 중인 차만)
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of activeItems) {
      counts[item.tea.type] = (counts[item.tea.type] ?? 0) + 1;
    }
    return counts;
  }, [activeItems]);

  // 차 종류별 잔량(g) 집계 (unit이 g일 때만 합산)
  const typeGramsMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of activeItems) {
      const type = item.tea.type || '기타';
      const qty = Number(item.quantity) || 0;
      if (item.unit === 'g') {
        map[type] = (map[type] ?? 0) + qty;
      }
    }
    return map;
  }, [activeItems]);

  const totalGrams = useMemo(
    () => Object.values(typeGramsMap).reduce((sum, g) => sum + g, 0),
    [typeGramsMap],
  );

  // 요약 카드용: 보유 종류별 잔량 내림차순
  const summaryByType = useMemo(
    () =>
      Object.entries(typeGramsMap)
        .filter(([, g]) => g > 0)
        .sort(([, a], [, b]) => b - a),
    [typeGramsMap],
  );

  // 필터·정렬 적용 (보유 중인 차만)
  const displayedItems = useMemo(() => {
    const filtered =
      activeType === 'all'
        ? activeItems
        : activeItems.filter((item) => item.tea.type === activeType);

    return [...filtered].sort((a, b) => {
      let result = 0;

      if (sortKey === 'name') {
        result = a.tea.name.localeCompare(b.tea.name, 'ko');
      } else if (sortKey === 'quantity') {
        result = Number(a.quantity) - Number(b.quantity);
      } else if (sortKey === 'createdAt') {
        result = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortKey === 'remindAt') {
        // null은 항상 뒤로
        if (!a.remindAt && !b.remindAt) result = 0;
        else if (!a.remindAt) result = 1;
        else if (!b.remindAt) result = -1;
        else result = new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime();
      } else if (sortKey === 'openedAt') {
        // null은 항상 뒤로
        if (!a.openedAt && !b.openedAt) result = 0;
        else if (!a.openedAt) result = 1;
        else if (!b.openedAt) result = -1;
        else result = new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime();
      }

      return sortDir === 'asc' ? result : -result;
    });
  }, [activeItems, activeType, sortKey, sortDir]);

  // 필터/정렬 변경 시 표시 수 리셋
  useEffect(() => {
    setDisplayCount(CELLAR_PAGE_SIZE);
  }, [activeType, sortKey, sortDir]);

  const handleSortChange = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      const option = SORT_OPTIONS.find((o) => o.key === key);
      setSortKey(key);
      setSortDir(option?.defaultDir ?? 'desc');
    }
    setSortOpen(false);
  };

  const handleDelete = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setReminders((prev) => prev.filter((item) => item.id !== id));
  };

  const handleNoteClick = (teaId: number) => {
    navigate(`/note/new?teaId=${teaId}`);
  };

  const handleSessionClick = (teaId: number) => {
    navigate(`/session/new?teaId=${teaId}`);
  };

  const handleEdit = (id: number) => {
    navigate(`/cellar/${id}/edit`);
  };

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" role="status" aria-label="로딩 중" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pb-32">
        <Header showProfile title="📦 내 찻장" showLogo />
        <div className="px-4 sm:px-6 py-4 space-y-4">
          <div className="flex gap-2 overflow-x-hidden py-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="shrink-0 w-20 h-8 rounded-full bg-accent animate-pulse" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <CellarCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <Header showProfile title="📦 내 찻장" showLogo />

      <div className="space-y-0">
        {/* 다회 모드 */}
        <Link
          to="/session/new"
          className="mx-4 mt-4 sm:mx-6 sm:mt-6 flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Coffee className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">다회 모드</p>
              <p className="text-xs text-muted-foreground mt-0.5">탕별 타이머·기록, 세션 요약·차록 발행</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </Link>

        {/* 블라인드 테이스팅 */}
        <Link
          to="/blind/new"
          className="mx-4 mt-2 sm:mx-6 flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <EyeOff className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">블라인드 테이스팅</p>
              <p className="text-xs text-muted-foreground mt-0.5">정보 없이 평가, 참가자별 비교 리포트</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </Link>

        {/* 리마인더 배너 */}
        {reminders.length > 0 && (
          <div className="mx-4 mt-4 sm:mx-6 flex items-start gap-3 bg-rating/10 border border-rating/30 rounded-xl p-3">
            <Bell className="w-4 h-4 text-rating shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">리마인더 알림</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {reminders.map((r) => r.tea.name).join(', ')} — 확인이 필요합니다.
              </p>
            </div>
          </div>
        )}

        {/* 찻장 요약 카드 */}
        {activeItems.length > 0 && totalGrams > 0 && (
          <div className="mx-4 mt-4 sm:mx-6 sm:mt-6 bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">찻장 요약</span>
              <span className="text-base font-semibold text-foreground" aria-label={`전체 ${totalGrams}그램`}>
                총 {totalGrams.toLocaleString()}g
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {summaryByType.map(([type, grams]) => {
                const colorClass = type in TEA_TYPE_COLORS ? TEA_TYPE_COLORS[type as keyof typeof TEA_TYPE_COLORS] : 'bg-muted-foreground/50';
                return (
                  <div
                    key={type}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 bg-muted/30"
                    role="listitem"
                    aria-label={`${type} ${grams}그램`}
                  >
                    <span className={cn('w-1.5 h-6 rounded-full shrink-0', colorClass)} aria-hidden />
                    <span className="text-xs text-muted-foreground truncate">{type}</span>
                    <span className="text-sm font-medium text-foreground ml-auto shrink-0">
                      {grams.toLocaleString()}g
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 차 종류 필터 칩 */}
        {activeItems.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto px-4 sm:px-6 py-3 no-scrollbar"
            role="group"
            aria-label="차 종류 필터"
          >
            {/* 전체 칩 */}
            <button
              type="button"
              onClick={() => setActiveType('all')}
              className={[
                'shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors border',
                activeType === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-secondary',
              ].join(' ')}
              aria-label={`전체 ${activeItems.length}개 ${totalGrams}그램`}
            >
              전체 {activeItems.length}
              {totalGrams > 0 && (
                <span className="ml-1 opacity-80">
                  · <span className="font-medium">{totalGrams.toLocaleString()}g</span>
                </span>
              )}
            </button>

            {/* 각 차 종류 칩 - 차가 있는 종류 먼저 */}
            {[...TEA_TYPES].sort((a, b) => (typeCounts[b] ?? 0) - (typeCounts[a] ?? 0)).map((type) => {
              const count = typeCounts[type] ?? 0;
              const grams = typeGramsMap[type] ?? 0;
              const isActive = activeType === type;
              const colorClass = TEA_TYPE_COLORS[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveType(type)}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors border',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-secondary',
                    count === 0 ? 'opacity-40' : '',
                  )}
                  aria-label={`${type} ${count}개 ${grams}그램`}
                >
                  {!isActive && (
                    <span className={cn('w-1.5 h-5 rounded-full shrink-0', colorClass)} aria-hidden />
                  )}
                  {type} {count}
                  {grams > 0 && (
                    <span className="ml-0.5 opacity-80">
                      · <span className="font-medium">{grams.toLocaleString()}g</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* 아이템 수 + 정렬 드롭다운 */}
        {activeItems.length > 0 && (
          <div className="flex items-center justify-between px-4 sm:px-6 pb-2">
            <p className="text-sm text-muted-foreground">{displayedItems.length}개</p>
            <div className="relative flex items-center gap-1">
              {/* 정렬 기준 버튼 — 클릭 시 커스텀 옵션 목록 표시 */}
              <button
                type="button"
                aria-label="정렬 기준"
                aria-expanded={sortOpen}
                onClick={() => setSortOpen((prev) => !prev)}
                className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors px-1 py-1"
              >
                {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
                {sortDir === 'asc' ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              {/* 커스텀 드롭다운 목록 */}
              {sortOpen && (
                <>
                  {/* 외부 클릭 닫기용 오버레이 */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setSortOpen(false)}
                  />
                  <ul
                    role="listbox"
                    aria-label="정렬 옵션"
                    className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-sm py-1 min-w-28 overflow-hidden"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <li key={opt.key}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={sortKey === opt.key}
                          onClick={() => handleSortChange(opt.key)}
                          className={[
                            'w-full text-left px-4 py-2 text-sm transition-colors',
                            sortKey === opt.key
                              ? 'text-primary font-medium bg-primary/5'
                              : 'text-foreground hover:bg-secondary',
                          ].join(' ')}
                        >
                          {opt.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        {/* 찻장 목록 */}
        <div className="px-4 sm:px-6 pb-4">
          {activeItems.length === 0 && finishedItems.length === 0 ? (
            // 아이템 자체가 없는 전체 빈 상태
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Package className="w-12 h-12 opacity-30" />
              <p className="text-sm">아직 찻장에 차가 없습니다.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/cellar/new')}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                차 추가하기
              </Button>
            </div>
          ) : activeItems.length === 0 ? (
            // 보유 중인 차 없음, 다 마신 차만 있음
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Package className="w-10 h-10 opacity-30" />
              <p className="text-sm">보유 중인 차가 없습니다.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/cellar/new')}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                차 추가하기
              </Button>
            </div>
          ) : displayedItems.length === 0 ? (
            // 필터 결과가 없는 빈 상태 (보유 중인 차는 있지만 해당 종류 없음)
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <Package className="w-10 h-10 opacity-30" />
              <p className="text-sm">해당 종류의 차가 없습니다.</p>
              <button
                type="button"
                onClick={() => setActiveType('all')}
                className="text-xs text-primary hover:underline"
              >
                전체 보기
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayedItems.slice(0, displayCount).map((item, i) => (
                  <div
                    key={item.id}
                    className="animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }}
                  >
                    <CellarCard
                      item={item}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onNoteClick={handleNoteClick}
                      onSessionClick={handleSessionClick}
                    />
                  </div>
                ))}
              </div>
              {displayCount < displayedItems.length && (
                <InfiniteScrollSentinel
                  onLoadMore={() => setDisplayCount((prev) => prev + CELLAR_PAGE_SIZE)}
                  loading
                />
              )}
            </>
          )}

          {/* 다 마신 차 목록 */}
          {finishedItems.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => setFinishedOpen((prev) => !prev)}
                className="flex items-center gap-2 w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>다 마신 차 ({finishedItems.length})</span>
                {finishedOpen ? (
                  <ChevronUp className="w-4 h-4 ml-auto" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-auto" />
                )}
              </button>
              {finishedOpen && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {finishedItems.map((item) => (
                    <CellarCard
                      key={item.id}
                      item={item}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onNoteClick={handleNoteClick}
                      onSessionClick={handleSessionClick}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <FloatingActionButton
        onClick={() => navigate('/cellar/new')}
        ariaLabel="찻장 아이템 추가"
        position="aboveNav"
      >
        <Plus className="w-6 h-6" />
      </FloatingActionButton>

      <BottomNav />
    </div>
  );
}
