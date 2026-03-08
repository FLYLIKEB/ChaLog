import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { NoteCard } from '../NoteCard';
import { MemoryRouter } from 'react-router-dom';
import { Note } from '../../types';

const mockNavigate = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: '테스트 사용자', email: 'test@example.com' },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockNote: Note = {
  id: 1,
  teaId: 1,
  teaName: '테스트 차',
  userId: 1,
  userName: '테스트 사용자',
  schemaId: 1,
  overallRating: 4.5,
  isRatingIncluded: true,
  memo: '테스트 메모',
  images: ['https://example.com/image.jpg'],
  tags: ['풀향', '허브향'],
  isPublic: true,
  createdAt: new Date(),
};

describe('NoteCard - 이미지 가운데 정렬', () => {
  it('이미지가 있을 때 이미지 컨테이너에 rounded-xl가 있어야 함', () => {
    render(
      <MemoryRouter>
        <NoteCard note={mockNote} />
      </MemoryRouter>,
    );

    const imageContainer = screen.getByAltText('Note image').parentElement;
    expect(imageContainer).toHaveClass('rounded-xl', 'overflow-hidden');
  });

  it('imageThumbnails가 있으면 썸네일을 우선 표시해야 함', () => {
    const noteWithThumbnail = {
      ...mockNote,
      images: ['https://example.com/original.jpg'],
      imageThumbnails: ['https://example.com/thumb.jpg'],
    };
    render(
      <MemoryRouter>
        <NoteCard note={noteWithThumbnail} />
      </MemoryRouter>,
    );

    const img = screen.getByAltText('Note image');
    expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
  });

  it('imageThumbnails가 없으면 images로 폴백해야 함', () => {
    render(
      <MemoryRouter>
        <NoteCard note={mockNote} />
      </MemoryRouter>,
    );

    const img = screen.getByAltText('Note image');
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('이미지가 없을 때 이미지 컨테이너가 렌더링되지 않아야 함', () => {
    const noteWithoutImage = { ...mockNote, images: null };
    render(
      <MemoryRouter>
        <NoteCard note={noteWithoutImage} />
      </MemoryRouter>,
    );

    expect(screen.queryByAltText('Note image')).not.toBeInTheDocument();
  });

  it('작성자 이름을 클릭하면 프로필 페이지로 이동해야 함', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NoteCard note={mockNote} />
      </MemoryRouter>,
    );

    const authorName = screen.getByText('테스트 사용자');
    await user.click(authorName);

    expect(mockNavigate).toHaveBeenCalledWith('/user/1');
  });

  it('작성자 이름에 호버 효과가 있어야 함', () => {
    render(
      <MemoryRouter>
        <NoteCard note={mockNote} />
      </MemoryRouter>,
    );

    const authorName = screen.getByText('테스트 사용자');
    expect(authorName).toHaveClass('hover:text-primary', 'cursor-pointer');
  });
});

describe('NoteCard - 구입처(whereToBuy)', () => {
  it('whereToBuy가 URL일 때 <a> 요소가 존재하고 target="_blank" 속성을 가져야 함', () => {
    const noteWithUrl = { ...mockNote, whereToBuy: 'https://shop.com/buy' };
    render(
      <MemoryRouter>
        <NoteCard note={noteWithUrl} />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /shop\.com/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('whereToBuy가 샵 이름일 때 텍스트로 표시해야 함', () => {
    const noteWithShop = { ...mockNote, whereToBuy: '티하우스' };
    render(
      <MemoryRouter>
        <NoteCard note={noteWithShop} />
      </MemoryRouter>,
    );

    expect(screen.getByText('티하우스')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('whereToBuy가 없을 때 구입처 영역을 렌더하지 않아야 함', () => {
    render(
      <MemoryRouter>
        <NoteCard note={mockNote} />
      </MemoryRouter>,
    );

    expect(screen.queryByText('shop.com')).not.toBeInTheDocument();
    expect(screen.queryByText('티하우스')).not.toBeInTheDocument();
  });
});

