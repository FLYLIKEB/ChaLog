import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollSentinelProps {
  onLoadMore: () => void;
  loading?: boolean;
  hasMore?: boolean;
  label?: string;
}

/**
 * 무한 스크롤 센티넬 컴포넌트.
 * 화면에 보이면 onLoadMore를 호출하고, 로딩 중 스피너를 표시합니다.
 */
export function InfiniteScrollSentinel({
  onLoadMore,
  loading = false,
  hasMore = true,
  label = '불러오는 중...',
}: InfiniteScrollSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMoreRef.current();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!hasMore) return null;

  return (
    <div ref={ref} className="flex justify-center py-4">
      {loading && (
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {label}
        </span>
      )}
    </div>
  );
}
