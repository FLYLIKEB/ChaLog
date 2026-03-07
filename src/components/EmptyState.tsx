import React from 'react';
import { FileText, Search, WifiOff, ServerCrash } from 'lucide-react';
import { Button } from './ui/button';

interface EmptyStateProps {
  type: 'feed' | 'search' | 'network' | 'server' | 'notes';
  message?: string;
  /** CTA 버튼 (예: "첫 노트 쓰기") */
  action?: { label: string; onClick: () => void };
  /** network/server 타입 시 재시도 콜백 */
  onRetry?: () => void;
}

export function EmptyState({ type, message, action, onRetry }: EmptyStateProps) {
  const icons = {
    feed: FileText,
    search: Search,
    network: WifiOff,
    server: ServerCrash,
    notes: FileText,
  };

  const defaultMessages = {
    feed: '아직 공개된 노트가 없어요.',
    search: '일치하는 차가 없어요.',
    network: '연결이 불안정해요.',
    server: '서버에 문제가 발생했어요.',
    notes: '아직 기록된 노트가 없어요.',
  };

  const Icon = icons[type];
  const displayMessage = message || defaultMessages[type];

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-center text-sm leading-relaxed">{displayMessage}</p>
      {action && (
        <Button
          size="sm"
          className="mt-4"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
      {onRetry && (type === 'network' || type === 'server') && !action && (
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          onClick={onRetry}
        >
          재시도
        </Button>
      )}
    </div>
  );
}
