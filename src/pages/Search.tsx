import React, { useState } from 'react';
import { Search as SearchIcon, Plus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { TeaCard } from '../components/TeaCard';
import { EmptyState } from '../components/EmptyState';
import { mockTeas } from '../lib/mockData';
import { filterTeasByQuery } from '../lib/teaSearch';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { BottomNav } from '../components/BottomNav';

export function Search() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 검색어를 기준으로 차 목록 필터링
  const filteredTeas = filterTeasByQuery(mockTeas, searchQuery, {
    fields: ['name', 'type', 'seller'],
  });

  const showResults = searchQuery.length > 0;

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

        {/* 자동완성 제안 */}
        {!showResults && searchQuery && (
          <div className="bg-white border rounded-lg divide-y">
            {mockTeas.slice(0, 3).map(tea => (
              <button
                key={tea.id}
                onClick={() => navigate(`/tea/${tea.id}`)}
                className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
              >
                <p>{tea.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {tea.year && `${tea.year}년`} {tea.type} · {tea.seller}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* 검색 결과 */}
        {showResults && (
          <>
            {isSearching ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : filteredTeas.length > 0 ? (
              <div className="space-y-3">
                {filteredTeas.map(tea => (
                  <TeaCard key={tea.id} tea={tea} />
                ))}
              </div>
            ) : (
              <EmptyState type="search" message="등록된 차가 없습니다." />
            )}

            {/* 새 차 등록 버튼 */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {}}
            >
              <Plus className="w-4 h-4 mr-2" />
              새 차 등록
            </Button>
          </>
        )}

        {/* 초기 안내 상태 */}
        {!searchQuery && (
          <EmptyState type="search" message="검색어를 입력해주세요." />
        )}
      </div>

      <BottomNav />
    </div>
  );
}
