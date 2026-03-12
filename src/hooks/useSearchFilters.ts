import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { teasApi } from '../lib/api';
import { Tea } from '../types';
import { logger } from '../lib/logger';
import { toast } from 'sonner';

type TeaSort = 'popular' | 'new' | 'rating' | 'match' | 'recent';
type NoteSort = 'latest' | 'rating';
export type PriceRange = 'under5k' | '5k-10k' | 'over10k';

export const PRICE_RANGE_MAP: Record<PriceRange, { minPrice?: number; maxPrice?: number }> = {
  'under5k': { maxPrice: 5000 },
  '5k-10k': { minPrice: 5000, maxPrice: 10000 },
  'over10k': { minPrice: 10000 },
};

interface UseSearchFiltersReturn {
  filterType: string | null;
  setFilterType: (type: string | null) => void;
  filterMinRating: number | undefined;
  setFilterMinRating: (rating: number | undefined) => void;
  filterPriceRange: PriceRange | null;
  setFilterPriceRange: (range: PriceRange | null) => void;
  filterSellerName: string;
  setFilterSellerName: (name: string) => void;
  filterSort: TeaSort;
  setFilterSort: (sort: TeaSort) => void;
  noteSort: NoteSort;
  setNoteSort: (sort: NoteSort) => void;
  filterOpen: boolean;
  setFilterOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  activeFilterCount: number;
  urlTags: string[];
  hasTagParams: boolean;
  hasFilterParams: boolean;
  handleTagClick: (tagName: string) => void;
  applyFilters: (
    category: 'tea' | 'note',
    searchQuery: string,
    callbacks: {
      setTeas: (teas: Tea[]) => void;
      setIsLoading: (loading: boolean) => void;
      setHasSearched: (searched: boolean) => void;
    },
  ) => void;
  fetchWithFilters: (
    params: {
      q?: string;
      type?: string;
      minRating?: number;
      minPrice?: number;
      maxPrice?: number;
      sellerName?: string;
      sort?: string;
      tags?: string[];
    },
    callbacks: {
      setTeas: (teas: Tea[]) => void;
      setIsLoading: (loading: boolean) => void;
    },
  ) => Promise<void>;
}

