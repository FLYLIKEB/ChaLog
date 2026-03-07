import React, { useState, useEffect, useCallback } from 'react';
import { Search as SearchIcon, Plus, Loader2, Store, ChevronRight, Filter } from 'lucide-react';
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
import { teasApi } from '../lib/api';
import { Tea, Seller } from '../types';
import { toast } from 'sonner';
import { logger } from '../lib/logger';
import { SEARCH_DEBOUNCE_DELAY, TEA_TYPES } from '../constants';

const SORT_OPTIONS = [
  { key: 'popular' as const, label: '인기순' },
  { key: 'new' as const, label: '최신순' },
  { key: 'rating' as const, label: '평점순' },
];

const MIN_RATING_OPTIONS = [
  { value: undefined, label: '전체' },
  { value: 4, label: '4점 이상' },
  { value: 3, label: '3점 이상' },
];

export function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSort = searchParams.get('sort') as 'popular' | 'new' | 'rating' | null;
  const urlType = searchParams.get('type');
  const urlMinRating = searchParams.get('minRating');
  const urlSection = searchParams.get('section') as 'popular' | 'new' | 'curation' | null;

  const [searchQuery, setSearchQuery] = useState('');
  const [teas, setTeas] = useState<Tea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(() => urlType);
  const [filterMinRating, setFilterMinRating] = useState<number | undefined>(() =>
    urlMinRating ? parseFloat(urlMinRating) : undefined,
  );
  const [filterSort, setFilterSort] = useState<'popular' | 'new' | 'rating'>(() =>
    urlSort && ['popular', 'new', 'rating'].includes(urlSort) ? urlSort : 'popular',
  );

  useEffect(() => {
    if (urlType !== null) setFilterType(urlType);
    if (urlMinRating !== null) setFilterMinRating(parseFloat(urlMinRating));
    if (urlSort && ['popular', 'new', 'rating'].includes(urlSort)) setFilterSort(urlSort);
  }, [urlType, urlMinRating, urlSort]);

  const [popularTeas, setPopularTeas] = useState<Tea[]>([]);
  const [newTeas, setNewTeas] = useState<Tea[]>([]);
  const [curationTeas, setCurationTeas] = useState<Tea[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  const fetchSections = useCallback(async () => {
    setSectionsLoading(true);
    const [popularRes, newRes, curationRes, sellersRes] = await Promise.allSettled([
      teasApi.getPopularRankings(10),
      teasApi.getNewRankings(10),
      teasApi.getCuration(10),
      teasApi.getSellers(),
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

  const fetchAllTeas = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await teasApi.getAll();
      setTeas(Array.isArray(data) ? data : []);
      setHasSearched(false);
    } catch (error) {
      logger.error('Failed to fetch teas:', error);
      toast.error('차 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) return;

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
  }, []);

  const fetchWithFilters = useCallback(
    async (params: { q?: string; type?: string; minRating?: number; sort?: string }) => {
      try {
        setIsLoading(true);
        const data = await teasApi.getWithFilters({
          q: params.q || undefined,
          type: params.type || undefined,
          minRating: params.minRating,
          sort: (params.sort as 'popular' | 'new' | 'rating') || 'popular',
        });
        setTeas(Array.isArray(data) ? data : []);
      } catch (error) {
        logger.error('Filter failed:', error);
        toast.error('필터 결과를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        handleSearch(searchQuery);
      }, SEARCH_DEBOUNCE_DELAY);

      return () => clearTimeout(timeoutId);
    }
    if (trimmedQuery.length === 0) {
      fetchAllTeas();
    }
  }, [searchQuery, fetchAllTeas, handleSearch]);

  const hasFilterParams = urlSort || urlType || urlMinRating;
  useEffect(() => {
    if (hasFilterParams) {
      setHasSearched(true);
      fetchWithFilters({
        q: searchQuery.trim() || undefined,
        type: urlType || undefined,
        minRating: urlMinRating ? parseFloat(urlMinRating) : undefined,
        sort: urlSort || 'popular',
      });
    }
  }, [hasFilterParams, urlSort, urlType, urlMinRating, fetchWithFilters, searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim() && !hasSearched && !hasFilterParams) {
      fetchSections();
    }
  }, [searchQuery, hasSearched, hasFilterParams, fetchSections]);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    params.set('sort', filterSort);
    if (filterType) params.set('type', filterType);
    if (filterMinRating != null && !Number.isNaN(filterMinRating))
      params.set('minRating', String(filterMinRating));
    setSearchParams(params);
    setHasSearched(true);
    fetchWithFilters({
      q: searchQuery.trim() || undefined,
      type: filterType || undefined,
      minRating: filterMinRating,
      sort: filterSort,
    });
  }, [filterSort, filterType, filterMinRating, searchQuery, setSearchParams, fetchWithFilters]);

  const showResults = searchQuery.length > 0 || hasSearched || hasFilterParams;

  const SECTION_TITLES: Record<string, string> = {
    popular: '🏆 인기 차 랭킹',
    new: '🆕 신규 차',
    curation: '✨ 추천 큐레이션',
  };
  const resultsTitle =
    urlSection && SECTION_TITLES[urlSection]
      ? SECTION_TITLES[urlSection]
      : searchQuery.trim()
        ? '🔍 검색 결과'
        : '🔍 차 탐색';

  const goBackToExplore = useCallback(() => {
    setSearchParams({});
    setSearchQuery('');
    setHasSearched(false);
  }, [setSearchParams]);

  const handleMorePopular = () => {
    setSearchParams({ sort: 'popular', section: 'popular' });
    setHasSearched(true);
  };
  const handleMoreNew = () => {
    setSearchParams({ sort: 'new', section: 'new' });
    setHasSearched(true);
  };
  const handleMoreCuration = () => {
    setSearchParams({ sort: 'popular', section: 'curation' });
    setHasSearched(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col overflow-hidden">
      <Header
        title={showResults ? resultsTitle : '차 탐색'}
        showBack={showResults}
        onBack={showResults ? goBackToExplore : undefined}
        showLogo={!showResults}
        showProfile
      />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {/* 검색 입력 영역 */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="차 이름, 종류, 구매처로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>

        {/* 필터 패널 */}
        {showResults && (
          <div className="space-y-3 pb-2 border-b border-border/60">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              필터
            </div>
            <div className="flex flex-wrap gap-2">
              {TEA_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setFilterType(filterType === type ? null : type);
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    filterType === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border/60 hover:bg-muted/80'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">평점:</span>
              {MIN_RATING_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setFilterMinRating(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    filterMinRating === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border/60 hover:bg-muted/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">정렬:</span>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setFilterSort(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    filterSort === opt.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border/60 hover:bg-muted/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={applyFilters}>
              적용
            </Button>
          </div>
        )}

        {/* 검색/필터 결과 */}
        {showResults && (
          <>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <TeaCardSkeleton key={i} />
                ))}
              </div>
            ) : teas.length > 0 ? (
              <div className="space-y-3">
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
            ) : (
              <EmptyState
                type="search"
                message="검색 결과가 없어요."
                action={{ label: '검색어 바꿔보기', onClick: goBackToExplore }}
              />
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/tea/new')}
            >
              <Plus className="w-4 h-4 mr-2" />
              🍵 새 차 등록
            </Button>
          </>
        )}

        {/* 탐색 섹션 (검색 전) */}
        {!showResults && (
          <>
            {sectionsLoading ? (
              <div className="space-y-8">
                <Section title="🏆 인기 차 랭킹" spacing="lg">
                  <div className="flex gap-3 overflow-x-hidden">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="shrink-0 w-[200px]">
                        <TeaCardSkeleton />
                      </div>
                    ))}
                  </div>
                </Section>
                <Section title="🆕 신규 차" spacing="lg">
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <TeaCardSkeleton key={i} />
                    ))}
                  </div>
                </Section>
                <Section title="✨ 추천 큐레이션" spacing="lg">
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <TeaCardSkeleton key={i} />
                    ))}
                  </div>
                </Section>
              </div>
            ) : (
              <div className="space-y-8">
                <Section
                  title="🏆 인기 차 랭킹"
                  description="리뷰가 많은 순으로 인기 있는 차를 모았어요."
                  spacing="lg"
                  headerAction={
                    popularTeas.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleMorePopular}
                        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors shrink-0"
                      >
                        더보기 <ChevronRight className="w-4 h-4 ml-0.5" />
                      </button>
                    ) : undefined
                  }
                >
                  {popularTeas.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                      {popularTeas.slice(0, 10).map((tea, index) => (
                        <div key={tea.id} className="shrink-0 w-[200px]">
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
                  headerAction={
                    newTeas.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleMoreNew}
                        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors shrink-0"
                      >
                        더보기 <ChevronRight className="w-4 h-4 ml-0.5" />
                      </button>
                    ) : undefined
                  }
                >
                  {newTeas.length > 0 ? (
                    <div className="space-y-2">
                      {newTeas.slice(0, 5).map((tea) => (
                        <TeaNewCard key={tea.id} tea={tea} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">등록된 차가 없습니다.</p>
                  )}
                </Section>

                <Section
                  title="✨ 추천 큐레이션"
                  description="다양한 기준으로 엄선한 추천 차 목록이에요."
                  spacing="lg"
                  headerAction={
                    curationTeas.length > 0 ? (
                      <button
                        type="button"
                        onClick={handleMoreCuration}
                        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors shrink-0"
                      >
                        더보기 <ChevronRight className="w-4 h-4 ml-0.5" />
                      </button>
                    ) : undefined
                  }
                >
                  {curationTeas.length > 0 ? (
                    <div className="space-y-3">
                      {curationTeas.slice(0, 5).map((tea) => (
                        <TeaCard key={tea.id} tea={tea} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">추천할 차가 없습니다.</p>
                  )}
                </Section>

<Section
                title="🏪 샵/브랜드"
                  description="차를 구매할 수 있는 샵과 브랜드를 둘러보세요."
                  spacing="lg"
                >
                  {sellers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {sellers.map((seller) => (
                        <button
                          key={seller.name}
                          onClick={() => navigate(`/shop/${encodeURIComponent(seller.name)}`)}
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
                    <p className="text-sm text-muted-foreground py-4">등록된 샵이 없습니다.</p>
                  )}
                </Section>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/tea/new')}
                  >
                    <Store className="w-4 h-4 mr-2" />
                    샵 신규추가
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
