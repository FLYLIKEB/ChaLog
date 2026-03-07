import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Store, Loader2, ChevronDown } from 'lucide-react';
import { Input } from './ui/input';
import { cn } from './ui/utils';
import { teasApi } from '../lib/api';
import { Seller } from '../types';
import { logger } from '../lib/logger';
import { SEARCH_DEBOUNCE_DELAY } from '../constants';

interface SellerComboboxProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
}

export function SellerCombobox({
  value,
  onChange,
  disabled = false,
  id = 'seller',
  placeholder = '예: OO 찻집, OO몰',
  className,
}: SellerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSellers = useCallback(async (query: string) => {
    try {
      setIsSearching(true);
      const res = await teasApi.getSellers(query || undefined);
      const list = res?.sellers ?? (Array.isArray(res) ? res : []);
      setSellers(Array.isArray(list) ? list : []);
    } catch (error) {
      logger.error('Failed to fetch sellers:', error);
      setSellers([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 입력값 변경 시 debounce로 API 호출
  useEffect(() => {
    const trimmed = value.trim();
    const timeoutId = setTimeout(() => {
      if (open) fetchSellers(trimmed);
    }, trimmed.length >= 1 ? SEARCH_DEBOUNCE_DELAY : 0);
    return () => clearTimeout(timeoutId);
  }, [value, open, fetchSellers]);

  // 포커스 시 찻집 목록 로드
  const handleFocus = useCallback(() => {
    setOpen(true);
    fetchSellers(value.trim());
  }, [value, fetchSellers]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (sellerName: string) => {
      onChange(sellerName);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        data-testid="seller-input"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        disabled={disabled}
        className={cn('pr-9', className)}
        autoComplete="off"
      />
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-md"
          role="listbox"
        >
          {isSearching ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sellers.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {value.trim() ? (
                '검색 결과가 없어요. 직접 입력해 새 찻집을 등록할 수 있어요.'
              ) : (
                '찻집 이름을 입력해 검색하거나, 직접 입력해 새 찻집을 등록할 수 있어요.'
              )}
            </div>
          ) : (
            <div className="max-h-[200px] overflow-y-auto">
              {sellers.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  role="option"
                  onClick={() => handleSelect(s.name)}
                  className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                    {s.name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {s.teaCount}종
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
