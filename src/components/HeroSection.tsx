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
        'px-5 py-4 sm:px-6 sm:py-5',
        className,
      )}
    >
      <div
        className="absolute -right-6 -top-4 w-28 h-28 opacity-[0.08] pointer-events-none"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-primary">
          <path d="M12 2C6 8 6 16 12 22c6-6 6-14 0-20z" />
        </svg>
      </div>

      <div className="relative flex items-center gap-3">
        <div className="w-8 h-8 shrink-0 opacity-80 pointer-events-none" aria-hidden>
          <img src="/logo.png" alt="" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground/90 leading-snug">
            차를 마시고, 소중한 순간을 기록하세요.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            다우들의 차록으로 새로운 차를 발견하세요.
          </p>
        </div>
      </div>
    </section>
  );
}
