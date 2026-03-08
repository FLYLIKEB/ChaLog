import React from 'react';
import { Skeleton } from './ui/skeleton';

export function CellarCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-[70%]" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-1/4" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 flex-1 rounded-md" />
      </div>
    </div>
  );
}
