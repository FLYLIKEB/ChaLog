import React from 'react';
import { Header } from './Header';

interface DetailFallbackProps {
  title: string;
  message?: string;
  children?: React.ReactNode;
}

export function DetailFallback({
  title,
  message = '데이터를 불러올 수 없습니다.',
  children,
}: DetailFallbackProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBack title={title} />
      <div className="p-4">
        {children ?? (
          <p className="text-center text-gray-500 mt-8">{message}</p>
        )}
      </div>
    </div>
  );
}

