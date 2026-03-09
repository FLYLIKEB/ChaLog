import { cn } from './ui/utils';

interface ChadamBannerProps {
  className?: string;
}

/** 차담(게시판) 페이지 상단 배너 */
export function ChadamBanner({ className }: ChadamBannerProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden',
        '-mx-4 -mt-4',
        'rounded-b-2xl',
        'bg-linear-to-br from-primary/15 via-primary/10 to-primary/5',
        'px-5 py-4 sm:px-6 sm:py-5',
        className,
      )}
    >
      {/* 배경 장식 - 말풍선 */}
      <div
        className="absolute -right-8 -top-6 w-36 h-36 opacity-[0.08] pointer-events-none"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-primary">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </div>
      <div
        className="absolute -left-4 top-1/2 -translate-y-1/2 w-24 h-24 opacity-[0.05] pointer-events-none"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-primary">
          <path d="M12 2C6 8 6 16 12 22c6-6 6-14 0-20z" />
        </svg>
      </div>

      <div className="relative flex flex-col gap-1.5">
        <div className="space-y-1">
          <p className="text-sm sm:text-base text-foreground/90 font-medium leading-snug">
            차를 사랑하는 사람들의 이야기
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
            차 추천, 우리다 방법, 다실 후기 등 다양한 이야기를 나눠보세요.
          </p>
        </div>
      </div>
    </section>
  );
}
