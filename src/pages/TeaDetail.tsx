import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { DetailFallback } from '../components/DetailFallback';
import { mockTeas, mockNotes } from '../lib/mockData';

export function TeaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const tea = mockTeas.find(t => t.id === id);
  const publicNotes = mockNotes.filter(note => note.teaId === id && note.isPublic);

  if (!tea) {
    return (
      <DetailFallback title="차 상세">
        <EmptyState type="server" message="차 정보를 찾을 수 없습니다." />
      </DetailFallback>
    );
  }

  // 노트 데이터를 바탕으로 상위 태그 계산
  const topTags = ['깨끗함', '부드러움', '복합적'];

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <Header showBack title="차 상세" />
      
      <div className="p-4 space-y-6">
        {/* 차 기본 정보 */}
        <section className="bg-white rounded-lg p-4 space-y-3">
          <h1>{tea.name}</h1>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">종류</p>
              <p className="text-sm">{tea.type}</p>
            </div>
            {tea.year && (
              <div>
                <p className="text-xs text-gray-500 mb-1">연도</p>
                <p className="text-sm">{tea.year}년</p>
              </div>
            )}
            {tea.seller && (
              <div>
                <p className="text-xs text-gray-500 mb-1">구매처</p>
                <p className="text-sm">{tea.seller}</p>
              </div>
            )}
            {tea.origin && (
              <div>
                <p className="text-xs text-gray-500 mb-1">산지</p>
                <p className="text-sm">{tea.origin}</p>
              </div>
            )}
          </div>
        </section>

        {/* 평점 요약 */}
        <section className="bg-white rounded-lg p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                <span className="text-2xl">{tea.averageRating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-gray-500">{tea.reviewCount}개 리뷰</p>
            </div>
            
            {tea.reviewCount >= 3 && (
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-2">주요 특징</p>
                <div className="flex flex-wrap gap-2">
                  {topTags.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {tea.reviewCount < 3 && (
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              평가 데이터가 부족합니다. 더 많은 리뷰가 필요해요.
            </p>
          )}
        </section>

        {/* 공개 노트 */}
        <section>
          <h2 className="mb-3">공개 노트</h2>
          {publicNotes.length > 0 ? (
            <div className="space-y-3">
              {publicNotes.map(note => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          ) : (
            <EmptyState type="feed" message="아직 공개된 노트가 없습니다." />
          )}
        </section>

        {/* 노트 작성 버튼 */}
        <Button
          onClick={() => navigate(`/note/new?teaId=${tea.id}`)}
          className="w-full"
        >
          이 차로 노트 작성하기
        </Button>
      </div>
    </div>
  );
}
