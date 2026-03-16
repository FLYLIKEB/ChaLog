import React from 'react';
import { Skeleton } from './ui/skeleton';

export function NoteCardSkeleton() {
  return (
    <div className="aspect-[3/4] w-full rounded-2xl bg-card flex flex-col items-center justify-center gap-2 p-3">
      <Skeleton className="w-11 h-11 rounded-2xl" />
      <Skeleton className="h-3.5 w-[70%]" />
      <Skeleton className="h-2.5 w-[50%]" />
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="w-2.5 h-2.5 rounded-full" />
        ))}
      </div>
    </div>
  );
}
