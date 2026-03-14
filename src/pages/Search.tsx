import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePullToRefreshForPage } from '../contexts/PullToRefreshContext';
import { useScrollRestoration } from '../hooks/useScrollRestoration';
import { Search as SearchIcon, Clock, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Input } from '../components/ui/input';
import { BottomNav } from '../components/BottomNav';
import { tagsApi, notesApi, cellarApi, teasApi } from '../lib/api';
import { Seller, Note, CellarItem } from '../types';
import { SEARCH_DEBOUNCE_DELAY } from '../constants';
import { cn } from '../components/ui/utils';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { useSearchFilters } from '../hooks/useSearchFilters';
import { useAuth } from '../contexts/AuthContext';
import { useTeaSearch, useTeaSearchDebounce } from '../hooks/useTeaSearch';
import { FilterPanel } from '../components/search/FilterPanel';
import { SearchResults } from '../components/search/SearchResults';
import { ExploreSection } from '../components/search/ExploreSection';

type SearchCategory = 'tea' | 'note' | 'cellar' | 'seller' | 'tag';

const SEARCH_CATEGORIES: { key: SearchCategory; label: string }[] = [
  { key: 'tea', label: '차' },
  { key: 'note', label: '내 차록' },
  { key: 'cellar', label: '찻장' },
  { key: 'seller', label: '찻집' },
  { key: 'tag', label: '향미' },
];

const SECTION_TITLES: Record<string, string> = {
  popular: '🏆 사랑받는 차',
  new: '🆕 신규 차',
  curation: '✨ 맞춤차',
};

