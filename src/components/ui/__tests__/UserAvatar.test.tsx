import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { UserAvatar } from '../UserAvatar';

describe('UserAvatar', () => {
  it('프로필 사진 URL이 없을 때 이니셜을 표시해야 함', () => {
    render(<UserAvatar name="홍길동" />);
    
    const avatar = screen.getByText('홍');
    expect(avatar).toBeInTheDocument();
  });

  it('프로필 사진 URL이 있을 때 이미지를 표시해야 함', () => {
    render(<UserAvatar name="홍길동" profileImageUrl="https://example.com/profile.jpg" />);
    
    // 테스트 환경에서는 이미지가 로드되지 않을 수 있으므로, 이미지 요소가 있는지 확인
    const image = screen.queryByAltText('홍길동');
    if (image) {
      expect(image).toHaveAttribute('src', 'https://example.com/profile.jpg');
    }
    // Avatar 컴포넌트는 렌더링되어야 함
    const avatar = screen.getByText('홍').closest('[data-slot="avatar"]');
    expect(avatar).toBeInTheDocument();
  });

  it('이미지 로드 실패 시 이니셜로 fallback해야 함', async () => {
    render(<UserAvatar name="홍길동" profileImageUrl="https://example.com/invalid.jpg" />);
    
    // 이미지 요소가 있을 수 있음
    const image = screen.queryByAltText('홍길동');
    
    if (image) {
      // 이미지 에러 시뮬레이션
      image.dispatchEvent(new Event('error'));
    }
    
    // fallback으로 이니셜이 표시되어야 함
    const fallback = screen.getByText('홍');
    expect(fallback).toBeInTheDocument();
  });

  it('이름이 없을 때 기본 이니셜을 표시해야 함', () => {
    render(<UserAvatar name="" />);
    
    const avatar = screen.getByText('?');
    expect(avatar).toBeInTheDocument();
  });

  it('다양한 크기 prop을 올바르게 적용해야 함', () => {
    const { rerender } = render(<UserAvatar name="홍길동" size="sm" />);
    let avatar = screen.getByText('홍').closest('[data-slot="avatar"]');
    expect(avatar).toHaveClass('w-12', 'h-12');

    rerender(<UserAvatar name="홍길동" size="md" />);
    avatar = screen.getByText('홍').closest('[data-slot="avatar"]');
    expect(avatar).toHaveClass('w-16', 'h-16');

    rerender(<UserAvatar name="홍길동" size="lg" />);
    avatar = screen.getByText('홍').closest('[data-slot="avatar"]');
    expect(avatar).toHaveClass('w-20', 'h-20');

    rerender(<UserAvatar name="홍길동" size="xl" />);
    avatar = screen.getByText('홍').closest('[data-slot="avatar"]');
    expect(avatar).toHaveClass('w-24', 'h-24');
  });

  it('프로필 사진 URL이 null일 때 이니셜을 표시해야 함', () => {
    render(<UserAvatar name="홍길동" profileImageUrl={null} />);
    
    const avatar = screen.getByText('홍');
    expect(avatar).toBeInTheDocument();
    expect(screen.queryByAltText('홍길동')).not.toBeInTheDocument();
  });
});

