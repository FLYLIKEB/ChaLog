import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { teasApi, cellarApi } from '../lib/api';
import { Tea } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useRegisterRefresh } from '../contexts/PullToRefreshContext';
import { toast } from 'sonner';
import { Loader2, PlusCircle } from 'lucide-react';
import { logger } from '../lib/logger';
import { TeaTypeBadge } from '../components/TeaTypeBadge';

const DECREMENT_OPTIONS = [3, 5, 8] as const;
const INCREMENT_OPTIONS = [50] as const;

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditCellarItem() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const itemId = id ? parseInt(id, 10) : NaN;

  const [teas, setTeas] = useState<Tea[]>([]);
  const [teaSearch, setTeaSearch] = useState('');
  const [selectedTeaId, setSelectedTeaId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [openedAt, setOpenedAt] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [memo, setMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (isNaN(itemId)) {
      toast.error('잘못된 경로입니다.');
      navigate('/cellar', { replace: true });
      return;
    }

    const load = async () => {
      try {
        setIsLoading(true);
        const [item, teasData] = await Promise.all([
          cellarApi.getById(itemId),
          teasApi.getAll(),
        ]);
        const list = Array.isArray(teasData) ? teasData : [];
        setTeas(list);
        setSelectedTeaId(item.teaId);
        setQuantity(item.quantity != null ? String(item.quantity) : '');
        setOpenedAt(toDateInputValue(item.openedAt));
        setRemindAt(toDateTimeLocalValue(item.remindAt));
        setMemo(item.memo ?? '');
      } catch (error) {
        logger.error('Failed to load cellar item:', error);
        toast.error('찻장 아이템을 불러오는데 실패했습니다.');
        navigate('/cellar', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [isAuthenticated, authLoading, navigate, itemId]);

  const registerRefresh = useRegisterRefresh();
  useEffect(() => {
    registerRefresh(undefined);
    return () => registerRefresh(undefined);
  }, [registerRefresh]);

  const filteredTeas = teaSearch.trim()
    ? teas.filter(
        (t) =>
          t.name.includes(teaSearch) ||
          t.type.includes(teaSearch) ||
          (t.seller ?? '').includes(teaSearch),
      )
    : teas;

  const selectedTea = teas.find((t) => t.id === selectedTeaId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTeaId) {
      toast.error('차를 선택해주세요.');
      return;
    }

    const qty = parseFloat(quantity);
    if (quantity && (isNaN(qty) || qty < 0)) {
      toast.error('잔량은 0 이상의 숫자로 입력해주세요.');
      return;
    }

    try {
      setIsSaving(true);
      await cellarApi.update(itemId, {
        teaId: selectedTeaId,
        quantity: quantity ? qty : 0,
        unit: 'g',
        openedAt: openedAt || null,
        remindAt: remindAt ? new Date(remindAt).toISOString() : null,
        memo: memo.trim() || null,
      });
      toast.success('찻장 아이템이 수정되었습니다.');
      navigate('/cellar');
    } catch (error) {
      logger.error('Failed to update cellar item:', error);
      toast.error('수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header showBack title="찻장 아이템 수정" showProfile showLogo />

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 pb-10">
        {/* 차 선택 */}
        <div className="space-y-2">
          <Label htmlFor="tea-search">차 선택 *</Label>
          {selectedTea ? (
            <div className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
              <div>
                <p className="font-medium text-sm">{selectedTea.name}</p>
                <p className="text-xs text-muted-foreground">{selectedTea.type}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTeaId(null);
                  setTeaSearch('');
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                변경
              </button>
            </div>
          ) : (
            <>
              <Input
                id="tea-search"
                placeholder="차 이름으로 검색..."
                value={teaSearch}
                onChange={(e) => setTeaSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border bg-card">
                {filteredTeas.length === 0 ? (
                  <div className="p-3 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {teaSearch ? '검색 결과가 없습니다.' : '차 목록이 없습니다.'}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/tea/new?returnTo=/cellar/${itemId}/edit${teaSearch.trim() ? `&searchQuery=${encodeURIComponent(teaSearch.trim())}` : ''}`,
                        )
                      }
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      <PlusCircle className="w-4 h-4" />
                      새 차 등록하기
                    </button>
                  </div>
                ) : (
                  filteredTeas.map((tea) => (
                    <button
                      key={tea.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors"
                      onClick={() => {
                        setSelectedTeaId(tea.id);
                        setTeaSearch('');
                      }}
                    >
                      <p className="text-sm font-medium">{tea.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        {tea.type && <TeaTypeBadge type={tea.type} />}
                        {tea.price != null && tea.price > 0 &&
                          ` · ${tea.price.toLocaleString()}원${tea.weight != null && tea.weight > 0 ? ` · ${tea.weight}g` : ''}`}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* 잔량 */}
        <div className="space-y-2">
          <Label htmlFor="quantity">잔량 (g)</Label>
          <div className="flex gap-2">
            <Input
              id="quantity"
              type="number"
              min="0"
              step="0.1"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="flex-1"
            />
            <span className="flex items-center px-3 text-sm text-muted-foreground">g</span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {DECREMENT_OPTIONS.map((n) => (
              <Button
                key={`-${n}`}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const current = parseFloat(quantity) || 0;
                  setQuantity(String(Math.max(0, current - n)));
                }}
              >
                -{n}g
              </Button>
            ))}
            {INCREMENT_OPTIONS.map((n) => (
              <Button
                key={`+${n}`}
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => {
                  const current = parseFloat(quantity) || 0;
                  setQuantity(String(current + n));
                }}
              >
                +{n}g
              </Button>
            ))}
          </div>
        </div>

        {/* 개봉일 */}
        <div className="space-y-2">
          <Label htmlFor="openedAt">개봉일</Label>
          <Input
            id="openedAt"
            type="date"
            value={openedAt}
            onChange={(e) => setOpenedAt(e.target.value)}
          />
        </div>

        {/* 리마인더 */}
        <div className="space-y-2">
          <Label htmlFor="remindAt">리마인더 날짜</Label>
          <Input
            id="remindAt"
            type="datetime-local"
            value={remindAt}
            onChange={(e) => setRemindAt(e.target.value)}
          />
        </div>

        {/* 메모 */}
        <div className="space-y-2">
          <Label htmlFor="memo">메모</Label>
          <Textarea
            id="memo"
            placeholder="보관 상태, 구매처 등 메모를 남겨보세요."
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSaving || !selectedTeaId}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              수정 중...
            </>
          ) : (
            '수정 완료'
          )}
        </Button>
      </form>
    </div>
  );
}
