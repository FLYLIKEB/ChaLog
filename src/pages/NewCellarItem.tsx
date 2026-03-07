import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { cellarApi, teasApi } from '../lib/api';
import { Tea, CellarUnit } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '../lib/logger';
import { Loader2, Search } from 'lucide-react';

const UNIT_OPTIONS: { value: CellarUnit; label: string }[] = [
  { value: 'g', label: 'g (그램)' },
  { value: 'ml', label: 'ml (밀리리터)' },
  { value: 'bag', label: '개 (티백)' },
  { value: 'cake', label: '병 (케이크/병)' },
];

export function NewCellarItem() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Tea[]>([]);
  const [selectedTea, setSelectedTea] = useState<Tea | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<CellarUnit>('g');
  const [openedAt, setOpenedAt] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await teasApi.getAll(query.trim());
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (error) {
      logger.error('Failed to search teas:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTea) return;
    const timer = setTimeout(() => handleSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTea, handleSearch]);

  const handleSelectTea = (tea: Tea) => {
    setSelectedTea(tea);
    setSearchQuery(tea.name);
    setSearchResults([]);
  };

  const handleClearTea = () => {
    setSelectedTea(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTea) {
      toast.error('차를 선택해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      await cellarApi.create({
        teaId: selectedTea.id,
        quantity: quantity ? Number(quantity) : undefined,
        unit,
        openedAt: openedAt || null,
        remindAt: remindAt || null,
        memo: memo.trim() || null,
      });
      toast.success('셀러에 추가했습니다.');
      navigate('/cellar');
    } catch (error) {
      logger.error('Failed to create cellar item:', error);
      toast.error('추가에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="차 추가" showBack />

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="tea-search">차 선택 *</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="tea-search"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                if (selectedTea) handleClearTea();
              }}
              placeholder="차 이름으로 검색..."
              className="pl-9"
              autoComplete="off"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {searchResults.length > 0 && !selectedTea && (
            <div className="border border-border rounded-lg bg-card shadow-sm overflow-hidden max-h-52 overflow-y-auto">
              {searchResults.map(tea => (
                <button
                  key={tea.id}
                  type="button"
                  onClick={() => handleSelectTea(tea)}
                  className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center justify-between gap-3"
                >
                  <span className="font-medium text-sm">{tea.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{tea.type}</span>
                </button>
              ))}
            </div>
          )}

          {selectedTea && (
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <span className="text-sm font-medium flex-1">{selectedTea.name}</span>
              <span className="text-xs text-muted-foreground">{selectedTea.type}</span>
              <button
                type="button"
                onClick={handleClearTea}
                className="text-xs text-muted-foreground hover:text-foreground ml-1"
              >
                변경
              </button>
            </div>
          )}

          {!selectedTea && searchQuery.trim().length > 0 && !isSearching && searchResults.length === 0 && (
            <p className="text-sm text-muted-foreground">
              검색 결과가 없습니다.{' '}
              <button
                type="button"
                className="text-primary underline-offset-2 hover:underline"
                onClick={() => navigate(`/tea/new?searchQuery=${encodeURIComponent(searchQuery)}&returnTo=/cellar/new`)}
              >
                새 차 등록하기
              </button>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="quantity">잔량</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              step="0.1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">단위</Label>
            <Select value={unit} onValueChange={v => setUnit(v as CellarUnit)}>
              <SelectTrigger id="unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="openedAt">개봉일</Label>
          <Input
            id="openedAt"
            type="date"
            value={openedAt}
            onChange={e => setOpenedAt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="remindAt">리마인더 날짜</Label>
          <Input
            id="remindAt"
            type="date"
            value={remindAt}
            onChange={e => setRemindAt(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            설정한 날짜에 마셔야 할 차 알림이 표시됩니다.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="memo">메모</Label>
          <Textarea
            id="memo"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="차에 대한 메모를 남겨보세요."
            rows={3}
          />
        </div>

        <div className="pt-2 flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/cellar')}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting || !selectedTea}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                추가 중...
              </>
            ) : (
              '셀러에 추가'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
