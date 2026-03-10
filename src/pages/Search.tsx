import React, { useState, useEffect, useCallback } from 'react';
import { usePullToRefreshForPage } from '../contexts/PullToRefreshContext';
import { Search as SearchIcon, Plus, Loader2, Store, Filter } from 'lucide-react';
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
import { teasApi, tagsApi } from '../lib/api';
import { Tea, Seller } from '../types';
import { toast } from 'sonner';
import { logger } from '../lib/logger';
import { SEARCH_DEBOUNCE_DELAY, TEA_TYPES, TEA_TYPE_COLORS } from '../constants';
import { cn } from '../components/ui/utils';

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

export function Search() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSort = searchParams.get('sort') as 'popular' | 'new' | 'rating' | 'match' | 'recent' | null;
  const urlType = searchParams.get('type');
  const urlMinRating = searchParams.get('minRating');
  const urlTags = searchParams.get('tags')?.split(',').map((t) => t.trim()).filter(Boolean) ?? [];
  const urlTagsStr = urlTags.join(',');
  const urlSection = searchParams.get('section') as 'popular' | 'new' | 'curation' | null;

  const [searchQuery, setSearchQuery] = useState('');
  const [teas, setTeas] = useState<Tea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(() => urlType);
  const [filterMinRating, setFilterMinRating] = useState<number | undefined>(() =>
    urlMinRating ? parseFloat(urlMinRating) : undefined,
  );
  const [filterSort, setFilterSort] = useState<'popular' | 'new' | 'rating' | 'match' | 'recent'>(() =>
    urlSort && ['popular', 'new', 'rating', 'match', 'recent'].includes(urlSort) ? urlSort : 'popular',
  );

  useEffect(() => {
    if (urlType !== null) setFilterType(urlType);
    if (urlMinRating !== null) setFilterMinRating(parseFloat(urlMinRating));
    if (urlSort && ['popular', 'new', 'rating', 'match', 'recent'].includes(urlSort)) setFilterSort(urlSort);
  }, [urlType, urlMinRating, urlSort]);

  const [selectedFlavorTag, setSelectedFlavorTag] = useState<string | null>(null);
  const [flavorTeas, setFlavorTeas] = useState<Tea[]>([]);
  const [isFlavorLoading, setIsFlavorLoading] = useState(false);

  const handleFlavorTagClick = useCallback(async (tagName: string) => {
    if (selectedFlavorTag === tagName) {
      setSelectedFlavorTag(null);
      setFlavorTeas([]);
      return;
    }
    setSelectedFlavorTag(tagName);
    setIsFlavorLoading(true);
    try {
      const data = await teasApi.getByTags([tagName], 'match', 20);
      setFlavorTeas(Array.isArray(data) ? data : []);
    } catch {
      setFlavorTeas([]);
    } finally {
      setIsFlavorLoading(false);
    }
  }, [selectedFlavorTag]);

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
      toast.error('사색 데이터를 불러오는데 실패했습니다.');
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
    async (params: { q?: string; type?: string; minRating?: number; sort?: string; tags?: string[] }) => {
      try {
        setIsLoading(true);
        if (params.tags && params.tags.length > 0) {
          const tagSort = ['match', 'popular', 'recent'].includes(params.sort || '')
            ? (params.sort as 'match' | 'popular' | 'recent')
            : 'match';
          const data = await teasApi.getByTags(params.tags, tagSort, 50);
          setTeas(Array.isArray(data) ? data : []);
        } else {
          const data = await teasApi.getWithFilters({
            q: params.q || undefined,
            type: params.type || undefined,
            minRating: params.minRating,
            sort: (params.sort as 'popular' | 'new' | 'rating') || 'popular',
          });
          setTeas(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        logger.error('Filter failed:', error);
        toast.error('필터 결과를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const hasTagParams = urlTags.length > 0;
  const hasFilterParams = urlSort || urlType || urlMinRating || hasTagParams;
  const showResults = searchQuery.length > 0 || hasSearched || hasFilterParams;
  const handleRefresh = useCallback(async () => {
    if (showResults) {
      if (hasTagParams) {
        await fetchWithFilters({
          tags: urlTags,
          sort: ['match', 'popular', 'recent'].includes(filterSort) ? filterSort : 'match',
        });
      } else {
        await fetchWithFilters({
          q: searchQuery || undefined,
          type: filterType || undefined,
          minRating: filterMinRating,
          sort: filterSort,
        });
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
      fetchAllTeas();
    }
  }, [searchQuery, fetchAllTeas, handleSearch]);

  useEffect(() => {
    if (hasFilterParams) {
      setHasSearched(true);
      if (hasTagParams) {
        fetchWithFilters({
          tags: urlTags,
          sort: urlSort && ['match', 'popular', 'recent'].includes(urlSort) ? urlSort : 'match',
        });
      } else {
        fetchWithFilters({
          q: searchQuery.trim() || undefined,
          type: urlType || undefined,
          minRating: urlMinRating ? parseFloat(urlMinRating) : undefined,
          sort: urlSort || 'popular',
        });
      }
    }
  }, [hasFilterParams, hasTagParams, urlTagsStr, urlSort, urlType, urlMinRating, fetchWithFilters, searchQuery]);

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

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    params.set('sort', filterSort);
    if (filterType) params.set('type', filterType);
    if (filterMinRating != null && !Number.isNaN(filterMinRating))
      params.set('minRating', String(filterMinRating));
    if (urlTags.length > 0) params.set('tags', urlTags.join(','));
    setSearchParams(params);
    setHasSearched(true);
    if (urlTags.length > 0) {
      fetchWithFilters({
        tags: urlTags,
        sort: ['match', 'popular', 'recent'].includes(filterSort) ? filterSort : 'match',
      });
    } else {
      fetchWithFilters({
        q: searchQuery.trim() || undefined,
        type: filterType || undefined,
        minRating: filterMinRating,
        sort: filterSort,
      });
    }
  }, [filterSort, filterType, filterMinRating, searchQuery, urlTags, setSearchParams, fetchWithFilters]);

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
          : '🔍 차 사색';

  const goBackToExplore = useCallback(() => {
    setSearchParams({});
    setSearchQuery('');
    setHasSearched(false);
  }, [setSearchParams]);

  const handleTagClick = useCallback(
    (tagName: string) => {
      const newTags = urlTags.includes(tagName)
        ? urlTags.filter((t) => t !== tagName)
        : [...urlTags, tagName];
      const params = new URLSearchParams();
      if (newTags.length > 0) {
        params.set('tags', newTags.join(','));
        params.set('sort', 'match');
      }
      setSearchParams(params);
      setHasSearched(true);
    },
    [urlTags, setSearchParams],
  );

  return (
    <div className="min-h-screen pb-20 flex flex-col overflow-hidden">
      <Header
        title={showResults ? resultsTitle : '차 사색'}
        showBack={showResults}
        onBack={showResults ? goBackToExplore : undefined}
        showLogo
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
            {/* 향미 태그 선택 */}
            <div>
              <span className="text-sm text-muted-foreground mb-2 block">향미로 검색:</span>
              <div className="flex flex-wrap gap-2">
                {popularTags.slice(0, 12).map((tag) => (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => handleTagClick(tag.name)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      urlTags.includes(tag.name)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border/60 hover:bg-muted/80'
                    }`}
                  >
                    #{tag.name}
                    {tag.noteCount > 0 && (
                      <span className="text-xs opacity-70">({tag.noteCount})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {TEA_TYPES.map((type) => {
                const isSelected = filterType === type;
                const colorClass = TEA_TYPE_COLORS[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setFilterType(isSelected ? null : type);
                    }}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border/60 hover:bg-muted/80',
                    )}
                  >
                    {!isSelected && (
                      <span className={cn('w-1.5 h-5 rounded-full shrink-0', colorClass)} aria-hidden />
                    )}
                    {type}
                  </button>
                );
              })}
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
              {(hasTagParams ? SORT_OPTIONS_WITH_MATCH : SORT_OPTIONS).map((opt) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <TeaCardSkeleton key={i} />
                ))}
              </div>
            ) : teas.length > 0 ? (
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

        {/* 사색 섹션 (검색 전) */}
        {!showResults && (
          <>
            {sectionsLoading ? (
              <div className="space-y-8">
                <Section title="🏆 사랑받는 차" spacing="lg">
                  <div className="flex gap-3 overflow-x-hidden">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="shrink-0 w-[200px]">
                        <TeaCardSkeleton />
                      </div>
                    ))}
                  </div>
                </Section>
                <Section title="🆕 신규 차" spacing="lg">
                  <div className="flex gap-3 overflow-x-hidden">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="shrink-0 w-[300px]">
                        <TeaCardSkeleton />
                      </div>
                    ))}
                  </div>
                </Section>
                <Section title="✨ 맞춤차" spacing="lg">
                  <div className="flex gap-3 overflow-x-hidden">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="shrink-0 w-[200px]">
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
                >
                  {newTeas.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                      {newTeas.slice(0, 3).map((tea) => (
                        <div key={tea.id} className="shrink-0 w-[300px]">
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
                            <div className="flex gap-3 overflow-x-hidden">
                              {[1, 2, 3].map((i) => (
                                <div key={i} className="shrink-0 w-[200px]">
                                  <TeaCardSkeleton />
                                </div>
                              ))}
                            </div>
                          ) : flavorTeas.length > 0 ? (
                            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                              {flavorTeas.map((tea) => (
                                <div key={tea.id} className="shrink-0 w-[200px]">
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
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                      {curationTeas.slice(0, 3).map((tea) => (
                        <div key={tea.id} className="shrink-0 w-[200px]">
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
