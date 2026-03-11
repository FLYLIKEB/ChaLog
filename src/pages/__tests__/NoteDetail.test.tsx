import { render, screen, waitFor, within } from '@testing-library/react';
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
      update: vi.fn(),
    },
    teasApi: {
      ...(actual as any).teasApi,
      getById: vi.fn(() =>
        Promise.resolve({
          id: 1,
          name: '테스트 차',
          type: '녹차',
          averageRating: 4.0,
          reviewCount: 5,
        }),
      ),
    },
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: '테스트 사용자', email: 'test@example.com' },
    isLoading: false,
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
  schemaId: 1,
  overallRating: 4.5,
  isRatingIncluded: true,
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
      expect(imageGallery).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'gap-3');
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
        expect(container).toHaveClass('aspect-square', 'rounded-lg', 'overflow-hidden', 'bg-muted', 'w-full');
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

describe('NoteDetail - 수정/삭제/비공개 기능', () => {
  beforeEach(() => {
    vi.mocked(notesApi.getById).mockResolvedValue(mockNote);
    vi.mocked(notesApi.delete).mockResolvedValue(undefined as any);
    vi.mocked(notesApi.update).mockResolvedValue({ ...mockNote, isPublic: false } as any);
    mockNavigate.mockClear();
  });

  it('수정 버튼 클릭 시 편집 페이지로 이동해야 함', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NoteDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('수정')).toBeInTheDocument();
    });

    await user.click(screen.getByText('수정'));
    expect(mockNavigate).toHaveBeenCalledWith('/note/1/edit');
  });

  it('비공개 전환 버튼 클릭 시 notesApi.update가 호출되어야 함', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NoteDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('비공개로 전환')).toBeInTheDocument();
    });

    await user.click(screen.getByText('비공개로 전환'));

    await waitFor(() => {
      expect(notesApi.update).toHaveBeenCalledWith(1, { isPublic: false });
    });
  });

  it('삭제 버튼 클릭 시 AlertDialog가 열리고, 확인 시 notesApi.delete가 호출되어야 함', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NoteDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('수정')).toBeInTheDocument();
    });

    // 삭제 아이콘 버튼 클릭 (Trash2 아이콘 포함 버튼)
    const deleteButton = screen.getByRole('button', { name: /삭제/i });
    await user.click(deleteButton);

    // AlertDialog 열림 확인
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    // 다이얼로그 내부의 삭제 확인 버튼 클릭
    const dialog = screen.getByRole('alertdialog');
    const confirmButton = within(dialog).getByRole('button', { name: '삭제' });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(notesApi.delete).toHaveBeenCalledWith(1);
    });
  });

  it('내 노트가 아닐 때 수정/삭제/비공개 버튼이 노출되지 않아야 함', async () => {
    const otherUserNote: Note = { ...mockNote, userId: 999 };
    vi.mocked(notesApi.getById).mockResolvedValue(otherUserNote);

    render(
      <MemoryRouter>
        <NoteDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('테스트 사용자')).toBeInTheDocument();
    });

    expect(screen.queryByText('수정')).not.toBeInTheDocument();
    expect(screen.queryByText('비공개로 전환')).not.toBeInTheDocument();
  });
});

