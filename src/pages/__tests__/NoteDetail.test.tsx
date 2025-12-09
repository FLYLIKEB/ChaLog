import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { NoteDetail } from '../NoteDetail';
import { MemoryRouter } from 'react-router-dom';
import { notesApi } from '../../lib/api';
import { Note } from '../../types';

const mockNavigate = vi.fn();

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    notesApi: {
      getById: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: '테스트 사용자', email: 'test@example.com' },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => mockNavigate,
  };
});

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
  images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  tags: ['풀향', '허브향'],
  isPublic: true,
  createdAt: new Date(),
};

describe('NoteDetail - 이미지 가운데 정렬', () => {
  beforeEach(() => {
    vi.mocked(notesApi.getById).mockResolvedValue(mockNote);
  });

  it('이미지 갤러리에 justify-items-center 클래스가 있어야 함', async () => {
    render(
      <MemoryRouter>
        <NoteDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const imageGallery = screen.getByText('사진').nextElementSibling;
      expect(imageGallery).toHaveClass('grid', 'grid-cols-2', 'gap-3', 'justify-items-center');
    });
  });

  it('각 이미지 컨테이너에 max-w-xs 클래스가 있어야 함', async () => {
    render(
      <MemoryRouter>
        <NoteDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const imageContainers = screen.getAllByAltText(/Note image/);
      imageContainers.forEach((img) => {
        const container = img.parentElement;
        expect(container).toHaveClass('max-w-xs');
      });
    });
  });

  it('작성자 이름을 클릭하면 프로필 페이지로 이동해야 함', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NoteDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('테스트 사용자')).toBeInTheDocument();
    });

    const authorName = screen.getByText('테스트 사용자');
    await user.click(authorName);

    expect(mockNavigate).toHaveBeenCalledWith('/user/1');
  });

  it('작성자 이름에 호버 효과가 있어야 함', async () => {
    render(
      <MemoryRouter>
        <NoteDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const authorName = screen.getByText('테스트 사용자');
      expect(authorName).toHaveClass('hover:text-primary', 'cursor-pointer');
    });
  });
});

