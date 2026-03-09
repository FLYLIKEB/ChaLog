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

/** 차멍 로고 - 개완(개가 빠진 컵) 모티프. 한국어권: 차멍, 영어권: ChaMeong */
export function ChaLogLogo({ iconOnly = false, className, asButton, onClick }: ChaLogLogoProps) {
  const isKorean = useIsKorean();

  const content = (
    <>
      <div className="flex items-center justify-center shrink-0 w-12 h-12">
        <img src="/logo.jpg" alt="" className="w-12 h-12 object-contain" aria-hidden />
      </div>
      {!iconOnly && (
        <span className="font-['Jua'] font-normal tracking-tight text-2xl pt-1">
          {isKorean ? (
            <><span className="text-gray-700 dark:text-gray-400">차</span><span className="text-[#1e6b2e] dark:text-[#2d9a4a]">멍</span></>
          ) : (
            <><span className="text-gray-700 dark:text-gray-400">Cha</span><span className="text-[#1e6b2e] dark:text-[#2d9a4a]">Meong</span></>
          )}
        </span>
      )}
    </>
  );

  const wrapperClass = cn(
    'flex items-center gap-0.5 min-h-[48px] transition-colors',
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
