import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { DetailFallback } from '../components/DetailFallback';
import { teasApi, notesApi } from '../lib/api';
import { Tea, Note } from '../types';
import { toast } from 'sonner';

export function TeaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tea, setTea] = useState<Tea | null>(null);
  const [publicNotes, setPublicNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const [teaData, notesData] = await Promise.all([
          teasApi.getById(id),
          notesApi.getAll(undefined, true),
        ]);

        setTea(teaData as Tea);
        
        // 해당 차의 공개 노트만 필터링
        const notesArray = Array.isArray(notesData) ? notesData : [];
        // API 레이어에서 이미 정규화 및 날짜 변환이 완료됨
        const filteredNotes = notesArray
          .filter((note: any) => note.teaId === id) as Note[];
        setPublicNotes(filteredNotes);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <DetailFallback title="차 상세">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </DetailFallback>
    );
  }

  if (!tea) {
    return (
      <DetailFallback title="차 상세">
        <EmptyState type="server" message="차 정보를 찾을 수 없습니다." />
      </DetailFallback>
    );
  }

  // 노트 데이터를 바탕으로 상위 태그 계산
  const calculateTopTags = (notes: Note[]): string[] => {
    if (notes.length === 0) {
      return ['깨끗함', '부드러움', '복합적']; // 기본 fallback
    }

    // 각 특성별 평균값 계산
    const tagMap: Record<string, { sum: number; count: number }> = {
      풍부함: { sum: 0, count: 0 },
      강함: { sum: 0, count: 0 },
      부드러움: { sum: 0, count: 0 },
      깨끗함: { sum: 0, count: 0 },
      복합적: { sum: 0, count: 0 },
    };

    notes.forEach(note => {
      if (note.ratings) {
        tagMap['풍부함'].sum += note.ratings.richness;
        tagMap['풍부함'].count += 1;
        tagMap['강함'].sum += note.ratings.strength;
        tagMap['강함'].count += 1;
        tagMap['부드러움'].sum += note.ratings.smoothness;
        tagMap['부드러움'].count += 1;
        tagMap['깨끗함'].sum += note.ratings.clarity;
        tagMap['깨끗함'].count += 1;
        tagMap['복합적'].sum += note.ratings.complexity;
        tagMap['복합적'].count += 1;
      }
    });

    // 평균값 계산 및 정렬
    const tagAverages = Object.entries(tagMap)
      .map(([tag, data]) => ({
        tag,
        average: data.count > 0 ? data.sum / data.count : 0,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 3)
      .map(item => item.tag);

    return tagAverages.length > 0 ? tagAverages : ['깨끗함', '부드러움', '복합적'];
  };

  const topTags = calculateTopTags(publicNotes);

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
                <span className="text-2xl">{Number(tea.averageRating).toFixed(1)}</span>
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
