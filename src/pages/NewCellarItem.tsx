import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { QuantityAdjuster } from '../components/QuantityAdjuster';
import { teasApi, cellarApi } from '../lib/api';
import { Tea } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { logger } from '../lib/logger';
import { TeaSearchSection } from '../components/TeaSearchSection';

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
  const teaSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!returnedTeaId) {
      const timer = setTimeout(() => teaSearchRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, []);

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
        <TeaSearchSection
          inputRef={teaSearchRef}
          label="차 선택 *"
          variant="inline"
          showAllWhenEmpty={true}
          isLoading={isLoadingTeas}
          searchQuery={teaSearch}
          onSearchChange={setTeaSearch}
          selectedTea={selectedTeaId}
          filteredTeas={filteredTeas}
          selectedTeaData={selectedTea ? { name: selectedTea.name, type: selectedTea.type } : null}
          onSelectTea={(id) => {
            setSelectedTeaId(id);
            setTeaSearch('');
          }}
          onClearTea={() => {
            setSelectedTeaId(null);
            setTeaSearch('');
          }}
          newTeaBasePath={`/tea/new?returnTo=/cellar/new`}
        />

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
          <QuantityAdjuster quantity={quantity} onChange={setQuantity} />
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
