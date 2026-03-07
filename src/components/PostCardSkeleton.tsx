import React from 'react';
import { Skeleton } from './ui/skeleton';

export function PostCardSkeleton() {
  return (
    <div className="w-full py-4 px-0 border-b border-border/50">
      <div className="flex items-start gap-3">
        <Skeleton className="shrink-0 w-10 h-10 rounded-full" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[83%]" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    </div>
  );
}
