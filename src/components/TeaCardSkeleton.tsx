import React from 'react';
import { Skeleton } from './ui/skeleton';
import { Card } from './ui/card';

export function TeaCardSkeleton() {
  return (
    <Card className="w-full p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-[80%]" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </Card>
  );
}
