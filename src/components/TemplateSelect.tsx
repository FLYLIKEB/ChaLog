import React, { useState, useRef, useEffect } from 'react';
import { Pin, PinOff, Search, ChevronDown, X, Info } from 'lucide-react';
import { Input } from './ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { cn } from './ui/utils';
import { RatingSchema } from '../types';
import { notesApi } from '../lib/api';
import { toast } from 'sonner';
import { logger } from '../lib/logger';

const DISPLAY_LIMIT = 5;

interface TemplateSelectProps {
  schemas: RatingSchema[];
  pinnedSchemaIds: number[];
  onPinnedChange: (pinnedSchemaIds: number[]) => void;
  value: number | number[] | null;
  onChange: (schemaId: number | number[] | null) => void;
  onAddTemplate?: () => void;
  disabled?: boolean;
  isAuthenticated?: boolean;
  /** 여러 개 선택 가능 여부 (기본 false) */
  multiple?: boolean;
}

export function TemplateSelect({
  schemas,
  pinnedSchemaIds,
  onPinnedChange,
  value,
  onChange,
  onAddTemplate,
  disabled = false,
  isAuthenticated = false,
  multiple = false,
}: TemplateSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const pinnedSet = new Set(pinnedSchemaIds);
  const sortedSchemas = [...schemas].sort((a, b) => {
    const aPinned = pinnedSet.has(a.id);
    const bPinned = pinnedSet.has(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  const filtered = search.trim()
    ? sortedSchemas.filter(s =>
        s.nameKo.toLowerCase().includes(search.toLowerCase()) ||
        (s.nameEn && s.nameEn.toLowerCase().includes(search.toLowerCase()))
      )
    : sortedSchemas;

  const displayList = search.trim() ? filtered : filtered.slice(0, DISPLAY_LIMIT);
  const hasMore = !search.trim() && filtered.length > DISPLAY_LIMIT;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedIds = Array.isArray(value) ? value : value != null ? [value] : [];
  const selectedSchemas = selectedIds
    .map(id => schemas.find(s => s.id === id))
    .filter((s): s is RatingSchema => s != null);

  const handleSelect = (schemaId: number | null) => {
    if (multiple) {
      if (schemaId == null) {
        onChange([]);
      } else {
        const next = selectedIds.includes(schemaId)
          ? selectedIds.filter(id => id !== schemaId)
          : [...selectedIds, schemaId];
        onChange(next.length > 0 ? next : null);
      }
      if (schemaId == null) setOpen(false);
    } else {
      onChange(schemaId);
      setOpen(false);
    }
  };

  const handleRemove = (e: React.MouseEvent, schemaId: number) => {
    e.stopPropagation();
    if (multiple && selectedIds.length > 1) {
      onChange(selectedIds.filter(id => id !== schemaId));
    } else {
      onChange(null);
    }
  };

  const handlePinClick = async (e: React.MouseEvent, schemaId: number) => {
    e.stopPropagation();
    if (!isAuthenticated) return;
    try {
      const { pinned } = await notesApi.toggleSchemaPin(schemaId);
      const next = pinned
        ? [...pinnedSchemaIds, schemaId]
        : pinnedSchemaIds.filter(id => id !== schemaId);
      onPinnedChange(next);
    } catch (err) {
      logger.error('Failed to toggle pin:', err);
      toast.error('핀 설정에 실패했습니다.');
    }
  };

  const selectedSchema = !multiple && value != null && !Array.isArray(value)
    ? schemas.find(s => s.id === value)
    : null;

  return (
    <div ref={containerRef} className="relative space-y-2">
      {/* 선택된 템플릿 칩 (여러 개 선택 시 X 버튼으로 삭제) */}
      {selectedSchemas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedSchemas.map(schema => (
            <span
              key={schema.id}
              className="inline-flex items-center gap-1 rounded-md bg-primary/15 text-primary px-2 py-1 text-xs font-medium"
            >
              <button
                type="button"
                onClick={e => handleRemove(e, schema.id)}
                className="shrink-0 p-0.5 rounded hover:bg-primary/30 -ml-0.5"
                aria-label={`${schema.nameKo} 제거`}
              >
                <X className="h-3 w-3" />
              </button>
              <span>{schema.nameKo}</span>
              {schema.descriptionKo?.trim() && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={e => e.stopPropagation()}
                      className="shrink-0 rounded p-0.5 opacity-80 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                      aria-label={`${schema.nameKo} 설명 보기`}
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    side="top"
                    className="max-w-[280px] text-sm"
                  >
                    <p className="text-muted-foreground">{schema.descriptionKo}</p>
                  </PopoverContent>
                </Popover>
              )}
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => !disabled && setOpen(prev => !prev)}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <span className={selectedSchemas.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedSchemas.length > 0
            ? (multiple ? `${selectedSchemas.length}개 선택됨` : selectedSchemas[0].nameKo)
            : '템플릿 선택 (선택사항)'}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="템플릿 검색..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                'flex w-full items-center px-3 py-2 text-sm hover:bg-accent',
                selectedIds.length === 0 && 'bg-accent/50'
              )}
            >
              선택 안 함
            </button>
            {displayList.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                {search.trim() ? '검색 결과가 없습니다.' : '템플릿이 없습니다.'}
              </div>
            ) : (
              displayList.map(schema => {
                const isPinned = pinnedSet.has(schema.id);
                const isSelected = selectedIds.includes(schema.id);
                return (
                  <div
                    key={schema.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelect(schema.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(schema.id);
                      }
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer',
                      isSelected && 'bg-accent/50'
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span className="truncate">{schema.nameKo}</span>
                      {schema.descriptionKo?.trim() && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              onClick={e => e.stopPropagation()}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.stopPropagation();
                                }
                              }}
                              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                              aria-label={`${schema.nameKo} 설명 보기`}
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            side="top"
                            className="max-w-[280px] text-sm"
                          >
                            <p className="text-muted-foreground">{schema.descriptionKo}</p>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={e => handlePinClick(e, schema.id)}
                        className={cn(
                          'shrink-0 p-1 rounded hover:bg-muted',
                          isPinned && 'text-primary'
                        )}
                        title={isPinned ? '핀 해제' : '핀 고정'}
                      >
                        {isPinned ? (
                          <Pin className="h-4 w-4 fill-current" />
                        ) : (
                          <PinOff className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {hasMore && (
            <div className="px-3 py-2 text-xs text-muted-foreground border-t">
              검색어를 입력하면 전체 목록을 볼 수 있어요.
            </div>
          )}
          {onAddTemplate && isAuthenticated && (
            <div className="border-t p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onAddTemplate();
                }}
                className="w-full text-left text-sm text-primary hover:underline py-1"
              >
                + 템플릿 추가
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
