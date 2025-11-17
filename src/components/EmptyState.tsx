import React from 'react';
import { FileText, Search, WifiOff, ServerCrash } from 'lucide-react';

interface EmptyStateProps {
  type: 'feed' | 'search' | 'network' | 'server' | 'notes';
  message?: string;
}

export function EmptyState({ type, message }: EmptyStateProps) {
  const icons = {
    feed: FileText,
    search: Search,
    network: WifiOff,
    server: ServerCrash,
    notes: FileText,
  };

  const defaultMessages = {
    feed: '아직 공개된 노트가 없습니다.',
    search: '일치하는 차가 없습니다.',
    network: '연결이 불안정합니다.',
    server: '서버에 문제가 발생했습니다.',
    notes: '아직 기록된 노트가 없습니다.',
  };

  const Icon = icons[type];
  const displayMessage = message || defaultMessages[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-gray-500 text-center">{displayMessage}</p>
    </div>
  );
}
