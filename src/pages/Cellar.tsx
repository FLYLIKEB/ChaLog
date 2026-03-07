import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Bell, Package, FileText, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
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
import { TEA_TYPES } from '../constants';

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
  onNoteClick,
}: {
  item: CellarItem;
  onDelete: (id: number) => void;
  onNoteClick: (teaId: number) => void;
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

  return (
    <div className="bg-white rounded-xl border border-border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-base truncate">{item.tea.name}</h3>
          <p className="text-sm text-muted-foreground">
            {Number(item.quantity)}{UNIT_LABELS[item.unit] ?? item.unit}
            {item.tea.type && (
              <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded-full">
                {item.tea.type}
              </span>
            )}
          </p>
        </div>
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

      {item.openedAt && (
        <p className="text-xs text-muted-foreground">
          개봉일: {formatDate(item.openedAt)}
        </p>
      )}

      {item.memo && (
        <p className="text-sm text-foreground/80 line-clamp-2">{item.memo}</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1 text-xs"
          onClick={() => onNoteClick(item.teaId)}
        >
          <FileText className="w-3.5 h-3.5" />
          노트 작성
        </Button>
      </div>
    </div>
  );
}

export function Cellar() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CellarItem[]>([]);
  const [reminders, setReminders] = useState<CellarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 필터·정렬 상태
  const [activeType, setActiveType] = useState<'all' | string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      navigate('/login', { replace: true });
      return;
    }

    const fetchData = async () => {
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
    };

    fetchData();
  }, [isAuthenticated, user, authLoading, navigate]);

  // 차 종류별 아이템 수 집계
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.tea.type] = (counts[item.tea.type] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  // 필터·정렬 적용
  const displayedItems = useMemo(() => {
    const filtered =
      activeType === 'all'
        ? items
        : items.filter((item) => item.tea.type === activeType);

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
  }, [items, activeType, sortKey, sortDir]);

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

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" role="status" aria-label="로딩 중" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <Header showProfile title="내 찻장" showLogo />
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
    <div className="min-h-screen bg-background pb-32">
      <Header showProfile title="내 찻장" showLogo />

      <div className="space-y-0">
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

        {/* 차 종류 필터 칩 */}
        {items.length > 0 && (
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
            >
              전체 {items.length}
            </button>

            {/* 각 차 종류 칩 */}
            {TEA_TYPES.map((type) => {
              const count = typeCounts[type] ?? 0;
              const isActive = activeType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveType(type)}
                  className={[
                    'shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors border',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-secondary',
                    count === 0 ? 'opacity-40' : '',
                  ].join(' ')}
                >
                  {type} {count}
                </button>
              );
            })}
          </div>
        )}

        {/* 아이템 수 + 정렬 드롭다운 */}
        {items.length > 0 && (
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
                    className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-28 overflow-hidden"
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
          {items.length === 0 ? (
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
          ) : displayedItems.length === 0 ? (
            // 필터 결과가 없는 빈 상태
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
            <div className="space-y-3">
              {displayedItems.map((item, i) => (
                <div
                  key={item.id}
                  className="animate-fade-in-up opacity-0"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CellarCard
                    item={item}
                    onDelete={handleDelete}
                    onNoteClick={handleNoteClick}
                  />
                </div>
              ))}
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
