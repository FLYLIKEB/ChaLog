import { HTMLAttributes } from 'react';
import { cn } from './ui/utils';

type BottomNavSpacerProps = HTMLAttributes<HTMLDivElement>;

/**
 * 하단 네비게이션 바 높이만큼 여백을 추가하는 공통 컴포넌트.
 * 스크롤 끝에서 콘텐츠가 BottomNav에 가려지지 않도록 사용.
 * md 이상에서는 자동으로 숨겨집니다 (사이드바 사용).
 */
export function BottomNavSpacer({ className, ...rest }: BottomNavSpacerProps) {
  return (
    <div
      className={cn('shrink-0 w-full md:hidden', className)}
      style={{
        height: 'var(--bottom-nav-spacer)',
        minHeight: 'var(--bottom-nav-spacer)',
      }}
      aria-hidden
      {...rest}
    />
  );
}
