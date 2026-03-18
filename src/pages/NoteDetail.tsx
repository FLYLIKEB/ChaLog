import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Trash2, Globe, Lock, Loader2, Heart, Bookmark, Edit, Flag, Share2 } from 'lucide-react';
import { Header } from '../components/Header';
import { DetailFallback } from '../components/DetailFallback';
import { RatingVisualization } from '../components/RatingVisualization';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { ImageCarousel } from '../components/ImageCarousel';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ReportModal } from '../components/ReportModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Link } from 'react-router-dom';
import { BREW_COLORS } from '../components/BrewColorPicker';
import { notesApi } from '../lib/api';
import { Note, Tea } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { useShare } from '../hooks/useShare';
import { TeaTypeBadge } from '../components/TeaTypeBadge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchWeather, type WeatherInfo } from '../utils/weather';

export function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const noteId = id ? parseInt(id, 10) : NaN;
  const { user, isLoading: isAuthLoading } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [tea, setTea] = useState<Tea | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [use10Scale, setUse10Scale] = useState(false);
  const { share } = useShare();

  const fetchData = useCallback(async () => {
    if (isNaN(noteId)) {
      toast.error('유효하지 않은 차록 ID입니다.');
      return;
    }
    try {
      setIsLoading(true);
      const noteData = await notesApi.getById(noteId);
      const normalizedNote = noteData as Note;
      setNote(normalizedNote);
      setIsLiked(normalizedNote.isLiked ?? false);
      setLikeCount(normalizedNote.likeCount ?? 0);
      setIsBookmarked(normalizedNote.isBookmarked ?? false);
      if (normalizedNote.tea) {
        setTea(normalizedNote.tea);
      }
    } catch (error: any) {
      logger.error('Failed to fetch note:', error);
      if (error?.statusCode === 403) {
        toast.error('이 차록을 볼 권한이 없습니다.');
      } else if (error?.statusCode === 404) {
        toast.error('차록을 찾을 수 없습니다.');
      } else {
        toast.error('차록을 불러오는데 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    if (isDeleted) return;
    fetchData();
  }, [noteId, isDeleted, fetchData]);

  const weatherDateStr = note?.drinkDate
    ? String(note.drinkDate).slice(0, 10)
    : note?.createdAt
      ? (note.createdAt instanceof Date ? note.createdAt.toISOString().slice(0, 10) : String(note.createdAt).slice(0, 10))
      : null;

  useEffect(() => {
    if (!weatherDateStr) return;
    fetchWeather(weatherDateStr).then(setWeather).catch(() => {});
  }, [weatherDateStr]);

  if (isLoading) {
    return (
      <DetailFallback title="차록 상세">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </DetailFallback>
    );
  }

  if (!note) {
    return (
      <DetailFallback 
        title="차록 상세"
        message="차록을 찾을 수 없거나 볼 권한이 없습니다."
      />
    );
  }

  const isMyNote = note.userId === user?.id;

  const handleTogglePublic = async () => {
    if (isNaN(noteId)) {
      toast.error('유효하지 않은 차록 ID입니다.');
      return;
    }

    try {
      setIsUpdating(true);
      await notesApi.update(noteId, { isPublic: !note.isPublic });
      setNote({ ...note, isPublic: !note.isPublic });
      toast.success(note.isPublic ? '차록이 비공개로 전환되었습니다.' : '차록이 공개되었습니다.');
    } catch (error) {
      logger.error('Failed to update note:', error);
      toast.error('업데이트에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (isNaN(noteId)) {
      toast.error('유효하지 않은 차록 ID입니다.');
      return;
    }

    try {
      setIsDeleting(true);
      await notesApi.delete(noteId);
      setIsDeleted(true); // 삭제 상태 설정하여 API 재호출 방지
      toast.success('차록이 삭제되었습니다.');
      // 이전 화면으로 돌아가기
      navigate(-1);
    } catch (error) {
      logger.error('Failed to delete note:', error);
      toast.error('삭제에 실패했습니다.');
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleLikeClick = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (isTogglingLike || isNaN(noteId)) return;

    try {
      setIsTogglingLike(true);
      const result = await notesApi.toggleLike(noteId);
      setIsLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch (error: any) {
      logger.error('Failed to toggle like:', error);
      toast.error('좋아요 처리에 실패했습니다.');
    } finally {
      setIsTogglingLike(false);
    }
  };

  const handleBookmarkClick = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (isTogglingBookmark || isNaN(noteId)) {
      return;
    }

    try {
      setIsTogglingBookmark(true);
      const result = await notesApi.toggleBookmark(noteId);
      setIsBookmarked(result.bookmarked);
    } catch (error: any) {
      logger.error('Failed to toggle bookmark:', error);
      toast.error('북마크 처리에 실패했습니다.');
    } finally {
      setIsTogglingBookmark(false);
    }
  };

  const displayDate = note.drinkDate
    ? new Date(note.drinkDate + 'T00:00:00')
    : note.createdAt instanceof Date
      ? note.createdAt
      : new Date(note.createdAt);
  const dateYear = displayDate.getFullYear();
  const dateMonth = displayDate.getMonth() + 1;
  const dateDay = displayDate.getDate();
  const dateWeekday = ['일', '월', '화', '수', '목', '금', '토'][displayDate.getDay()];

  const brewColor = note.appearance ? BREW_COLORS.find((c) => c.value === note.appearance) : null;

  return (
    <div className="min-h-screen pb-6">
      <Header showBack title="차록" showProfile />

      <div className="p-4">
        {/* 일기장 카드 - 하나의 통합 카드 */}
        <article className="rounded-2xl bg-card border border-[var(--card-border)] overflow-hidden shadow-sm">

          {/* 날짜 헤더 */}
          <div className="px-5 pt-5 pb-3 bg-background/50 dark:bg-muted/20">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">{dateMonth}/{dateDay}</span>
              <span className="text-sm text-muted-foreground">{dateWeekday}요일</span>
              <span className="text-xs text-muted-foreground/60 ml-auto flex items-center gap-1.5">
                {note.isPublic ? (
                  <Globe className="w-3 h-3" />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
                <span>{dateYear}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <button
                onClick={() => navigate(`/user/${note.userId}`)}
                className="text-xs text-muted-foreground/70 hover:text-primary transition-colors"
              >
                {note.userName}
              </button>
            </div>
          </div>

          {/* 날씨 */}
          {weather && (
            <div className="px-5 py-3 bg-muted/30 dark:bg-muted/10">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-lg">{weather.emoji}</span>
                <span className="text-muted-foreground">{weather.label}</span>
                {weather.temperatureMin != null && weather.temperatureMax != null && (
                  <span className="text-muted-foreground">{weather.temperatureMin}°~{weather.temperatureMax}°</span>
                )}
                {weather.humidity != null && (
                  <span className="text-muted-foreground">{weather.humidity}%</span>
                )}
              </div>
            </div>
          )}

          {/* 사진 */}
          {note.images && note.images.length > 0 && (
            <ImageCarousel images={note.images} />
          )}

          {/* 차 정보 */}
          {tea && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/tea/${tea.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/tea/${tea.id}`)}
              className="text-left w-full cursor-pointer px-5 py-3.5 bg-muted/30 dark:bg-muted/10 hover:bg-muted/40 dark:hover:bg-muted/20 transition-colors"
            >
              <h2 className="text-base font-semibold text-foreground">{tea.name}</h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                {tea.type && <TeaTypeBadge type={tea.type} />}
                {tea.year && <span>· {tea.year}년</span>}
                {tea.seller && (
                  <span>
                    ·{' '}
                    <Link
                      to={`/teahouse/${encodeURIComponent(tea.seller)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary hover:underline"
                    >
                      {tea.seller}
                    </Link>
                  </span>
                )}
                {tea.price != null && tea.price > 0 && (
                  <span>· {tea.price.toLocaleString()}원{tea.weight != null && tea.weight > 0 ? ` · ${tea.weight}g` : ''}</span>
                )}
                {tea.weight != null && tea.weight > 0 && (tea.price == null || tea.price <= 0) && (
                  <span>· {tea.weight}g</span>
                )}
              </div>
            </div>
          )}

          {/* 사용 다구 */}
          {note.teaware && (
            <div className="px-5 py-3 bg-muted/30 dark:bg-muted/10">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1">사용 다구</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">{note.teaware.name}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{note.teaware.category}</span>
                {note.teaware.capacity != null && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{note.teaware.capacity}ml</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 평점 */}
          {note.overallRating !== null && (
            <div className="px-5 py-3.5 bg-muted/30 dark:bg-muted/10">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-rating text-rating" />
                <span className="text-xl font-semibold text-foreground">
                  {use10Scale
                    ? (Number(note.overallRating) * 2).toFixed(1)
                    : Number(note.overallRating).toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {use10Scale ? '10' : '5'}
                </span>
              </div>
            </div>
          )}

          {/* 세부 평가 축 */}
          {note.axisValues && note.axisValues.length > 0 && (
            <div className="px-5 py-4 bg-muted/30 dark:bg-muted/10 space-y-4">
              <div className="flex items-center justify-between gap-3">
                {((note.schemas?.length ?? 0) > 0 || note.schema) ? (
                  <div className="rounded-lg bg-muted/30 dark:bg-muted/15 px-3 py-2 flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">템플릿</p>
                    {(note.schemas?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {note.schemas!.map((s) => (
                          <span key={s.id} className="text-xs font-medium text-foreground">{s.nameKo}</span>
                        ))}
                      </div>
                    ) : note.schema && (
                      <span className="text-xs font-medium text-foreground">{note.schema.nameKo}</span>
                    )}
                  </div>
                ) : <div />}
                <div
                  role="group"
                  aria-label="점수 표시 단위"
                  className="flex rounded-lg border border-border/40 bg-muted/20 dark:bg-muted/10 p-0.5"
                >
                  <button
                    type="button"
                    onClick={() => setUse10Scale(false)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      !use10Scale ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    5점
                  </button>
                  <button
                    type="button"
                    onClick={() => setUse10Scale(true)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      use10Scale ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    10점
                  </button>
                </div>
              </div>
              <RatingVisualization axisValues={note.axisValues} use10Scale={use10Scale} />
              <details className="group rounded-lg border border-border/40">
                <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    각 축의 의미
                    <span className="text-xs font-normal opacity-60">(펼치기)</span>
                  </span>
                </summary>
                <div className="px-3 pb-3 pt-2 space-y-2 border-t border-border/30">
                  {[...note.axisValues]
                    .sort((a, b) => (a.axis?.displayOrder ?? 0) - (b.axis?.displayOrder ?? 0))
                    .map((av) => (
                      <div key={av.axisId} className="text-sm">
                        <p className="font-medium text-foreground">{av.axis?.nameKo ?? `축 ${av.axisId}`}</p>
                        {av.axis?.descriptionKo?.trim() && (
                          <p className="text-xs text-muted-foreground mt-0.5">{av.axis.descriptionKo}</p>
                        )}
                      </div>
                    ))}
                </div>
              </details>
            </div>
          )}

          {/* 수색 */}
          {brewColor && (
            <div className="px-5 py-3.5 bg-muted/30 dark:bg-muted/10 flex items-center gap-3">
              <span
                className="inline-block w-6 h-6 rounded-full border border-border/40 shadow-sm"
                style={{ backgroundColor: brewColor.hex }}
              />
              <span className="text-sm text-foreground">{brewColor.label}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 ml-auto">수색</span>
            </div>
          )}

          {/* 향미 태그 */}
          {note.tags && note.tags.length > 0 && (
            <div className="px-5 py-3.5 bg-muted/30 dark:bg-muted/10">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-2">향미</p>
              <div className="flex flex-wrap gap-1.5">
                {note.tags.map((tag, index) => (
                  <Link key={index} to={`/tag/${encodeURIComponent(tag)}`}>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/20 transition-colors text-xs">
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 메모 */}
          {note.memo && (
            <div className="px-5 py-4 bg-muted/30 dark:bg-muted/10">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 mb-2">메모</p>
              <div className="text-sm text-foreground leading-relaxed [&_p]:whitespace-pre-wrap [&_p]:my-1 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-2 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2 [&_blockquote]:text-muted-foreground [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.memo}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* 날씨 한줄 코멘트 (일기장 마무리) */}
          {weather?.teaComment && (
            <div className="px-5 py-3 bg-muted/30 dark:bg-muted/15">
              <p className="text-xs text-muted-foreground/60 italic text-center">
                &ldquo;{weather.teaComment}&rdquo;
              </p>
            </div>
          )}

          {/* 좋아요 / 북마크 / 공유 - 카드 하단 */}
          {user && (
            <div className="flex items-center justify-center gap-1 px-5 py-3 bg-muted/20 dark:bg-muted/10">
              <button
                type="button"
                onClick={handleLikeClick}
                disabled={isTogglingLike}
                className={`min-h-[40px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                  isLiked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
                title={isLiked ? '좋아요 취소' : '좋아요'}
              >
                <Heart className={`w-4.5 h-4.5 transition-all ${isLiked ? 'fill-primary text-primary' : 'fill-none'}`} />
                {likeCount > 0 && <span className="text-xs font-medium">{likeCount}</span>}
              </button>
              <button
                type="button"
                onClick={handleBookmarkClick}
                disabled={isTogglingBookmark}
                className={`min-h-[40px] min-w-[40px] flex items-center justify-center px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                  isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
                title={isBookmarked ? '북마크 해제' : '북마크 추가'}
              >
                <Bookmark className={`w-4.5 h-4.5 transition-all ${isBookmarked ? 'fill-primary text-primary' : 'fill-none'}`} />
              </button>
              <button
                type="button"
                onClick={() => share(tea?.name ?? '차록', window.location.href)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center px-4 py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                title="공유하기"
              >
                <Share2 className="w-4.5 h-4.5" />
              </button>
            </div>
          )}
        </article>

        {/* 카드 밖: 신고 / 수정 / 삭제 */}
        <div className="mt-4 space-y-3">
          {/* 다른 사람 노트일 때 신고 */}
          {user && !isMyNote && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReportModal(true)}
                className="text-muted-foreground hover:text-destructive gap-1.5"
              >
                <Flag className="w-3.5 h-3.5" />
                신고하기
              </Button>
            </div>
          )}

          {/* 내 노트 액션 */}
          {isMyNote && !isAuthLoading && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/note/${noteId}/edit`)}
                className="flex-1 min-h-[44px]"
              >
                <Edit className="w-4 h-4 mr-2" />
                수정
              </Button>
              <Button
                variant="outline"
                onClick={handleTogglePublic}
                className="flex-1 min-h-[44px]"
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  note.isPublic ? '비공개로 전환' : '공개하기'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="min-h-[44px] min-w-[44px] px-3"
                aria-label="삭제"
              >
                <Trash2 className="w-4.5 h-4.5 text-red-500" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 신고 모달 */}
      <ReportModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        noteId={noteId}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>차록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                '삭제'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
