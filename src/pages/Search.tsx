import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePullToRefreshForPage } from '../contexts/PullToRefreshContext';
import { Search as SearchIcon, Plus, Store, Filter, Clock, X, ChevronDown, Package } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { TeaCard } from '../components/TeaCard';
import { TeaRankingCard } from '../components/TeaRankingCard';
import { TeaNewCard } from '../components/TeaNewCard';
import { TeaCardSkeleton } from '../components/TeaCardSkeleton';
import { EmptyState } from '../components/EmptyState';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { BottomNav } from '../components/BottomNav';
import { Section } from '../components/ui/Section';
import { teasApi, tagsApi, notesApi, cellarApi } from '../lib/api';
import { Tea, Seller, Note, CellarItem } from '../types';
import { NoteCard } from '../components/NoteCard';
import { NoteCardSkeleton } from '../components/NoteCardSkeleton';
import { toast } from 'sonner';
import { logger } from '../lib/logger';
import { SEARCH_DEBOUNCE_DELAY, TEA_TYPES, TEA_TYPE_COLORS, CARD_WIDTH, CARD_CONTAINER_CLASSES, CARD_ITEM_WRAPPER_CLASSES, CARD_SKELETON_CONTAINER_CLASSES } from '../constants';
import { cn } from '../components/ui/utils';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { useSearchFilters } from '../hooks/useSearchFilters';
import { useAuth } from '../contexts/AuthContext';

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

type SearchCategory = 'tea' | 'note' | 'cellar' | 'seller' | 'tag';

