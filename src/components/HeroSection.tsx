import { cn } from './ui/utils';

interface HeroSectionProps {
  className?: string;
}

/** 홈 화면 상단 Hero - 차멍 소개 및 앱 설명 */
export function HeroSection({ className }: HeroSectionProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden',
        '-mx-4 sm:-mx-6 -mt-6 sm:-mt-8',
        'rounded-b-2xl',
        'bg-linear-to-br from-primary/15 via-primary/10 to-primary/5',
        'px-5 py-7 sm:px-6 sm:py-8',
        className,
      )}
    >
      {/* 배경 장식 - 찻잎 실루엣 */}
      <div
        className="absolute -right-8 -top-6 w-36 h-36 opacity-[0.08] pointer-events-none"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-primary">
          <path d="M12 2C6 8 6 16 12 22c6-6 6-14 0-20z" />
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

      <div className="relative flex flex-col gap-3.5 sm:gap-4">
        <div className="space-y-1.5">
          <p className="text-sm sm:text-base text-foreground/90 font-medium leading-snug">
            마시는 순간만큼, 기억하는 순간도 소중해요.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
            나만의 차록을 쌓고, 함께하는 다우들의 차록으로 새로운 차를 발견하세요.
          </p>
        </div>
      </div>
    </section>
  );
}
