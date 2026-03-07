import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { TeaCard } from '../components/TeaCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { DetailFallback } from '../components/DetailFallback';
import { teasApi, notesApi } from '../lib/api';
import { Tea, Note, PopularTag } from '../types';
import { logger } from '../lib/logger';
import { calculateTopTags, MIN_REVIEWS_FOR_TAGS } from '../utils/teaTags';
import { toast } from 'sonner';

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = value >= i + 1;
        const half = !filled && value >= i + 0.5;
        return (
          <Star
            key={i}
            className={`w-4 h-4 ${filled || half ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
          />
        );
      })}
    </div>
  );
}

export function TeaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tea, setTea] = useState<Tea | null>(null);
  const [publicNotes, setPublicNotes] = useState<Note[]>([]);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [topReviews, setTopReviews] = useState<Note[]>([]);
  const [similarTeas, setSimilarTeas] = useState<Tea[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const teaId = parseInt(id, 10);
        if (isNaN(teaId)) {
          toast.error('유효하지 않은 차 ID입니다.');
          return;
        }

        const [teaData, notesData, tagsData, reviewsData, similarData] = await Promise.all([
          teasApi.getById(teaId),
          notesApi.getAll(undefined, true, teaId),
          teasApi.getPopularTags(teaId),
          teasApi.getTopReviews(teaId),
          teasApi.getSimilarTeas(teaId),
        ]);

        setTea(teaData as Tea);
        setPublicNotes(Array.isArray(notesData) ? (notesData as Note[]) : []);
        setPopularTags((tagsData as { tags: PopularTag[] }).tags ?? []);
        setTopReviews(Array.isArray(reviewsData) ? (reviewsData as Note[]) : []);
        setSimilarTeas(Array.isArray(similarData) ? (similarData as Tea[]) : []);
      } catch (error) {
        logger.error('Failed to fetch data:', error);
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

  const topTags = calculateTopTags(publicNotes);
  const maxTagCount = popularTags.length > 0 ? popularTags[0].count : 1;

  const topReviewIds = new Set(topReviews.map((n) => n.id));
  const remainingNotes = publicNotes.filter((n) => !topReviewIds.has(n.id));

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <Header showBack title="차 상세" />

      <div className="p-4 space-y-6">
        {/* 기본 정보 */}
        <section className="bg-white rounded-lg p-4 space-y-3">
          <h1>{tea.name}</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        {/* 평균 평점 */}
        <section className="bg-white rounded-lg p-4">
          <h2 className="mb-3">평균 평점</h2>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-amber-500">
                {Number(tea.averageRating).toFixed(1)}
              </p>
              <p className="text-xs text-gray-400 mt-1">/ 5.0</p>
            </div>
            <div className="space-y-1">
              <StarRating value={Number(tea.averageRating)} />
              <p className="text-xs text-gray-500">{tea.reviewCount}개 리뷰 기반</p>
            </div>
          </div>

          {tea.reviewCount >= MIN_REVIEWS_FOR_TAGS && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">특징 요약</p>
              <div className="flex flex-wrap gap-2">
                {topTags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          {tea.reviewCount < MIN_REVIEWS_FOR_TAGS && (
            <p className="mt-3 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              평가 데이터가 부족합니다. 더 많은 리뷰가 필요해요.
            </p>
          )}
        </section>

        {/* 태그 클라우드 */}
        {popularTags.length > 0 && (
          <section className="bg-white rounded-lg p-4">
            <h2 className="mb-3">자주 사용된 태그</h2>
            <div
              className="flex flex-wrap gap-2"
              data-testid="tag-cloud"
            >
              {popularTags.map((tag) => {
                const ratio = tag.count / maxTagCount;
                const size =
                  ratio >= 0.8
                    ? 'text-base font-semibold'
                    : ratio >= 0.5
                      ? 'text-sm font-medium'
                      : 'text-xs';
                return (
                  <span
                    key={tag.name}
                    className={`inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 ${size}`}
                  >
                    {tag.name}
                    <span className="ml-1 text-emerald-400 text-xs">×{tag.count}</span>
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {/* 대표 리뷰 3개 */}
        {topReviews.length > 0 && (
          <section>
            <h2 className="mb-3">대표 리뷰</h2>
            <div className="space-y-3">
              {topReviews.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          </section>
        )}

        {/* 유사 차 추천 */}
        {similarTeas.length > 0 && (
          <section>
            <h2 className="mb-3">비슷한 차</h2>
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              data-testid="similar-teas"
            >
              {similarTeas.map((similar) => (
                <div key={similar.id} className="min-w-[220px]">
                  <TeaCard tea={similar} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 전체 공개 노트 */}
        <section>
          <h2 className="mb-3">공개 노트 전체</h2>
          {remainingNotes.length > 0 || topReviews.length === 0 ? (
            <div className="space-y-3">
              {(topReviews.length === 0 ? publicNotes : remainingNotes).map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
              {publicNotes.length === 0 && (
                <EmptyState type="feed" message="아직 공개된 노트가 없습니다." />
              )}
            </div>
          ) : (
            <EmptyState type="feed" message="모든 노트가 대표 리뷰에 표시되었습니다." />
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
