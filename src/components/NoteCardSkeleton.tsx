import React from 'react';
import { Skeleton } from './ui/skeleton';

export function NoteCardSkeleton() {
  return (
    <div className="w-full rounded-2xl border border-black/5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] bg-card p-4">
      <div className="flex items-start gap-3 sm:gap-4">
        <Skeleton className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl" />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <Skeleton className="h-4 w-[70%]" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <div className="flex gap-1.5 mt-0.5">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
          <Skeleton className="h-3 w-1/2 mt-2" />
        </div>
      </div>
    </div>
  );
}
