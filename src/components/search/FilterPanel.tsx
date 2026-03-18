import React from 'react';
import { Filter } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '../ui/sheet';
import { TEA_TYPES, TEA_TYPE_COLORS } from '../../constants';
import { cn } from '../ui/utils';

type SearchCategory = 'all' | 'tea' | 'note' | 'cellar' | 'seller' | 'tag';

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
  filterPriceRange?: [number, number] | null;
  setFilterPriceRange?: (range: [number, number] | null) => void;
  filterSellerName?: string;
  setFilterSellerName?: (name: string) => void;
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
  const sortOptions =
    category === 'note'
      ? NOTE_SORT_OPTIONS
      : category === 'cellar'
      ? CELLAR_SORT_OPTIONS
      : hasTagParams
      ? SORT_OPTIONS_WITH_MATCH
      : SORT_OPTIONS;

  const currentSortKey =
    category === 'note' ? noteSort : category === 'cellar' ? cellarSort : filterSort;

  function handleSortClick(key: string) {
    if (category === 'note') setNoteSort(key as 'latest' | 'rating');
    else if (category === 'cellar') setCellarSort?.(key as 'name' | 'quantity' | 'recent');
    else setFilterSort(key as 'popular' | 'new' | 'rating' | 'match' | 'recent');
  }

  const hasDetailFilter = category !== 'cellar'
    ? !!(filterType || filterMinRating != null || urlTags.length > 0)
    : !!filterType;

  return (
    <div className="flex items-center gap-2">
      {/* 정렬 칩 — 인라인 가로 스크롤 */}
      <div className="flex-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => handleSortClick(opt.key)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              currentSortKey === opt.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 상세 필터 버튼 */}
      <button
        type="button"
        onClick={() => setFilterOpen((v: boolean) => !v)}
        className={cn(
          'shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
          hasDetailFilter
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60',
        )}
      >
        <Filter className="w-3.5 h-3.5" />
        필터
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary-foreground text-primary text-[10px] font-bold leading-none">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* 상세 필터 — Bottom Sheet */}
      <Sheet open={filterOpen} onOpenChange={(open) => setFilterOpen(open)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto pb-safe">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base">상세 필터</SheetTitle>
          </SheetHeader>

          <div className="px-4 space-y-5 pb-4">
            {/* 차 종류 */}
            <div className="space-y-2">
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
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
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

            {/* 평점 */}
            {category !== 'cellar' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">평점</p>
                <div className="flex gap-1.5">
                  {MIN_RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setFilterMinRating(opt.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
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

            {/* 향미 */}
            {category !== 'cellar' && popularTags.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">향미</p>
                <div className="flex flex-wrap gap-1.5">
                  {popularTags.slice(0, 12).map((tag) => (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => handleTagClick(tag.name)}
                      className={cn(
                        'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                        urlTags.includes(tag.name)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-primary/25 text-foreground hover:bg-primary/5 hover:border-primary/50',
                      )}
                    >
                      <span className={cn('text-xs', urlTags.includes(tag.name) ? 'text-primary-foreground/70' : 'text-primary')}>#</span>
                      {tag.name}
                      {tag.noteCount > 0 && <span className="text-[10px] opacity-60">({tag.noteCount})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="px-4 pb-4">
            <Button className="w-full" onClick={() => { onApply(); setFilterOpen(false); }}>
              적용
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
