import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Bell, Package, FileText, Trash2 } from 'lucide-react';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { Button } from '../components/ui/button';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { cellarApi } from '../lib/api';
import { CellarItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { logger } from '../lib/logger';

const UNIT_LABELS: Record<string, string> = {
  g: 'g',
  ml: 'ml',
  bag: '개',
  cake: '병',
};

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
    if (!confirm(`"${item.tea.name}" 셀러 아이템을 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      await cellarApi.remove(item.id);
      onDelete(item.id);
      toast.success('셀러 아이템이 삭제되었습니다.');
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
        toast.error('셀러 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, user, authLoading, navigate]);

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
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" role="status" aria-label="로딩 중" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header showProfile title="내 셀러" />

      <div className="p-4 sm:p-6 space-y-5">
        {/* 리마인더 배너 */}
        {reminders.length > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <Bell className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">리마인더 알림</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {reminders.map((r) => r.tea.name).join(', ')} — 확인이 필요합니다.
              </p>
            </div>
          </div>
        )}

        {/* 셀러 목록 */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Package className="w-12 h-12 opacity-30" />
            <p className="text-sm">아직 셀러에 차가 없습니다.</p>
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
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <CellarCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onNoteClick={handleNoteClick}
              />
            ))}
          </div>
        )}
      </div>

      <FloatingActionButton
        onClick={() => navigate('/cellar/new')}
        ariaLabel="셀러 아이템 추가"
        position="aboveNav"
      >
        <Plus className="w-6 h-6" />
      </FloatingActionButton>

      <BottomNav />
    </div>
  );
}
