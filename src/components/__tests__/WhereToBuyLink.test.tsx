import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WhereToBuyLink } from '../WhereToBuyLink';

describe('WhereToBuyLink', () => {
  it('URL일 때 <a> 요소를 렌더하고 target="_blank", rel="noopener noreferrer" 속성을 가져야 함', () => {
    render(<WhereToBuyLink value="https://shop.com/path" />);

    const link = screen.getByRole('link', { name: /shop\.com/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://shop.com/path');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('URL일 때 hostname을 표시해야 함', () => {
    render(<WhereToBuyLink value="https://example.co.kr/page" />);
    expect(screen.getByText('example.co.kr')).toBeInTheDocument();
  });

  it('비URL일 때 <span>으로 displayText만 표시해야 함', () => {
    render(<WhereToBuyLink value="티하우스" />);
    expect(screen.getByText('티하우스')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('value가 빈 문자열이면 렌더하지 않아야 함', () => {
    const { container } = render(<WhereToBuyLink value="" />);
    expect(container.firstChild).toBeNull();
  });

  it('value가 공백만 있으면 렌더하지 않아야 함', () => {
    const { container } = render(<WhereToBuyLink value="   " />);
    expect(container.firstChild).toBeNull();
  });

  it('href가 제공되면 value를 displayText로 사용하고 href로 링크해야 함', () => {
    render(<WhereToBuyLink value="shop.com" href="https://shop.com/deep/path" />);

    const link = screen.getByRole('link', { name: /shop\.com/ });
    expect(link).toHaveAttribute('href', 'https://shop.com/deep/path');
    expect(screen.getByText('shop.com')).toBeInTheDocument();
  });
});
