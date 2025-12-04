import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { NewNote } from '../NewNote';
import { toast } from 'sonner';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockTeas = [
  {
    id: 1,
    name: '백호은침',
    type: '백차',
    seller: '티하우스',
    averageRating: 4.6,
    reviewCount: 12,
  },
  {
    id: 2,
    name: '정산소종',
    type: '홍차',
    seller: '차향',
    averageRating: 4.4,
    reviewCount: 15,
  },
];

vi.mock('../../lib/api', () => ({
  teasApi: {
    getAll: vi.fn(() => Promise.resolve(mockTeas)),
    getById: vi.fn((id: number) => {
      const tea = mockTeas.find(t => t.id === id);
      return Promise.resolve(tea || null);
    }),
  },
  notesApi: {
    create: vi.fn(() => Promise.resolve({ id: 1 })),
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 1, name: '테스트 사용자', email: 'test@example.com' },
  }),
}));

vi.mock('sonner', () => {
  const success = vi.fn();
  const error = vi.fn();
  const toastFn = Object.assign(vi.fn(), { success, error });
  return { toast: toastFn };
});

const toastMock = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  const navigate = vi.fn();
  (globalThis as Record<string, unknown>).__navigate_spy__ = navigate;
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

const getNavigateSpy = () => {
  const navigate = (globalThis as unknown as Record<string, ReturnType<typeof vi.fn> | undefined>).__navigate_spy__;
  if (!navigate) {
    throw new Error('navigate spy is not initialised');
  }
  return navigate;
};

const renderNewNote = (initialEntry = '/new-note') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/new-note" element={<NewNote />} />
        <Route path="/note/new" element={<NewNote />} />
        <Route path="/tea/new" element={<div data-testid="new-tea-page">새 차 등록</div>} />
        <Route path="/my-notes" element={<div data-testid="my-notes-page">내 노트 목록</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('NewNote 페이지', () => {
  it('차를 선택하지 않고 저장하면 오류 토스트를 노출한다', async () => {
    const user = userEvent.setup();
    renderNewNote();

    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(toastMock.error).toHaveBeenCalledWith('차를 선택해주세요.');
  });

  it('메모 없이 저장하면 메모 관련 오류를 노출한다', async () => {
    const user = userEvent.setup();
    renderNewNote();

    const input = screen.getByPlaceholderText('차 이름으로 검색...');
    await user.type(input, '백호');

    const option = await screen.findByRole('button', { name: /백호은침/ });
    await user.click(option);

    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(toastMock.error).toHaveBeenCalledWith('메모를 작성해주세요.');
  });

  it('성공적으로 저장하면 성공 토스트 후 내 노트로 이동한다', async () => {
    const user = userEvent.setup();

    renderNewNote();

    const teaInput = screen.getByPlaceholderText('차 이름으로 검색...');
    await user.type(teaInput, '정산');

    const option = await screen.findByRole('button', { name: /정산소종/ });
    await user.click(option);

    const memoInput = screen.getByPlaceholderText('향·맛·여운에 대해 자유롭게 기록해보세요.');
    await user.type(memoInput, '기록 테스트');

    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(toastMock.success).toHaveBeenCalledWith('기록이 저장되었습니다.');

    await waitFor(() => {
      expect(getNavigateSpy()).toHaveBeenCalledWith('/my-notes');
    });
  });

  it('teaId 쿼리로 진입하면 검색 입력이 자동 채워진다', async () => {
    renderNewNote('/new-note?teaId=1');

    expect(await screen.findByDisplayValue('백호은침')).toBeInTheDocument();
  });

  it('검색 결과가 없을 때 새 차로 등록하기 버튼을 표시한다', async () => {
    const user = userEvent.setup();
    const { teasApi } = await import('../../lib/api');
    
    // 검색 결과가 없도록 mock 수정
    vi.mocked(teasApi.getAll).mockResolvedValueOnce([]);

    renderNewNote('/note/new');

    const teaInput = screen.getByPlaceholderText('차 이름으로 검색...');
    await user.type(teaInput, '존재하지 않는 차');

    await waitFor(() => {
      expect(screen.getByText(/검색 결과가 없습니다/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /새 차로 등록하기/ })).toBeInTheDocument();
    });
  });

  it('새 차로 등록하기 버튼 클릭 시 새 차 등록 페이지로 이동한다', async () => {
    const user = userEvent.setup();
    const { teasApi } = await import('../../lib/api');
    
    vi.mocked(teasApi.getAll).mockResolvedValueOnce([]);

    renderNewNote('/note/new');

    const teaInput = screen.getByPlaceholderText('차 이름으로 검색...');
    await user.type(teaInput, '새로운 차');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /새 차로 등록하기/ })).toBeInTheDocument();
    });

    const newTeaButton = screen.getByRole('button', { name: /새 차로 등록하기/ });
    await user.click(newTeaButton);

    // encodeURIComponent가 한글을 UTF-8로 인코딩하므로 실제 인코딩된 값을 사용
    const expectedUrl = `/tea/new?returnTo=/note/new&searchQuery=${encodeURIComponent('새로운 차')}`;
    expect(getNavigateSpy()).toHaveBeenCalledWith(expectedUrl);
  });

  it('teaId로 새로 등록한 차를 가져와서 자동 선택한다', async () => {
    const { teasApi } = await import('../../lib/api');
    const newTea = {
      id: 3,
      name: '새로 등록한 차',
      type: '녹차',
      seller: '새 찻집',
      averageRating: 0,
      reviewCount: 0,
    };

    // getAll은 빈 배열 반환 (아직 목록에 없음)
    vi.mocked(teasApi.getAll).mockResolvedValueOnce([]);
    // getById는 새로 등록한 차 반환
    vi.mocked(teasApi.getById).mockResolvedValueOnce(newTea);

    renderNewNote('/note/new?teaId=3');

    await waitFor(() => {
      expect(teasApi.getById).toHaveBeenCalledWith(3);
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('새로 등록한 차')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});

