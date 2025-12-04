import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Trash2, Globe, Lock, Loader2, Heart, Bookmark } from 'lucide-react';
import { Header } from '../components/Header';
import { DetailFallback } from '../components/DetailFallback';
import { RatingVisualization } from '../components/RatingVisualization';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
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
import { notesApi, teasApi } from '../lib/api';
import { Note, Tea } from '../types';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../lib/logger';

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

  useEffect(() => {
    // 삭제된 노트는 API 호출하지 않음
    if (isDeleted) {
      return;
    }

    const fetchData = async () => {
      if (isNaN(noteId)) {
        toast.error('유효하지 않은 노트 ID입니다.');
        return;
      }

      try {
        setIsLoading(true);
        const noteData = await notesApi.getById(noteId);
        // API 레이어에서 이미 정규화 및 날짜 변환이 완료됨
        const normalizedNote = noteData as Note;
        setNote(normalizedNote);
        setIsLiked(normalizedNote.isLiked ?? false);
        setLikeCount(normalizedNote.likeCount ?? 0);
        setIsBookmarked(normalizedNote.isBookmarked ?? false);

        // 차 정보 가져오기
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
        
        // 403 에러인 경우 권한 없음 메시지 표시
        if (error?.statusCode === 403) {
          toast.error('이 노트를 볼 권한이 없습니다.');
        } else if (error?.statusCode === 404) {
          toast.error('노트를 찾을 수 없습니다.');
        } else {
          toast.error('노트를 불러오는데 실패했습니다.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [noteId, isDeleted]);

  if (isLoading) {
    return (
      <DetailFallback title="노트 상세">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </DetailFallback>
    );
  }

  if (!note) {
    return (
      <DetailFallback 
        title="노트 상세" 
        message="노트를 찾을 수 없거나 볼 권한이 없습니다." 
      />
    );
  }

  const isMyNote = note.userId === user?.id;

  const handleTogglePublic = async () => {
    if (isNaN(noteId)) {
      toast.error('유효하지 않은 노트 ID입니다.');
      return;
    }

    try {
      setIsUpdating(true);
      await notesApi.update(noteId, { isPublic: !note.isPublic });
      setNote({ ...note, isPublic: !note.isPublic });
      toast.success(note.isPublic ? '노트가 비공개로 전환되었습니다.' : '노트가 공개되었습니다.');
    } catch (error) {
      logger.error('Failed to update note:', error);
      toast.error('업데이트에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (isNaN(noteId)) {
      toast.error('유효하지 않은 노트 ID입니다.');
      return;
    }

    try {
      setIsDeleting(true);
      await notesApi.delete(noteId);
      setIsDeleted(true); // 삭제 상태 설정하여 API 재호출 방지
      toast.success('노트가 삭제되었습니다.');
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

    if (isTogglingBookmark || isNaN(noteId)) return;

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
    <div className="min-h-screen bg-gray-50 pb-6">
      <Header showBack title="노트 상세" />
      
      <div className="p-4 space-y-6">
        {/* 차 정보 요약 */}
        {tea && (
          <section className="bg-white rounded-lg p-4">
            <button
              onClick={() => navigate(`/tea/${tea.id}`)}
              className="text-left w-full"
            >
              <h2 className="mb-2">{tea.name}</h2>
              <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                <span>{tea.type}</span>
                {tea.year && <span>· {tea.year}년</span>}
                {tea.seller && <span>· {tea.seller}</span>}
              </div>
            </button>
          </section>
        )}

        {/* 평균 평점 */}
        <section className="bg-white rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                <span className="text-2xl">{Number(note.rating).toFixed(1)}</span>
              </div>
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
                  onClick={handleLikeClick}
                  disabled={isTogglingLike}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <Heart
                    className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
                  />
                  {likeCount > 0 && <span className="text-sm font-medium">{likeCount}</span>}
                </button>
                <button
                  onClick={handleBookmarkClick}
                  disabled={isTogglingBookmark}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <Bookmark
                    className={`w-5 h-5 ${isBookmarked ? 'fill-blue-500 text-blue-500' : ''}`}
                  />
                </button>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mb-4">
            {note.createdAt.toLocaleDateString('ko-KR')} · {note.userName}
          </p>

          <RatingVisualization ratings={note.ratings} />
        </section>

        {/* 이미지 갤러리 */}
        {note.images && note.images.length > 0 && (
          <section className="bg-white rounded-lg p-4">
            <h3 className="mb-3">사진</h3>
            <div className="grid grid-cols-2 gap-3 justify-items-center">
              {note.images.map((imageUrl, index) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100 w-full max-w-xs">
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
          <section className="bg-white rounded-lg p-4">
            <h3 className="mb-3">태그</h3>
            <div className="flex flex-wrap gap-2">
              {note.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* 메모 */}
        {note.memo && (
          <section className="bg-white rounded-lg p-4">
            <h3 className="mb-3">메모</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{note.memo}</p>
          </section>
        )}

        {/* 내 노트일 때만 노출되는 액션 */}
        {isMyNote && (
          <section className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleTogglePublic}
              className="flex-1"
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
              className="px-4"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </section>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>노트 삭제</AlertDialogTitle>
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
