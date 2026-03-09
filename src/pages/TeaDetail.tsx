import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, Loader2, Pencil } from 'lucide-react';
import { Header } from '../components/Header';
import { NoteCard } from '../components/NoteCard';
import { TeaCard } from '../components/TeaCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { DetailFallback } from '../components/DetailFallback';
import { teasApi, notesApi } from '../lib/api';
import { Tea, Note, PopularTag } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { calculateTopTags, MIN_REVIEWS_FOR_TAGS } from '../utils/teaTags';
import { toast } from 'sonner';
import { useRegisterRefresh } from '../contexts/PullToRefreshContext';

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const filled = value >= i + 1;
        const half = !filled && value >= i + 0.5;
        return (
          <span key={i} className="relative inline-flex">
            <Star className="w-4 h-4 text-muted" />
            {(filled || half) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: filled ? '100%' : '50%' }}
              >
                <Star className="w-4 h-4 fill-rating text-rating" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function TeaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tea, setTea] = useState<Tea | null>(null);
  const [publicNotes, setPublicNotes] = useState<Note[]>([]);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [topReviews, setTopReviews] = useState<Note[]>([]);
  const [similarTeas, setSimilarTeas] = useState<Tea[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const teaId = parseInt(id, 10);
      if (isNaN(teaId)) {
        toast.error('유효하지 않은 차 ID입니다.');
        return;
      }

      const [teaData, notesData] = await Promise.all([
        teasApi.getById(teaId),
        notesApi.getAll(undefined, true, teaId),
      ]);

      const [tagsResult, reviewsResult, similarResult] = await Promise.allSettled([
        teasApi.getPopularTags(teaId),
        teasApi.getTopReviews(teaId),
        teasApi.getSimilarTeasByTags(teaId, 6),
      ]);

      setTea(teaData as Tea);
      setPublicNotes(Array.isArray(notesData) ? (notesData as Note[]) : []);
      setPopularTags(
        tagsResult.status === 'fulfilled' ? (tagsResult.value as { tags: PopularTag[] }).tags ?? [] : [],
      );
      setTopReviews(
        reviewsResult.status === 'fulfilled' && Array.isArray(reviewsResult.value)
          ? (reviewsResult.value as Note[])
          : [],
      );
      setSimilarTeas(
        similarResult.status === 'fulfilled' && Array.isArray(similarResult.value)
          ? (similarResult.value as Tea[])
          : [],
      );
    } catch (error) {
      logger.error('Failed to fetch data:', error);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const registerRefresh = useRegisterRefresh();
  useEffect(() => {
    registerRefresh(fetchData);
    return () => registerRefresh(undefined);
  }, [registerRefresh, fetchData]);

  if (isLoading) {
    return (
      <DetailFallback title="차 상세">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DetailFallback>
    );
  }

  if (!tea) {
    return (
      <DetailFallback title="차 상세">
        <EmptyState
          type="server"
          message="차 정보를 찾을 수 없어요."
          onRetry={fetchData}
        />
      </DetailFallback>
    );
  }

  const topTags = calculateTopTags(publicNotes);
  const maxTagCount = popularTags.length > 0 ? popularTags[0].count : 1;

  const topReviewIds = new Set(topReviews.map((n) => n.id));
  const remainingNotes = publicNotes.filter((n) => !topReviewIds.has(n.id));

  return (
    <div className="min-h-screen pb-6">
      <Header showBack title="차 상세" showProfile />

      <div className="p-4 space-y-6">
        {/* 기본 정보 */}
        <section className="bg-card rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h1 className="flex-1">{tea.name}</h1>
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/tea/${tea.id}/edit`)}
                className="shrink-0"
                aria-label="차 정보 수정"
              >
                <Pencil className="w-4 h-4 mr-1" />
                수정
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">종류</p>
              <p className="text-sm">{tea.type}</p>
            </div>
            {tea.year && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">연도</p>
                <p className="text-sm">{tea.year}년</p>
              </div>
            )}
            {tea.seller && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">구매처</p>
                <Link
                  to={`/teahouse/${encodeURIComponent(tea.seller)}`}
                  className="text-sm text-primary hover:underline"
                >
                  {tea.seller}
                </Link>
              </div>
            )}
            {tea.origin && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">산지</p>
                <p className="text-sm">{tea.origin}</p>
              </div>
            )}
            {tea.price != null && tea.price > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">가격</p>
                <p className="text-sm">
                  {tea.price.toLocaleString()}원
                  {tea.weight != null && tea.weight > 0 && ` · ${tea.weight}g`}
                </p>
              </div>
            )}
            {tea.weight != null && tea.weight > 0 && (tea.price == null || tea.price <= 0) && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">무게</p>
                <p className="text-sm">{tea.weight}g</p>
              </div>
            )}
          </div>
          {tea.weight != null && tea.weight > 0 && (
            <p className="text-xs text-muted-foreground mt-2">정확한 정보가 아닐 수 있습니다</p>
          )}
        </section>

        {/* 평균 평점 */}
        <section className="bg-card rounded-lg p-4">
          <h2 className="mb-3">평균 평점</h2>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-rating">
                {Number(tea.averageRating).toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">/ 5.0</p>
            </div>
            <div className="space-y-1">
              <StarRating value={Number(tea.averageRating)} />
              <p className="text-xs text-muted-foreground">{tea.reviewCount}개 차록 기반</p>
            </div>
          </div>

          {tea.reviewCount >= MIN_REVIEWS_FOR_TAGS && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">특징 요약</p>
              <div className="flex flex-wrap gap-2">
                {topTags.map((tag) => (
                  <Link key={tag} to={`/tag/${encodeURIComponent(tag)}`}>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-muted/80 transition-colors">{tag}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {tea.reviewCount < MIN_REVIEWS_FOR_TAGS && (
            <p className="mt-3 text-sm text-rating bg-rating/10 p-3 rounded-lg">
              평가 데이터가 부족합니다. 더 많은 차록이 필요해요.
            </p>
          )}
        </section>

        {/* 태그 클라우드 */}
        {popularTags.length > 0 && (
          <section className="bg-card rounded-lg p-4">
            <h2 className="mb-3">자주 사용된 향미</h2>
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
                  <Link
                    key={tag.name}
                    to={`/tag/${encodeURIComponent(tag.name)}`}
                    className={`inline-flex items-center px-3 py-1 rounded-full bg-success/10 text-success hover:bg-success/20 transition-colors ${size}`}
                  >
                    {tag.name}
                    <span className="ml-1 text-success/80 text-xs">×{tag.count}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 대표 차록 3개 */}
        {topReviews.length > 0 && (
          <section>
            <h2 className="mb-3">대표 차록</h2>
            <div className="space-y-3">
              {topReviews.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          </section>
        )}

        {/* 향미가 비슷한 차 - 태그 기반 추천 */}
        {similarTeas.length > 0 && (
          <section>
            <h2 className="mb-3">향미가 비슷한 차</h2>
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
          <h2 className="mb-3">공개 차록 전체</h2>
          {remainingNotes.length > 0 || topReviews.length === 0 ? (
            <div className="space-y-3">
              {(topReviews.length === 0 ? publicNotes : remainingNotes).map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
              {publicNotes.length === 0 && (
                <EmptyState
                type="feed"
                message="아직 공개된 차록이 없어요."
                action={{ label: '차록 작성하기', onClick: () => navigate(`/note/new?teaId=${tea.id}`) }}
              />
              )}
            </div>
          ) : (
            <EmptyState type="feed" message="모든 차록이 대표 차록에 표시되었습니다." />
          )}
        </section>

        {/* 노트 작성 버튼 */}
        <Button
          onClick={() => navigate(`/note/new?teaId=${tea.id}`)}
          className="w-full"
        >
          이 차로 차록 작성하기
        </Button>
      </div>
    </div>
  );
}
