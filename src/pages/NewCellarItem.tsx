import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

export function NewCellarItem() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnedTeaId = searchParams.get('teaId');

  const [teas, setTeas] = useState<Tea[]>([]);
  const [teaSearch, setTeaSearch] = useState('');
  const [selectedTeaId, setSelectedTeaId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [openedAt, setOpenedAt] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [memo, setMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingTeas, setIsLoadingTeas] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    const fetchTeas = async () => {
      try {
        setIsLoadingTeas(true);
        const data = await teasApi.getAll();
        const list = Array.isArray(data) ? data : [];
        setTeas(list);

        // 신규 차 등록 후 돌아온 경우 해당 차를 자동 선택
        if (returnedTeaId) {
          const id = parseInt(returnedTeaId, 10);
          if (!isNaN(id)) {
            const matched = list.find((t) => t.id === id);
            if (matched) {
              setSelectedTeaId(id);
            }
          }
        }
      } catch (error) {
        logger.error('Failed to fetch teas:', error);
        toast.error('차 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoadingTeas(false);
      }
    };

    fetchTeas();
  }, [isAuthenticated, authLoading, navigate, returnedTeaId]);

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
      await cellarApi.create({
        teaId: selectedTeaId,
        quantity: quantity ? qty : undefined,
        unit: 'g',
        openedAt: openedAt || null,
        remindAt: remindAt ? new Date(remindAt).toISOString() : null,
        memo: memo.trim() || null,
      });
      toast.success('찻장에 추가되었습니다.');
      navigate('/cellar');
    } catch (error) {
      logger.error('Failed to create cellar item:', error);
      toast.error('찻장 추가에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header showBack title="찻장에 차 추가" showProfile showLogo />

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
              {isLoadingTeas ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
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
                            `/tea/new?returnTo=/cellar/new${teaSearch.trim() ? `&searchQuery=${encodeURIComponent(teaSearch.trim())}` : ''}`,
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
                          {tea.price != null && tea.price > 0 && ` · ${tea.price.toLocaleString()}원${tea.weight != null && tea.weight > 0 ? ` · ${tea.weight}g` : ''}`}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
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
          <div className="flex gap-2">
            {DECREMENT_OPTIONS.map((n) => (
              <Button
                key={n}
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
          </div>
        </div>

        {/* 개봉일 */}
        <div className="space-y-2">
          <Label htmlFor="openedAt">개봉일</Label>
          <p className="text-xs text-muted-foreground">
            차 포장을 처음 개봉한 날짜입니다. 신선도·소비 시점 추적에 활용됩니다.
          </p>
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
          <p className="text-xs text-muted-foreground">
            설정한 날짜·시간에 찻장에서 알림 배너로 표시됩니다.
            <br />
            (예: 재구매 시점, 유통기한 확인 등)
          </p>
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
              추가 중...
            </>
          ) : (
            '찻장에 추가'
          )}
        </Button>
      </form>
    </div>
  );
}