export function Search() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useScrollRestoration(scrollContainerRef);

  const [searchParams, setSearchParams] = useSearchParams();

  const { user } = useAuth();
  const { recentSearches, addSearch, removeSearch, clearAll } = useRecentSearches();
  const filters = useSearchFilters();
  const {
    filterType, filterMinRating, filterPriceRange, filterSellerName,
    filterSort, noteSort, setNoteSort,
    filterOpen, setFilterOpen, activeFilterCount,
    urlTags, hasTagParams, hasFilterParams,
    handleTagClick, applyFilters, fetchWithFilters,
  } = filters;

  const {
    teas, isLoading, hasSearched,
    setTeas, setIsLoading, setHasSearched,
    search, reset: resetSearch,
    popularTeas, newTeas, curationTeas, sellers,
    popularTags, sectionsLoading, fetchSections,
    selectedFlavorTag, flavorTeas, isFlavorLoading, handleFlavorTagClick,
  } = useTeaSearch();

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

  const filterCallbacks = useMemo(
    () => ({ setTeas, setIsLoading, setHasSearched }),
    [setTeas, setIsLoading, setHasSearched],
  );
  const urlTagsStr = searchParams.get('tags') ?? '';

  useTeaSearchDebounce(searchQuery, search, addSearch, resetSearch);

  useEffect(() => {
    if (activeTab !== 'search' || searchCategory === 'tea' || searchCategory === 'seller') return;
    setCategoryLoading(true);
    const q = searchQuery.trim().toLowerCase();
    if (searchCategory === 'note') {
      notesApi.getAll(user?.id, undefined, undefined, undefined, undefined, noteSort, 1, 200)
        .then((data: unknown) => {
          const notes: Note[] = Array.isArray(data)
            ? data
            : (data as { data?: Note[] })?.data ?? (data as { notes?: Note[] })?.notes ?? [];
          setAllNotes(notes);
          setNoteResults(q ? notes.filter((n) => n.teaName?.toLowerCase().includes(q) || n.memo?.toLowerCase().includes(q)) : notes);
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

  useEffect(() => {
    if (activeTab !== 'search' || searchCategory !== 'seller') return;
    setCategoryLoading(true);
    const q = searchQuery.trim();
    const id = setTimeout(() => {
      teasApi.getSellers(q || undefined)
        .then((data) => setSellerResults(data?.sellers ?? []))
        .catch(() => setSellerResults([]))
        .finally(() => setCategoryLoading(false));
    }, SEARCH_DEBOUNCE_DELAY);
    return () => clearTimeout(id);
  }, [searchQuery, searchCategory, activeTab]);

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
      if (cellarSort === 'name') filtered = [...filtered].sort((a, b) => (a.tea?.name ?? '').localeCompare(b.tea?.name ?? ''));
      else if (cellarSort === 'quantity') filtered = [...filtered].sort((a, b) => b.quantity - a.quantity);
      else filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCellarResults(filtered);
    } else if (searchCategory === 'tag') {
      setTagResults(q ? popularTags.filter((t) => t.name?.toLowerCase().includes(q)) : popularTags);
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
        await fetchWithFilters({ tags: urlTags, sort: ['match', 'popular', 'recent'].includes(filterSort) ? filterSort : 'match' }, { setTeas, setIsLoading });
      } else {
        await fetchWithFilters({ q: searchQuery || undefined, type: filterType || undefined, minRating: filterMinRating, sort: filterSort }, { setTeas, setIsLoading });
      }
    } else {
      await fetchSections();
    }
  }, [showResults, hasTagParams, urlTagsStr, searchQuery, filterType, filterMinRating, filterSort, fetchSections, fetchWithFilters, setTeas, setIsLoading, urlTags]);

  usePullToRefreshForPage(handleRefresh, '/sasaek');

  useEffect(() => {
    if (hasFilterParams) {
      setHasSearched(true);
      const urlSort = searchParams.get('sort') as 'popular' | 'new' | 'rating' | 'match' | 'recent' | null;
      const urlType = searchParams.get('type');
      const urlMinRating = searchParams.get('minRating');
      if (hasTagParams) {
        fetchWithFilters({ tags: urlTags, sort: urlSort && ['match', 'popular', 'recent'].includes(urlSort) ? urlSort : 'match' }, { setTeas, setIsLoading });
      } else {
        fetchWithFilters({ q: searchQuery.trim() || undefined, type: urlType || undefined, minRating: urlMinRating ? parseFloat(urlMinRating) : undefined, sort: urlSort || 'popular' }, { setTeas, setIsLoading });
      }
    }
  }, [hasFilterParams, hasTagParams, urlTagsStr, searchParams, fetchWithFilters, searchQuery, setTeas, setIsLoading, setHasSearched, urlTags]);

  useEffect(() => {
    if (!searchQuery.trim() && !hasSearched && !hasFilterParams) {
      fetchSections();
    }
  }, [searchQuery, hasSearched, hasFilterParams, fetchSections]);

  const handleApplyFilters = useCallback(() => {
    if (searchCategory === 'tea') {
      applyFilters('tea', searchQuery, filterCallbacks);
    } else {
      setFilterOpen(false);
    }
  }, [applyFilters, searchCategory, searchQuery, filterCallbacks, setFilterOpen]);

  const urlSection = searchParams.get('section') as 'popular' | 'new' | 'curation' | null;
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
  }, [setSearchParams, setHasSearched]);

  const onTagClick = useCallback(
    (tagName: string) => {
      handleTagClick(tagName);
      setHasSearched(true);
    },
    [handleTagClick, setHasSearched],
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

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
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

        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {(['search', 'explore'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 py-1.5 text-sm font-medium rounded-md transition-colors',
                activeTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab === 'search' ? '검색' : '탐색'}
            </button>
          ))}
        </div>

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

        {activeTab === 'search' && !showResults && searchQuery.trim().length === 0 && recentSearches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">최근 검색어</span>
              <button type="button" onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                전체 삭제
              </button>
            </div>
            <ul className="space-y-1">
              {recentSearches.map((term) => (
                <li key={term} className="flex items-center gap-2 py-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(term); search(term, addSearch); }}
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
            filterPriceRange={filterPriceRange}
            setFilterPriceRange={filters.setFilterPriceRange}
            filterSellerName={filterSellerName}
            setFilterSellerName={filters.setFilterSellerName}
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

        {showResults && activeTab === 'search' && (
          <SearchResults
            searchCategory={searchCategory}
            isLoading={isLoading}
            categoryLoading={categoryLoading}
            teas={teas}
            noteResults={noteResults}
            cellarResults={cellarResults}
            sellerResults={sellerResults}
            tagResults={tagResults}
            hasSearched={hasSearched}
            hasFilterParams={hasFilterParams}
            onGoBack={goBackToExplore}
          />
        )}

        {activeTab === 'explore' && (
          <ExploreSection
            sectionsLoading={sectionsLoading}
            popularTeas={popularTeas}
            newTeas={newTeas}
            curationTeas={curationTeas}
            sellers={sellers}
            popularTags={popularTags}
            selectedFlavorTag={selectedFlavorTag}
            flavorTeas={flavorTeas}
            isFlavorLoading={isFlavorLoading}
            onFlavorTagClick={handleFlavorTagClick}
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
