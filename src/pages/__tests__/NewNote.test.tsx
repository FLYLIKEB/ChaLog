import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { NewNote } from '../NewNote';
import { toast } from 'sonner';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../lib/mockData', () => ({
  mockTeas: [
    {
      id: 'tea-1',
      name: '백호은침',
      type: '백차',
      seller: '티하우스',
      averageRating: 4.6,
      reviewCount: 12,
    },
    {
      id: 'tea-2',
      name: '정산소종',
      type: '홍차',
      seller: '차향',
      averageRating: 4.4,
      reviewCount: 15,
    },
  ],
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
  const navigate = (globalThis as Record<string, ReturnType<typeof vi.fn> | undefined>).__navigate_spy__;
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
    renderNewNote('/new-note?teaId=tea-1');

    expect(await screen.findByDisplayValue('백호은침')).toBeInTheDocument();
  });
});

