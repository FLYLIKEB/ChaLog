import React from 'react';
import { Skeleton } from './ui/skeleton';

export function NoteCardSkeleton() {
  return (
    <div className="w-full py-4 border-b border-border/50">
      <div className="flex items-start gap-3 sm:gap-4">
        <Skeleton className="shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-lg mt-1" />
        <div className="flex-1 min-w-0 flex flex-col gap-2 mt-1">
          <Skeleton className="h-4 w-[75%]" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-1.5 mt-1">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
