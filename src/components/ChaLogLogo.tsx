import React from 'react';
import { cn } from './ui/utils';
import { useIsKorean } from '../hooks/useLocale';

interface ChaLogLogoProps {
  /** 아이콘만 표시 (제목과 함께 쓸 때) */
  iconOnly?: boolean;
  className?: string;
  /** 클릭 시 홈으로 이동하는 버튼으로 렌더 */
  asButton?: boolean;
  onClick?: () => void;
}

/** 차멍 브랜드 로고 - 차(茶) 잎 모티프. 한국어권: 차멍, 영어권: ChaMeong */
export function ChaLogLogo({ iconOnly = false, className, asButton, onClick }: ChaLogLogoProps) {
  const isKorean = useIsKorean();

  const content = (
    <>
      <div
        className={cn(
          'flex items-center justify-center shrink-0 overflow-hidden',
          'w-9 h-9 rounded-xl',
          'bg-gradient-to-br from-primary to-primary/90',
          'shadow-[0_2px_8px_rgba(29,185,60,0.3)]',
          iconOnly ? '' : 'ring-1 ring-primary/20',
        )}
      >
        {/* 차 잎 모티프 - 심플한 리프 실루엣 */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-5 h-5 text-white"
          aria-hidden
        >
          <path
            d="M12 2C6 8 6 16 12 22c6-6 6-14 0-20z"
            fill="currentColor"
            fillOpacity="0.98"
          />
        </svg>
      </div>
      {!iconOnly && (
        <span className="font-semibold text-foreground tracking-tight text-[1.05em]">
          {isKorean ? (
            <>차<span className="text-primary">멍</span></>
          ) : (
            <>Cha<span className="text-primary">Meong</span></>
          )}
        </span>
      )}
    </>
  );

  const wrapperClass = cn(
    'flex items-center gap-2.5 min-h-[44px] transition-colors',
    (asButton || onClick) && 'hover:opacity-90 active:scale-[0.98] cursor-pointer rounded-xl px-1 -ml-1',
    className,
  );

  if (asButton || onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={wrapperClass}
        aria-label={isKorean ? '차멍 홈으로' : 'ChaMeong home'}
      >
        {content}
      </button>
    );
  }

  return <div className={wrapperClass}>{content}</div>;
}