export function useSearchFilters(): UseSearchFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSort = searchParams.get('sort') as TeaSort | null;
  const urlType = searchParams.get('type');
  const urlMinRating = searchParams.get('minRating');
  const urlPriceRange = searchParams.get('priceRange') as PriceRange | null;
  const urlSellerName = searchParams.get('sellerName') ?? '';
  const urlTagsStr = searchParams.get('tags') ?? '';
  const urlTags = useMemo(
    () => urlTagsStr.split(',').map((t) => t.trim()).filter(Boolean),
    [urlTagsStr],
  );

  const [filterType, setFilterType] = useState<string | null>(() => urlType);
  const [filterMinRating, setFilterMinRating] = useState<number | undefined>(() =>
    urlMinRating ? parseFloat(urlMinRating) : undefined,
  );
  const [filterPriceRange, setFilterPriceRange] = useState<PriceRange | null>(() => urlPriceRange);
  const [filterSellerName, setFilterSellerName] = useState<string>(() => urlSellerName);
  const [filterSort, setFilterSort] = useState<TeaSort>(() =>
    urlSort && ['popular', 'new', 'rating', 'match', 'recent'].includes(urlSort) ? urlSort : 'popular',
  );
  const [noteSort, setNoteSort] = useState<NoteSort>('latest');
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (urlType !== null) setFilterType(urlType);
    if (urlMinRating !== null) setFilterMinRating(parseFloat(urlMinRating));
    if (urlPriceRange !== null) setFilterPriceRange(urlPriceRange);
    if (urlSellerName) setFilterSellerName(urlSellerName);
    if (urlSort && ['popular', 'new', 'rating', 'match', 'recent'].includes(urlSort)) setFilterSort(urlSort);
  }, [urlType, urlMinRating, urlPriceRange, urlSellerName, urlSort]);

  const hasTagParams = urlTags.length > 0;
  const hasFilterParams = !!(urlSort || urlType || urlMinRating || urlPriceRange || urlSellerName || hasTagParams);
  const activeFilterCount = [
    filterType != null,
    filterMinRating != null,
    filterPriceRange != null,
    filterSellerName.trim() !== '',
    urlTags.length > 0,
  ].filter(Boolean).length;

  useEffect(() => {
    if (hasFilterParams) setFilterOpen(true);
  }, [hasFilterParams]);

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
    },
    [urlTags, setSearchParams],
  );

  const fetchWithFilters = useCallback(
    async (
      params: {
        q?: string;
        type?: string;
        minRating?: number;
        minPrice?: number;
        maxPrice?: number;
        sellerName?: string;
        sort?: string;
        tags?: string[];
      },
      callbacks: {
        setTeas: (teas: Tea[]) => void;
        setIsLoading: (loading: boolean) => void;
      },
    ) => {
      try {
        callbacks.setIsLoading(true);
        if (params.tags && params.tags.length > 0) {
          const tagSort = ['match', 'popular', 'recent'].includes(params.sort || '')
            ? (params.sort as 'match' | 'popular' | 'recent')
            : 'match';
          const data = await teasApi.getByTags(params.tags, tagSort, 50);
          callbacks.setTeas(Array.isArray(data) ? data : []);
        } else {
          const data = await teasApi.getWithFilters({
            q: params.q || undefined,
            type: params.type || undefined,
            minRating: params.minRating,
            minPrice: params.minPrice,
            maxPrice: params.maxPrice,
            sellerName: params.sellerName || undefined,
            sort: (params.sort as 'popular' | 'new' | 'rating') || 'popular',
          });
          callbacks.setTeas(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        logger.error('Filter failed:', error);
        toast.error('필터 결과를 불러오는데 실패했습니다.');
      } finally {
        callbacks.setIsLoading(false);
      }
    },
    [],
  );

  const applyFilters = useCallback(
    (
      category: 'tea' | 'note',
      searchQuery: string,
      callbacks: {
        setTeas: (teas: Tea[]) => void;
        setIsLoading: (loading: boolean) => void;
        setHasSearched: (searched: boolean) => void;
      },
    ) => {
      if (category === 'tea') {
        const params = new URLSearchParams();
        params.set('sort', filterSort);
        if (filterType) params.set('type', filterType);
        if (filterMinRating != null && !Number.isNaN(filterMinRating))
          params.set('minRating', String(filterMinRating));
        if (filterPriceRange) params.set('priceRange', filterPriceRange);
        if (filterSellerName.trim()) params.set('sellerName', filterSellerName.trim());
        if (urlTags.length > 0) params.set('tags', urlTags.join(','));
        setSearchParams(params);
        callbacks.setHasSearched(true);
        if (urlTags.length > 0) {
          fetchWithFilters(
            {
              tags: urlTags,
              sort: ['match', 'popular', 'recent'].includes(filterSort) ? filterSort : 'match',
            },
            callbacks,
          );
        } else {
          const priceParams = filterPriceRange ? PRICE_RANGE_MAP[filterPriceRange] : {};
          fetchWithFilters(
            {
              q: searchQuery.trim() || undefined,
              type: filterType || undefined,
              minRating: filterMinRating,
              sort: filterSort,
              ...priceParams,
              sellerName: filterSellerName.trim() || undefined,
            },
            callbacks,
          );
        }
      } else {
        setFilterOpen(false);
      }
    },
    [filterSort, filterType, filterMinRating, filterPriceRange, filterSellerName, urlTags, setSearchParams, fetchWithFilters],
  );

  return {
    filterType,
    setFilterType,
    filterMinRating,
    setFilterMinRating,
    filterPriceRange,
    setFilterPriceRange,
    filterSellerName,
    setFilterSellerName,
    filterSort,
    setFilterSort,
    noteSort,
    setNoteSort,
    filterOpen,
    setFilterOpen,
    activeFilterCount,
    urlTags,
    hasTagParams,
    hasFilterParams,
    handleTagClick,
    applyFilters,
    fetchWithFilters,
  };
}
