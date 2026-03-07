import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { cellarApi } from '../lib/api';
import { CellarItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '../lib/logger';
import {
  Loader2,
  Plus,
  Package,
  Bell,
  CalendarDays,
  FileText,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';

const UNIT_LABELS: Record<string, string> = {
  g: 'g',
  ml: 'ml',
  bag: '개',
  cake: '병',
};

function CellarCard({
  item,
  onDelete,
  onNoteCreate,
}: {
  item: CellarItem;
  onDelete: (id: number) => void;
  onNoteCreate: (teaId: number) => void;
}) {
  const unitLabel = UNIT_LABELS[item.unit] ?? item.unit;
  const hasReminder = item.remindAt !== null;
  const isReminderDue = hasReminder && new Date(item.remindAt!) <= new Date();

  const handleDelete = async () => {
    if (!confirm(`"${item.tea.name}" 아이템을 삭제하시겠습니까?`)) return;
    try {
      await cellarApi.remove(item.id);
      onDelete(item.id);
      toast.success('아이템을 삭제했습니다.');
    } catch (error) {
      logger.error('Failed to delete cellar item:', error);
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground truncate">{item.tea.name}</span>
            {item.tea.type && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {item.tea.type}
              </Badge>
            )}
            {isReminderDue && (
              <Badge variant="destructive" className="text-xs shrink-0 flex items-center gap-1">
                <Bell className="w-3 h-3" />
                리마인더
              </Badge>
            )}
          </div>

          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              {Number(item.quantity)}{unitLabel}
            </span>
            {item.openedAt && (
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                개봉: {item.openedAt}
              </span>
            )}
            {item.remindAt && (
              <span className="flex items-center gap-1">
                <Bell className="w-3.5 h-3.5" />
                리마인더: {item.remindAt}
              </span>
            )}
          </div>

          {item.memo && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.memo}</p>
          )}
        </div>

        <div className="flex flex-col gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => onNoteCreate(item.teaId)}
            title="이 차로 노트 작성"
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            노트
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-destructive hover:text-destructive"
            onClick={handleDelete}
            title="삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
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
        setItems(Array.isArray(allItems) ? (allItems as CellarItem[]) : []);
        setReminders(Array.isArray(reminderItems) ? (reminderItems as CellarItem[]) : []);
      } catch (error) {
        logger.error('Failed to fetch cellar items:', error);
        toast.error('보유 차 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, user, authLoading, navigate]);

  const handleDelete = (id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setReminders(prev => prev.filter(item => item.id !== id));
  };

  const handleNoteCreate = (teaId: number) => {
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
    <div className="min-h-screen bg-background pb-20">
      <Header showProfile title="내 셀러" />

      <div className="p-4 sm:p-6 space-y-5">
        {reminders.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <Bell className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-medium">{reminders.length}개</span>의 차가 오늘 리마인더 기한입니다.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            {items.length > 0 ? `총 ${items.length}종` : '아직 등록된 차가 없습니다'}
          </h2>
          <Button
            size="sm"
            onClick={() => navigate('/cellar/new')}
            className="flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            차 추가
          </Button>
        </div>

        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map(item => (
              <CellarCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onNoteCreate={handleNoteCreate}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center">보유한 차를 추가해보세요.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/cellar/new')}
            >
              <Plus className="w-4 h-4 mr-2" />
              첫 번째 차 추가하기
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
