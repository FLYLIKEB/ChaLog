import React, { useState, useEffect, useCallback } from 'react';
import { Search as SearchIcon, Plus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { TeaCard } from '../components/TeaCard';
import { EmptyState } from '../components/EmptyState';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { BottomNav } from '../components/BottomNav';
import { teasApi } from '../lib/api';
import { Tea } from '../types';
import { toast } from 'sonner';
import { logger } from '../lib/logger';
import { SEARCH_DEBOUNCE_DELAY } from '../constants';

export function Search() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [teas, setTeas] = useState<Tea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
    if (!query.trim()) return;

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

  useEffect(() => {
    // 초기 로드 시 모든 차 목록 가져오기
    fetchAllTeas();
  }, [fetchAllTeas]);

  useEffect(() => {
    // 검색어가 변경될 때마다 검색 실행
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        handleSearch(searchQuery);
      }, SEARCH_DEBOUNCE_DELAY);

      return () => clearTimeout(timeoutId);
    } else {
      // 검색어가 비어있으면 전체 목록 표시
      fetchAllTeas();
    }
  }, [searchQuery, fetchAllTeas, handleSearch]);

  const showResults = searchQuery.length > 0 || hasSearched;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="차 검색" />
      
      <div className="p-4 space-y-4">
        {/* 검색 입력 영역 */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="차 이름, 종류, 구매처로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 검색 결과 */}
        {showResults && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : teas.length > 0 ? (
              <div className="space-y-3">
                {teas.map(tea => (
                  <TeaCard key={tea.id} tea={tea} />
                ))}
              </div>
            ) : (
              <EmptyState type="search" message="검색 결과가 없습니다." />
            )}

            {/* 새 차 등록 버튼 */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                toast.info('새 차 등록 기능은 준비 중입니다.');
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              새 차 등록
            </Button>
          </>
        )}

        {/* 초기 안내 상태 */}
        {!showResults && (
          <EmptyState type="search" message="검색어를 입력해주세요." />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
