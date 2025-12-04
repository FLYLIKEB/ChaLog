import React, { type FC } from 'react';
import { Star, Lock } from 'lucide-react';
import { Note } from '../types';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

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

  const handleClick = () => {
    if (!canView) {
      toast.error('비공개 노트는 작성자만 볼 수 있습니다.');
      return;
    }
    navigate(`/note/${note.id}`);
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-4 bg-white border rounded-lg transition-shadow ${
        canView ? 'hover:shadow-md cursor-pointer' : 'opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex-1 min-w-0 ${hasImage ? 'flex gap-3' : ''}`}>
          {hasImage && firstImage && (
            <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
              <ImageWithFallback
                src={firstImage}
                alt="Note image"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {showTeaName && (
              <h3 className="truncate mb-1">{note.teaName}</h3>
            )}
            {note.memo && (
              <p className="text-sm text-gray-600 line-clamp-2">{note.memo}</p>
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
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span className="text-sm">{Number(note.rating).toFixed(1)}</span>
        </div>
      </div>
    </button>
  );
};