const SEARCH_CATEGORIES: { key: SearchCategory; label: string }[] = [
  { key: 'tea', label: '차' },
  { key: 'note', label: '내 차록' },
  { key: 'cellar', label: '찻장' },
  { key: 'seller', label: '찻집' },
  { key: 'tag', label: '향미' },
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

interface FilterPanelProps {
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

function FilterPanel({
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
          {/* 정렬 */}
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

          {/* 차 종류 */}
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

          {/* 평점 */}
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

          {/* 향미 태그 */}
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

          {/* 적용 */}
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

export function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSection = searchParams.get('section') as 'popular' | 'new' | 'curation' | null;

  const { user } = useAuth();
  const { recentSearches, addSearch, removeSearch, clearAll } = useRecentSearches();
  const filters = useSearchFilters();
  const {
    filterType, filterMinRating, filterSort, noteSort, setNoteSort,
    filterOpen, setFilterOpen, activeFilterCount,
    urlTags, hasTagParams, hasFilterParams,
    handleTagClick, applyFilters, fetchWithFilters,
  } = filters;

  const [cellarSort, setCellarSort] = useState<'name' | 'quantity' | 'recent'>('recent');
  const [activeTab, setActiveTab] = useState<'search' | 'explore'>('search');
  const [searchCategory, setSearchCategory] = useState<SearchCategory>('tea');
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [noteResults, setNoteResults] = useState<Note[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [sellerResults, setSellerResults] = useState<Seller[]>([]);
  const [tagResults, setTagResults] = useState<{ name: string; noteCount: number }[]>([]);
  const [cellarResults, setCellarResults] = useState<CellarItem[]>([]);
  const [allCellar, setAllCellar] = useState<CellarItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [teas, setTeas] = useState<Tea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const filterCallbacks = useMemo(() => ({ setTeas, setIsLoading, setHasSearched }), []);

  const [selectedFlavorTag, setSelectedFlavorTag] = useState<string | null>(null);
  const [flavorTeas, setFlavorTeas] = useState<Tea[]>([]);
  const [isFlavorLoading, setIsFlavorLoading] = useState(false);
  const flavorRequestRef = useRef<number | null>(null);

  const handleFlavorTagClick = useCallback(
    async (tagName: string) => {
      if (selectedFlavorTag === tagName) {
        setSelectedFlavorTag(null);
        setFlavorTeas([]);
        flavorRequestRef.current = null;
        setIsFlavorLoading(false);
        return;
      }

      setSelectedFlavorTag(tagName);
      setIsFlavorLoading(true);

      const requestId = (flavorRequestRef.current ?? 0) + 1;
      flavorRequestRef.current = requestId;

      try {
        const data = await teasApi.getByTags([tagName], 'match', 20);
        if (flavorRequestRef.current === requestId) {
          setFlavorTeas(Array.isArray(data) ? data : []);
        }
      } catch {
        if (flavorRequestRef.current === requestId) {
          setFlavorTeas([]);
        }
      } finally {
        if (flavorRequestRef.current === requestId) {
          setIsFlavorLoading(false);
        }
      }
    },
    [selectedFlavorTag],
  );

  const [popularTeas, setPopularTeas] = useState<Tea[]>([]);
  const [newTeas, setNewTeas] = useState<Tea[]>([]);
  const [curationTeas, setCurationTeas] = useState<Tea[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [popularTags, setPopularTags] = useState<{ name: string; noteCount: number }[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  const fetchSections = useCallback(async () => {
    setSectionsLoading(true);
    const [popularRes, newRes, curationRes, sellersRes, tagsRes] = await Promise.allSettled([
      teasApi.getPopularRankings(10),
      teasApi.getNewRankings(3),
      teasApi.getCuration(3),
      teasApi.getSellers(),
      tagsApi.getPopularTags(15),
    ]);
    if (popularRes.status === 'fulfilled') {
      setPopularTeas(Array.isArray(popularRes.value) ? popularRes.value : []);
    } else {
      logger.error('Failed to fetch popular rankings:', popularRes.reason);
    }
    if (newRes.status === 'fulfilled') {
      setNewTeas(Array.isArray(newRes.value) ? newRes.value : []);
    } else {
      logger.error('Failed to fetch new rankings:', newRes.reason);
    }
    if (curationRes.status === 'fulfilled') {
      setCurationTeas(Array.isArray(curationRes.value) ? curationRes.value : []);
    } else {
      logger.error('Failed to fetch curation:', curationRes.reason);
    }
    if (sellersRes.status === 'fulfilled' && sellersRes.value?.sellers) {
      setSellers(sellersRes.value.sellers);
    } else if (sellersRes.status === 'rejected') {
      logger.error('Failed to fetch sellers:', sellersRes.reason);
    }
    if (tagsRes.status === 'fulfilled' && Array.isArray(tagsRes.value)) {
      setPopularTags(
        tagsRes.value.map((t: { name: string; noteCount: number }) => ({
          name: t.name,
          noteCount: t.noteCount ?? 0,
        })),
      );
    }
    const anyFailed =
      popularRes.status === 'rejected' ||
      newRes.status === 'rejected' ||
      curationRes.status === 'rejected' ||
      sellersRes.status === 'rejected';
    if (anyFailed) {
      toast.error('탐색 데이터를 불러오는데 실패했습니다.');
    }
    setSectionsLoading(false);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) return;

    addSearch(query.trim());

    try {
      setIsLoading(true);
      setHasSearched(true);
      const data = await teasApi.getAll(query);
      setTeas(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error('Search failed:', error);
      toast.error('검색에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [addSearch]);

  const urlTagsStr = searchParams.get('tags') ?? '';

  // 카테고리 변경 시 기본 데이터 로드
  useEffect(() => {
    if (activeTab !== 'search' || searchCategory === 'tea' || searchCategory === 'seller') return;
    setCategoryLoading(true);
    const q = searchQuery.trim().toLowerCase();
    if (searchCategory === 'note') {
      notesApi.getAll(user?.id, undefined, undefined, undefined, undefined, noteSort, 1, 200)
        .then((data: unknown) => {
          const notes: Note[] = Array.isArray(data) ? data : (data as { notes?: Note[] })?.notes ?? [];
          setAllNotes(notes);
          setNoteResults(
            q
              ? notes.filter(
                  (n) =>
                    n.teaName?.toLowerCase().includes(q) ||
                    n.memo?.toLowerCase().includes(q),
                )
              : notes,
          );
        })
        .catch(() => { setAllNotes([]); setNoteResults([]); })
        .finally(() => setCategoryLoading(false));
    } else if (searchCategory === 'tag') {
      tagsApi.getPopularTags(100)
        .then((data) => {
          const tags = Array.isArray(data) ? data : [];
          setTagResults(q ? tags.filter((t) => t.name?.toLowerCase().includes(q)) : tags);
        })
        .catch(() => setTagResults([]))
        .finally(() => setCategoryLoading(false));
    } else if (searchCategory === 'cellar') {
      cellarApi.getAll()
        .then((data: unknown) => {
          const items: CellarItem[] = Array.isArray(data) ? data : [];
          setAllCellar(items);
          setCellarResults(q ? items.filter((c) => c.tea?.name?.toLowerCase().includes(q)) : items);
        })
        .catch(() => { setAllCellar([]); setCellarResults([]); })
        .finally(() => setCategoryLoading(false));
    }
  }, [searchCategory, activeTab, user?.id, noteSort]);

  // 찻집 검색 (서버 사이드, debounce)
  useEffect(() => {
    if (activeTab !== 'search' || searchCategory !== 'seller') return;
    setCategoryLoading(true);
    const q = searchQuery.trim();
    const timeoutId = setTimeout(() => {
      teasApi.getSellers(q || undefined)
        .then((data) => setSellerResults(data?.sellers ?? []))
        .catch(() => setSellerResults([]))
        .finally(() => setCategoryLoading(false));
    }, SEARCH_DEBOUNCE_DELAY);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchCategory, activeTab]);

  // 차록/찻장/향미: 쿼리 변경 시 클라이언트 필터
  useEffect(() => {
    if (activeTab !== 'search') return;
    const q = searchQuery.trim().toLowerCase();
    if (searchCategory === 'note') {
      setNoteResults(
        allNotes.filter((n) => {
          if (q && !n.teaName?.toLowerCase().includes(q) && !n.memo?.toLowerCase().includes(q)) return false;
          if (filterType && n.teaType !== filterType) return false;
          if (filterMinRating != null && (n.overallRating == null || n.overallRating < filterMinRating)) return false;
          if (urlTags.length > 0 && !urlTags.every((tag) => n.tags?.includes(tag))) return false;
          return true;
        }),
      );
    } else if (searchCategory === 'cellar') {
      let filtered = allCellar.filter((c) => {
        if (q && !c.tea?.name?.toLowerCase().includes(q)) return false;
        if (filterType && c.tea?.type !== filterType) return false;
        return true;
      });
      if (cellarSort === 'name') {
        filtered = [...filtered].sort((a, b) => (a.tea?.name ?? '').localeCompare(b.tea?.name ?? ''));
      } else if (cellarSort === 'quantity') {
        filtered = [...filtered].sort((a, b) => b.quantity - a.quantity);
      } else {
        filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      setCellarResults(filtered);
    } else if (searchCategory === 'tag') {
      setTagResults(
        q ? popularTags.filter((t) => t.name?.toLowerCase().includes(q)) : popularTags,
      );
    }
  }, [searchQuery, searchCategory, activeTab, allNotes, allCellar, popularTags, filterType, filterMinRating, urlTagsStr, cellarSort]);

  const noteHasFilters = !!(filterType || filterMinRating != null || urlTags.length > 0);
  const cellarHasFilters = !!filterType;
  const showResults =
    searchCategory === 'tea'
      ? searchQuery.length > 0 || hasSearched || hasFilterParams
      : searchQuery.trim().length >= 2 ||
        (searchCategory === 'note' && noteHasFilters) ||
        (searchCategory === 'cellar' && cellarHasFilters);
  const handleRefresh = useCallback(async () => {
    if (showResults) {
      if (hasTagParams) {
        await fetchWithFilters(
          {
            tags: urlTags,
            sort: ['match', 'popular', 'recent'].includes(filterSort) ? filterSort : 'match',
          },
          { setTeas, setIsLoading },
        );
      } else {
        await fetchWithFilters(
          {
            q: searchQuery || undefined,
            type: filterType || undefined,
            minRating: filterMinRating,
            sort: filterSort,
          },
          { setTeas, setIsLoading },
        );
      }
    } else {
      await fetchSections();
    }
  }, [showResults, hasTagParams, urlTagsStr, searchQuery, filterType, filterMinRating, filterSort, fetchSections, fetchWithFilters]);

  usePullToRefreshForPage(handleRefresh, '/sasaek');

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        handleSearch(searchQuery);
      }, SEARCH_DEBOUNCE_DELAY);

      return () => clearTimeout(timeoutId);
    }
    if (trimmedQuery.length === 0) {
      setHasSearched(false);
      setTeas([]);
    }
  }, [searchQuery, handleSearch]);

  useEffect(() => {
    if (hasFilterParams) {
      setHasSearched(true);
      const urlSort = searchParams.get('sort') as 'popular' | 'new' | 'rating' | 'match' | 'recent' | null;
      const urlType = searchParams.get('type');
      const urlMinRating = searchParams.get('minRating');
      if (hasTagParams) {
        fetchWithFilters(
          {
            tags: urlTags,
            sort: urlSort && ['match', 'popular', 'recent'].includes(urlSort) ? urlSort : 'match',
          },
          { setTeas, setIsLoading },
        );
      } else {
        fetchWithFilters(
          {
            q: searchQuery.trim() || undefined,
            type: urlType || undefined,
            minRating: urlMinRating ? parseFloat(urlMinRating) : undefined,
            sort: urlSort || 'popular',
          },
          { setTeas, setIsLoading },
        );
      }
    }
  }, [hasFilterParams, hasTagParams, urlTagsStr, searchParams, fetchWithFilters, searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim() && !hasSearched && !hasFilterParams) {
      fetchSections();
    }
  }, [searchQuery, hasSearched, hasFilterParams, fetchSections]);

  useEffect(() => {
    if (showResults && popularTags.length === 0) {
      tagsApi.getPopularTags(15).then((data) => {
        setPopularTags(
          (data as { name: string; noteCount: number }[]).map((t) => ({
            name: t.name,
            noteCount: t.noteCount ?? 0,
          })),
        );
      });
    }
  }, [showResults, popularTags.length]);

  const handleApplyFilters = useCallback(() => {
    if (searchCategory === 'tea') {
      applyFilters('tea', searchQuery, filterCallbacks);
    } else {
      setFilterOpen(false);
    }
  }, [applyFilters, searchCategory, searchQuery, filterCallbacks, setFilterOpen]);

  const SECTION_TITLES: Record<string, string> = {
    popular: '🏆 사랑받는 차',
    new: '🆕 신규 차',
    curation: '✨ 맞춤차',
  };
  const resultsTitle =
    urlSection && SECTION_TITLES[urlSection]
      ? SECTION_TITLES[urlSection]
      : urlTags.length > 0
        ? `🔍 #${urlTags.join(', #')} 추천`
        : searchQuery.trim()
          ? '🔍 검색 결과'
          : '🔍 차 탐색';

  const goBackToExplore = useCallback(() => {
    setSearchParams({});
    setSearchQuery('');
    setHasSearched(false);
  }, [setSearchParams]);

  const onTagClick = useCallback(
    (tagName: string) => {
      handleTagClick(tagName);
      setHasSearched(true);
    },
    [handleTagClick],
  );

  return (
    <div className="min-h-screen pb-20 flex flex-col overflow-hidden">
      <Header
        title={showResults ? resultsTitle : '차 탐색'}
        showBack={showResults}
        onBack={showResults ? goBackToExplore : undefined}
        showLogo
        showProfile
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {/* 검색 입력 영역 */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="차 이름, 종류, 구매처로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn('pl-10 rounded-full transition-all', searchQuery ? 'pr-10' : '')}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="검색어 지우기"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {searchQuery.trim().length === 1 && (
            <p className="absolute -bottom-5 left-4 text-xs text-muted-foreground animate-fade-in">
              한 글자 더 입력하면 검색됩니다
            </p>
          )}
        </div>

        {/* 검색/탐색 탭 */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={cn(
              'flex-1 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeTab === 'search'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            검색
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('explore')}
            className={cn(
              'flex-1 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeTab === 'explore'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            탐색
          </button>
        </div>

        {/* 카테고리 선택 */}
        {activeTab === 'search' && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 -mx-1 px-1">
            {SEARCH_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSearchCategory(cat.key)}
                className={cn(
                  'shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors',
                  searchCategory === cat.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* 검색 탭 - 최근 검색어 (필터 위) */}
        {activeTab === 'search' && !showResults && searchQuery.trim().length === 0 && recentSearches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">최근 검색어</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                전체 삭제
              </button>
            </div>
            <ul className="space-y-1">
              {recentSearches.map((term) => (
                <li key={term} className="flex items-center gap-2 py-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(term); handleSearch(term); }}
                    className="flex-1 text-left text-sm truncate"
                  >
                    {term}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSearch(term)}
                    className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`${term} 삭제`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 필터 패널 */}
        {activeTab === 'search' && (searchCategory === 'tea' || searchCategory === 'note' || searchCategory === 'cellar') && (
          <FilterPanel
            category={searchCategory}
            filterOpen={filterOpen}
            setFilterOpen={setFilterOpen}
            activeFilterCount={activeFilterCount}
            filterType={filterType}
            setFilterType={filters.setFilterType}
            filterMinRating={filterMinRating}
            setFilterMinRating={filters.setFilterMinRating}
            filterSort={filterSort}
            setFilterSort={filters.setFilterSort}
            noteSort={noteSort}
            setNoteSort={setNoteSort}
            cellarSort={cellarSort}
            setCellarSort={setCellarSort}
            hasTagParams={hasTagParams}
            urlTags={urlTags}
            popularTags={popularTags}
            handleTagClick={onTagClick}
            onApply={handleApplyFilters}
          />
        )}

        {/* 검색/필터 결과 */}
        {showResults && activeTab === 'search' && (
          <>
            {searchCategory === 'tea' && (
              <>
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TeaCardSkeleton key={i} />
                    ))}
                  </div>
                ) : teas.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">결과 {teas.length}개</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {teas.map((tea, i) => (
                        <div
                          key={tea.id}
                          className="animate-fade-in-up opacity-0"
                          style={{ animationDelay: `${i * 50}ms` }}
                        >
                          <TeaCard tea={tea} />
                        </div>
                      ))}
                    </div>
                  </>
                ) : hasSearched || hasFilterParams ? (
                  <EmptyState
                    type="search"
                    message="검색 결과가 없어요."
                    action={{ label: '검색어 바꿔보기', onClick: goBackToExplore }}
                  />
                ) : null}
              </>
            )}

            {searchCategory === 'note' && (
              <>
                {categoryLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2, 3].map((i) => (
                      <NoteCardSkeleton key={i} />
                    ))}
                  </div>
                ) : noteResults.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">결과 {noteResults.length}개</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {noteResults.map((note) => (
                        <NoteCard key={note.id} note={note} showTeaName />
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState type="search" message="공개된 차록이 없어요." />
                )}
              </>
            )}

            {searchCategory === 'cellar' && (
              <>
                {categoryLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
                    ))}
                  </div>
                ) : cellarResults.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">결과 {cellarResults.length}개</p>
                    <div className="space-y-2">
                      {cellarResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigate(`/cellar/${item.id}`)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/40 transition-colors text-left"
                        >
                          <Package className="w-5 h-5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.tea?.name}</p>
                            {item.tea?.type && (
                              <p className="text-xs text-muted-foreground">{item.tea.type}</p>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground shrink-0">
                            {item.quantity}{item.unit}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState type="search" message="찻장이 비어있어요." />
                )}
              </>
            )}

            {searchCategory === 'seller' && (
              <>
                {categoryLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-9 w-24 rounded-lg bg-muted/50 animate-pulse" />
                    ))}
                  </div>
                ) : sellerResults.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">결과 {sellerResults.length}개</p>
                    <div className="flex flex-wrap gap-2">
                      {sellerResults.map((seller) => (
                        <button
                          key={seller.name}
                          type="button"
                          onClick={() => navigate(`/teahouse/${encodeURIComponent(seller.name)}`)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <Store className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{seller.name}</span>
                          <span className="text-xs text-muted-foreground">{seller.teaCount}종</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState type="search" message="찻집 검색 결과가 없어요." />
                )}
              </>
            )}

            {searchCategory === 'tag' && (
              <>
                {categoryLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-8 w-16 rounded-full bg-muted/50 animate-pulse" />
                    ))}
                  </div>
                ) : tagResults.length > 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">결과 {tagResults.length}개</p>
                    <div className="flex flex-wrap gap-2">
                      {tagResults.map((tag) => (
                        <button
                          key={tag.name}
                          type="button"
                          onClick={() => navigate(`/tag/${encodeURIComponent(tag.name)}`)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border border-border/60 bg-background hover:bg-muted/60 transition-colors"
                        >
                          #{tag.name}
                          {tag.noteCount > 0 && (
                            <span className="text-xs opacity-60">({tag.noteCount})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState type="search" message="향미 검색 결과가 없어요." />
                )}
              </>
            )}

            {searchCategory === 'tea' && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/tea/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                🍵 새 차 등록
              </Button>
            )}
          </>
        )}


        {/* 탐색 섹션 (탐색 탭) */}
        {activeTab === 'explore' && (
          <>
            {sectionsLoading ? (
              <div className="space-y-8">
                <Section title="🏆 사랑받는 차" spacing="lg">
                  <div className={CARD_SKELETON_CONTAINER_CLASSES}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={cn('shrink-0', CARD_WIDTH.WIDE)}>
                        <TeaCardSkeleton />
                      </div>
                    ))}
                  </div>
                </Section>
                <Section title="🆕 신규 차" spacing="lg">
                  <div className={CARD_SKELETON_CONTAINER_CLASSES}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={cn('shrink-0', CARD_WIDTH.WIDE)}>
                        <TeaCardSkeleton />
                      </div>
                    ))}
                  </div>
                </Section>
                <Section title="✨ 맞춤차" spacing="lg">
                  <div className={CARD_SKELETON_CONTAINER_CLASSES}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={cn('shrink-0', CARD_WIDTH.WIDE)}>
                        <TeaCardSkeleton />
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            ) : (
              <div className="space-y-8">
                <Section
                  title="🏆 사랑받는 차"
                  description="차록이 많은 순으로 사랑받는 차를 모았어요."
                  spacing="lg"
                >
                  {popularTeas.length > 0 ? (
                    <div className={CARD_CONTAINER_CLASSES}>
                      {popularTeas.slice(0, 10).map((tea, index) => (
                        <div key={tea.id} className={cn(CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH.WIDE)}>
                          <TeaRankingCard tea={tea} rank={index + 1} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">등록된 차가 없습니다.</p>
                  )}
                </Section>

                <Section
                  title="🆕 신규 차"
                  description="최근에 차멍에 새로 등록된 차예요."
                  spacing="lg"
                >
                  {newTeas.length > 0 ? (
                    <div className={CARD_CONTAINER_CLASSES}>
                      {newTeas.slice(0, 3).map((tea) => (
                        <div key={tea.id} className={cn(CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH.WIDE)}>
                          <TeaNewCard tea={tea} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">등록된 차가 없습니다.</p>
                  )}
                </Section>

                <Section
                  title="🏷️ 향미로 탐색"
                  description="좋아하는 향미를 선택하면 비슷한 차를 추천해드려요."
                  spacing="lg"
                >
                  {popularTags.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {popularTags.slice(0, 15).map((tag) => (
                          <button
                            key={tag.name}
                            type="button"
                            onClick={() => handleFlavorTagClick(tag.name)}
                            className={cn(
                              'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                              selectedFlavorTag === tag.name
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border/60 bg-background hover:bg-muted/80',
                            )}
                          >
                            #{tag.name}
                            {tag.noteCount > 0 && (
                              <span className="text-xs opacity-70">({tag.noteCount})</span>
                            )}
                          </button>
                        ))}
                      </div>
                      {selectedFlavorTag && (
                        <div className="mt-4">
                          {isFlavorLoading ? (
                            <div className={CARD_SKELETON_CONTAINER_CLASSES}>
                              {[1, 2, 3].map((i) => (
                                <div key={i} className={cn('shrink-0', CARD_WIDTH.WIDE)}>
                                  <TeaCardSkeleton />
                                </div>
                              ))}
                            </div>
                          ) : flavorTeas.length > 0 ? (
                            <div className={CARD_CONTAINER_CLASSES}>
                              {flavorTeas.map((tea) => (
                                <div key={tea.id} className={cn(CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH.WIDE)}>
                                  <TeaCard tea={tea} />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground py-3">#{selectedFlavorTag} 향미의 차가 없습니다.</p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">인기 향미를 불러오는 중...</p>
                  )}
                </Section>

                <Section
                  title="✨ 맞춤차"
                  description="다양한 기준으로 엄선한 차 목록이에요."
                  spacing="lg"
                >
                  {curationTeas.length > 0 ? (
                    <div className={CARD_CONTAINER_CLASSES}>
                      {curationTeas.slice(0, 3).map((tea) => (
                        <div key={tea.id} className={cn(CARD_ITEM_WRAPPER_CLASSES, CARD_WIDTH.WIDE)}>
                          <TeaCard tea={tea} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">엄선한 차가 없습니다.</p>
                  )}
                </Section>

<Section
                title="🏪 찻집/다실"
                  description="차를 구매할 수 있는 찻집과 다실을 둘러보세요."
                  spacing="lg"
                >
                  {sellers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {sellers.map((seller) => (
                        <button
                          key={seller.name}
                          onClick={() => navigate(`/teahouse/${encodeURIComponent(seller.name)}`)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left"
                        >
                          <Store className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{seller.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {seller.teaCount}종
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">등록된 찻집이 없습니다.</p>
                  )}
                </Section>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/teahouse/new')}
                  >
                    <Store className="w-4 h-4 mr-2" />
                    찻집 신규추가
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/tea/new')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    새 차 등록
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
