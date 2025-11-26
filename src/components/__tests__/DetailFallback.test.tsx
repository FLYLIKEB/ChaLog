import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DetailFallback } from '../DetailFallback';
import { renderWithRouter } from '../../test/renderWithRouter';

describe('DetailFallback', () => {
  it('제목과 기본 메시지를 렌더링한다', () => {
    renderWithRouter(<DetailFallback title="노트 상세" />);

    expect(screen.getByText('노트 상세')).toBeInTheDocument();
    expect(screen.getByText('데이터를 불러올 수 없습니다.')).toBeInTheDocument();
  });

  it('children이 있으면 기본 메시지 대신 표시한다', () => {
    renderWithRouter(
      <DetailFallback title="노트 상세">
        <p>커스텀 콘텐츠</p>
      </DetailFallback>,
    );

    expect(screen.getByText('커스텀 콘텐츠')).toBeInTheDocument();
    expect(screen.queryByText('데이터를 불러올 수 없습니다.')).not.toBeInTheDocument();
  });
});

