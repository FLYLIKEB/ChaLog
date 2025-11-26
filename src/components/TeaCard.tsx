import React, { type FC } from 'react';
import { Star } from 'lucide-react';
import { Tea } from '../types';
import { useNavigate } from 'react-router-dom';

interface TeaCardProps {
  tea: Tea;
}

export const TeaCard: FC<TeaCardProps> = ({ tea }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/tea/${tea.id}`)}
      className="w-full text-left p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="truncate">{tea.name}</h3>
          <div className="flex items-center gap-3 mt-2 text-gray-600">
            <span className="text-sm">{tea.type}</span>
            {tea.year && <span className="text-sm">{tea.year}년</span>}
          </div>
          {tea.seller && (
            <p className="text-sm text-gray-500 mt-1">{tea.seller}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-sm">{Number(tea.averageRating).toFixed(1)}</span>
          </div>
          <span className="text-xs text-gray-500">{tea.reviewCount}개 리뷰</span>
        </div>
      </div>
    </button>
  );
};
