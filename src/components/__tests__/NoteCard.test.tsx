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

describe('NoteCard - 그리드 카드', () => {
  it('이미지가 있을 때 이미지 컨테이너에 rounded-2xl이 있어야 함', () => {
    render(
      <MemoryRouter>
        <NoteCard note={mockNote} />
      </MemoryRouter>,
    );

    const imageContainer = screen.getByAltText('테스트 차').parentElement;
    expect(imageContainer).toHaveClass('rounded-2xl', 'overflow-hidden');
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

    const img = screen.getByAltText('테스트 차');
    expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
  });

  it('imageThumbnails가 없으면 images로 폴백해야 함', () => {
    render(
      <MemoryRouter>
        <NoteCard note={mockNote} />
      </MemoryRouter>,
    );

    const img = screen.getByAltText('테스트 차');
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('이미지가 없을 때 로고 플레이스홀더가 렌더링되어야 함', () => {
    const noteWithoutImage = { ...mockNote, images: null };
    render(
      <MemoryRouter>
        <NoteCard note={noteWithoutImage} />
      </MemoryRouter>,
    );

    expect(screen.queryByAltText('테스트 차')).not.toBeInTheDocument();
  });

  it('차 이름을 표시해야 함', () => {
    render(
      <MemoryRouter>
        <NoteCard note={mockNote} />
      </MemoryRouter>,
    );

    expect(screen.getByText('테스트 차')).toBeInTheDocument();
  });

  it('카드를 클릭하면 상세 페이지로 이동해야 함', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NoteCard note={mockNote} />
      </MemoryRouter>,
    );

    const card = screen.getAllByRole('button')[0];
    await user.click(card);

    expect(mockNavigate).toHaveBeenCalledWith('/note/1');
  });

  it('별점을 표시해야 함', () => {
    render(
      <MemoryRouter>
        <NoteCard note={mockNote} />
      </MemoryRouter>,
    );

    const card = screen.getAllByRole('button')[0];
    const stars = card.querySelectorAll('.fill-rating');
    expect(stars.length).toBeGreaterThan(0);
  });
});
