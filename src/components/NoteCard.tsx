import React, { type FC } from 'react';
import { Star, Lock } from 'lucide-react';
import { Note } from '../types';
import { useNavigate } from 'react-router-dom';

interface NoteCardProps {
  note: Note;
  showTeaName?: boolean;
}

export const NoteCard: FC<NoteCardProps> = ({ note, showTeaName = false }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/note/${note.id}`)}
      className="w-full text-left p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {showTeaName && (
            <h3 className="truncate mb-1">{note.teaName}</h3>
          )}
          <p className="text-sm text-gray-600 line-clamp-2">{note.memo}</p>
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
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span className="text-sm">{Number(note.rating).toFixed(1)}</span>
        </div>
      </div>
    </button>
  );
};
