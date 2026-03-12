import React from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { TEA_TYPES, TEA_TYPE_COLORS } from '../../constants';
import { cn } from '../ui/utils';

type SearchCategory = 'tea' | 'note' | 'cellar' | 'seller' | 'tag';

const SORT_OPTIONS = [
  { key: 'popular' as const, label: '인기순' },
  { key: 'new' as const, label: '최신순' },
  { key: 'rating' as const, label: '평점순' },
];

const SORT_OPTIONS_WITH_MATCH = [
  { key: 'match' as const, label: '일치율순' },
  { key: 'popular' as const, label: '인기도순' },
  { key: 'recent' as const, label: '최신순' },
];

const MIN_RATING_OPTIONS = [
  { value: undefined, label: '전체' },
  { value: 4, label: '4점 이상' },
  { value: 3, label: '3점 이상' },
];

const NOTE_SORT_OPTIONS = [
  { key: 'latest' as const, label: '최신순' },
  { key: 'rating' as const, label: '평점순' },
];

const CELLAR_SORT_OPTIONS = [
  { key: 'recent' as const, label: '등록순' },
  { key: 'name' as const, label: '이름순' },
  { key: 'quantity' as const, label: '수량순' },
];

export interface FilterPanelProps {
  category: SearchCategory;
  filterOpen: boolean;
  setFilterOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  activeFilterCount: number;
  filterType: string | null;
  setFilterType: (type: string | null) => void;
  filterMinRating: number | undefined;
  setFilterMinRating: (rating: number | undefined) => void;
  filterSort: 'popular' | 'new' | 'rating' | 'match' | 'recent';
  setFilterSort: (sort: 'popular' | 'new' | 'rating' | 'match' | 'recent') => void;
  noteSort: 'latest' | 'rating';
  setNoteSort: (sort: 'latest' | 'rating') => void;
  cellarSort?: 'name' | 'quantity' | 'recent';
  setCellarSort?: (sort: 'name' | 'quantity' | 'recent') => void;
  hasTagParams: boolean;
  urlTags: string[];
  popularTags: { name: string; noteCount: number }[];
  handleTagClick: (tagName: string) => void;
  onApply: () => void;
}

export function FilterPanel({
  category,
  filterOpen,
  setFilterOpen,
  activeFilterCount,
  filterType,
  setFilterType,
  filterMinRating,
  setFilterMinRating,
  filterSort,
  setFilterSort,
  noteSort,
  setNoteSort,
  cellarSort,
  setCellarSort,
  hasTagParams,
  urlTags,
  popularTags,
  handleTagClick,
  onApply,
}: FilterPanelProps) {
  return (
    <div className="border border-border/60 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setFilterOpen((v: boolean) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          필터
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
              {activeFilterCount}
            </span>
          )}
        </span>
        <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', filterOpen && 'rotate-180')} />
      </button>
      {filterOpen && (
        <div className="divide-y divide-border/40">
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">정렬</p>
            <div className="flex flex-wrap gap-1.5">
              {category === 'note'
                ? NOTE_SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setNoteSort(opt.key)}
                      className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium border transition-colors',
                        noteSort === opt.key
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))
                : category === 'cellar'
                ? CELLAR_SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setCellarSort?.(opt.key)}
                      className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium border transition-colors',
                        cellarSort === opt.key
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))
                : (hasTagParams ? SORT_OPTIONS_WITH_MATCH : SORT_OPTIONS).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setFilterSort(opt.key)}
                      className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium border transition-colors',
                        filterSort === opt.key
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
            </div>
          </div>

          <div className="px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">차 종류</p>
            <div className="flex flex-wrap gap-1.5">
              {TEA_TYPES.map((type) => {
                const isSelected = filterType === type;
                const colorClass = TEA_TYPE_COLORS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType(isSelected ? null : type)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border transition-colors',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60',
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isSelected ? 'bg-primary-foreground' : colorClass)} aria-hidden />
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {category !== 'cellar' && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">평점</p>
              <div className="flex flex-wrap gap-1.5">
                {MIN_RATING_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setFilterMinRating(opt.value)}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium border transition-colors',
                      filterMinRating === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {category !== 'cellar' && popularTags.length > 0 && (
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">향미</p>
              <div className="flex flex-wrap gap-1.5">
                {popularTags.slice(0, 12).map((tag) => (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => handleTagClick(tag.name)}
                    className={cn(
                      'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border transition-colors',
                      urlTags.includes(tag.name)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60',
                    )}
                  >
                    #{tag.name}
                    {tag.noteCount > 0 && <span className="text-[10px] opacity-60">({tag.noteCount})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 py-3">
            <Button size="sm" className="w-full" onClick={onApply}>
              적용
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
