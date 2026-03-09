import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Trash2, Globe, Lock, Loader2, Heart, Bookmark, Edit, Flag } from 'lucide-react';
import { Header } from '../components/Header';
import { DetailFallback } from '../components/DetailFallback';
import { RatingVisualization } from '../components/RatingVisualization';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
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
import { notesApi, teasApi } from '../lib/api';
import { Note, Tea } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';
import { useRegisterRefresh } from '../contexts/PullToRefreshContext';
import { TeaTypeBadge } from '../components/TeaTypeBadge';

export function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const noteId = id ? parseInt(id, 10) : NaN;
  const { user } = useAuth();
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
  const [showReportModal, setShowReportModal] = useState(false);

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
      if (normalizedNote.teaId) {
        try {
          const teaData = await teasApi.getById(normalizedNote.teaId);
          setTea(teaData as Tea);
        } catch (error) {
          logger.error('Failed to fetch tea:', error);
        }
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

  const registerRefresh = useRegisterRefresh();
  useEffect(() => {
    if (!isDeleted) {
      registerRefresh(fetchData);
    } else {
      registerRefresh(undefined);
    }
    return () => registerRefresh(undefined);
  }, [registerRefresh, fetchData, isDeleted]);

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

  return (
    <div className="min-h-screen pb-6">
      <Header showBack title="차록 상세" showProfile />
      
      <div className="p-4 space-y-6">
        {/* 차 정보 요약 */}
        {tea && (
          <section className="bg-card rounded-lg p-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/tea/${tea.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/tea/${tea.id}`)}
              className="text-left w-full cursor-pointer"
            >
              <h2 className="mb-2 text-primary">{tea.name}</h2>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
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
          </section>
        )}

        {/* 평균 평점 */}
        <section className="bg-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {note.overallRating !== null && (
                <div className="flex items-center gap-2">
                  <Star className="w-6 h-6 fill-rating text-rating" />
                  <span className="text-2xl text-primary">{Number(note.overallRating).toFixed(1)}</span>
                </div>
              )}
              <Badge variant={note.isPublic ? 'default' : 'secondary'}>
                {note.isPublic ? (
                  <><Globe className="w-3 h-3 mr-1" /> 공개</>
                ) : (
                  <><Lock className="w-3 h-3 mr-1" /> 비공개</>
                )}
              </Badge>
            </div>
            {user && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLikeClick}
                  disabled={isTogglingLike}
                  className={`min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                    isLiked 
                      ? 'text-primary hover:bg-primary/10' 
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                  title={isLiked ? '좋아요 취소' : '좋아요'}
                >
                  <Heart
                    className={`w-5 h-5 transition-all ${
                      isLiked 
                        ? 'fill-primary text-primary stroke-primary' 
                        : 'fill-none text-muted-foreground stroke-muted-foreground'
                    }`}
                  />
                  {likeCount > 0 && <span className="text-sm font-medium">{likeCount}</span>}
                </button>
                <button
                  type="button"
                  onClick={handleBookmarkClick}
                  disabled={isTogglingBookmark}
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                    isBookmarked 
                      ? 'text-primary hover:bg-primary/10' 
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                  title={isBookmarked ? '북마크 해제' : '북마크 추가'}
                >
                  <Bookmark
                    className={`w-5 h-5 transition-all ${
                      isBookmarked 
                        ? 'fill-primary text-primary stroke-primary' 
                        : 'fill-none text-muted-foreground stroke-muted-foreground'
                    }`}
                  />
                </button>
              </div>
            )}

          </div>
          
          <p className="text-xs text-muted-foreground mb-4">
            {note.createdAt.toLocaleDateString('ko-KR')} ·{' '}
            <button
              onClick={() => navigate(`/user/${note.userId}`)}
              className="hover:text-primary cursor-pointer transition-colors"
            >
              {note.userName}
            </button>
          </p>

          {note.axisValues && note.axisValues.length > 0 && (
            <RatingVisualization axisValues={note.axisValues} />
          )}
        </section>

        {/* 이미지 갤러리 */}
        {note.images && note.images.length > 0 && (
          <section className="bg-card rounded-lg p-4">
            <h3 className="mb-3 text-primary">사진</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 justify-items-center">
              {note.images.map((imageUrl, index) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted w-full max-w-xs">
                  <ImageWithFallback
                    src={imageUrl}
                    alt={`Note image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 태그 */}
        {note.tags && note.tags.length > 0 && (
          <section className="bg-card rounded-lg p-4">
            <h3 className="mb-3 text-primary">향미</h3>
            <div className="flex flex-wrap gap-2">
              {note.tags.map((tag, index) => (
                <Link key={index} to={`/tag/${encodeURIComponent(tag)}`}>
                  <Badge variant="secondary" className="cursor-pointer hover:bg-muted/80 transition-colors">
                    {tag}
                  </Badge>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 메모 */}
        {note.memo && (
          <section className="bg-card rounded-lg p-4">
            <h3 className="mb-3 text-primary">메모</h3>
            <p className="text-foreground whitespace-pre-wrap">{note.memo}</p>
          </section>
        )}

        {/* 다른 사람 노트일 때 신고 버튼 */}
        {user && !isMyNote && (
          <section className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReportModal(true)}
              className="text-muted-foreground hover:text-destructive gap-1.5"
            >
              <Flag className="w-3.5 h-3.5" />
              신고하기
            </Button>
          </section>
        )}

        {/* 내 노트일 때만 노출되는 액션 */}
        {isMyNote && (
          <section className="flex flex-col sm:flex-row gap-3">
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
              className="min-h-[44px] min-w-[44px] px-4"
            >
              <Trash2 className="w-5 h-5 text-red-600" />
            </Button>
          </section>
        )}
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
