import React from 'react';
import { ExternalLink } from 'lucide-react';
import { formatWhereToBuy } from '../utils/whereToBuy';
import { cn } from './ui/utils';

export interface WhereToBuyLinkProps {
  /** 구입처 문자열 (raw) 또는 displayText (href 제공 시) */
  value: string;
  /** URL인 경우 href (TeaDetail Map 등에서 pre-formatted 시 사용) */
  href?: string;
  /** 스타일 변형 */
  variant?: 'inline' | 'badge' | 'section';
  className?: string;
  /** 클릭 시 부모 전파 차단 (NoteCard 등) */
  onClick?: (e: React.MouseEvent) => void;
}

const variantStyles = {
  inline: {
    link: 'flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer',
    text: 'flex items-center gap-1 text-xs text-muted-foreground',
    iconSize: 'w-3 h-3',
  },
  badge: {
    link: 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm',
    text: 'inline-flex px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm',
    iconSize: 'w-3.5 h-3.5',
  },
  section: {
    link: 'inline-flex items-center gap-2 text-primary hover:underline',
    text: 'text-foreground',
    iconSize: 'w-4 h-4',
  },
};

export function WhereToBuyLink({ value, href, variant = 'inline', className, onClick }: WhereToBuyLinkProps) {
  if (!value || !value.trim()) {
    return null;
  }

  const formatted = href !== undefined
    ? { isUrl: true, displayText: value, href }
    : formatWhereToBuy(value);

  const styles = variantStyles[variant];
  const Wrapper = variant === 'section' ? 'p' : 'span';

  if (formatted.isUrl && formatted.href) {
    return (
      <a
        href={formatted.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(styles.link, className)}
        onClick={onClick}
      >
        <ExternalLink className={cn(styles.iconSize, 'shrink-0')} />
        <span className={variant === 'section' ? 'break-all' : 'truncate'}>
          {formatted.displayText}
        </span>
      </a>
    );
  }

  return (
    <Wrapper className={cn(styles.text, className)}>
      {formatted.displayText}
    </Wrapper>
  );
}
