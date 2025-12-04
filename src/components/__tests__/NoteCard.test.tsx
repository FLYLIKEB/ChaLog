import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { NoteCard } from '../NoteCard';
import { MemoryRouter } from 'react-router-dom';
import { Note } from '../../types';

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

const mockNote: Note = {
  id: 1,
  teaId: 1,
  teaName: '테스트 차',
  userId: 1,
  userName: '테스트 사용자',
  rating: 4.5,
  ratings: {
    richness: 4,
    strength: 3,
    smoothness: 4,
    clarity: 5,
    complexity: 4,
  },
  memo: '테스트 메모',
  images: ['https://example.com/image.jpg'],
  tags: ['풀향', '허브향'],
  isPublic: true,
  createdAt: new Date(),
};

describe('NoteCard - 이미지 가운데 정렬', () => {
  it('이미지가 있을 때 이미지 컨테이너에 가운데 정렬 클래스가 있어야 함', () => {
    render(
      <MemoryRouter>
        <NoteCard note={mockNote} />
      </MemoryRouter>,
    );

    const imageContainer = screen.getByAltText('Note image').parentElement;
    expect(imageContainer).toHaveClass('flex', 'items-center', 'justify-center');
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
});

