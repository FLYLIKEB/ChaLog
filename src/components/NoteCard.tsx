import React, { type FC, useState } from 'react';
import { Star, Lock, Heart, Bookmark } from 'lucide-react';
import { Note } from '../types';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { notesApi } from '../lib/api';
import { logger } from '../lib/logger';

interface NoteCardProps {
  note: Note;
  showTeaName?: boolean;
}

export const NoteCard: FC<NoteCardProps> = ({ note, showTeaName = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasImage = note.images && note.images.length > 0;
  const firstImage = hasImage ? note.images![0] : null;
  const isMyNote = note.userId === user?.id;
  const canView = note.isPublic || isMyNote;
  
  const [isLiked, setIsLiked] = useState(note.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(note.likeCount ?? 0);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(note.isBookmarked ?? false);
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false);

  const handleClick = () => {
    if (!canView) {
      toast.error('비공개 노트는 작성자만 볼 수 있습니다.');
      return;
    }
    navigate(`/note/${note.id}`);
  };

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (isTogglingLike) return;

    try {
      setIsTogglingLike(true);
      const result = await notesApi.toggleLike(note.id);
      setIsLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch (error: any) {
      logger.error('Failed to toggle like:', error);
      toast.error('좋아요 처리에 실패했습니다.');
    } finally {
      setIsTogglingLike(false);
    }
  };

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (isTogglingBookmark) return;

    try {
      setIsTogglingBookmark(true);
      const result = await notesApi.toggleBookmark(note.id);
      setIsBookmarked(result.bookmarked);
    } catch (error: any) {
      logger.error('Failed to toggle bookmark:', error);
      toast.error('북마크 처리에 실패했습니다.');
    } finally {
      setIsTogglingBookmark(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-4 bg-white border rounded-lg transition-shadow ${
        canView ? 'hover:shadow-md cursor-pointer' : 'opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="space-y-3">
        {/* 이미지 */}
        {hasImage && firstImage && (
          <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            <ImageWithFallback
              src={firstImage}
              alt="Note image"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* 내용 영역 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {showTeaName && (
              <h3 className="truncate mb-1">{note.teaName}</h3>
            )}
            {note.memo && (
              <p className="text-sm text-gray-600 line-clamp-2">{note.memo}</p>
            )}
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {note.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {note.tags.length > 3 && (
                  <span className="text-xs px-2 py-0.5 text-gray-500">
                    +{note.tags.length - 3}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">{note.userName}</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500">
                {note.createdAt.toLocaleDateString('ko-KR')}
              </span>
              {!note.isPublic && (
                <>
                  <span className="text-xs text-gray-400">·</span>
                  <Lock className="w-3 h-3 text-gray-400" />
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm">{Number(note.rating).toFixed(1)}</span>
            </div>
            {user && (
              <>
                <button
                  onClick={handleLikeClick}
                  disabled={isTogglingLike}
                  className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  <Heart
                    className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
                  />
                  {likeCount > 0 && <span className="text-sm">{likeCount}</span>}
                </button>
                <button
                  onClick={handleBookmarkClick}
                  disabled={isTogglingBookmark}
                  className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-50"
                >
                  <Bookmark
                    className={`w-4 h-4 ${isBookmarked ? 'fill-blue-500 text-blue-500' : ''}`}
                  />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};
