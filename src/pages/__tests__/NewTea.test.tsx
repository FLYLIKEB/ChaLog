import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NewTea } from '../NewTea';
import { toast } from 'sonner';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockTeas = [
  {
    id: 1,
    name: '정산소종',
    type: '홍차',
    seller: '차향',
    year: 2023,
    origin: '중국',
    averageRating: 4.4,
    reviewCount: 15,
  },
  {
    id: 2,
    name: '백호은침',
    type: '백차',
    seller: '티하우스',
    year: 2024,
    origin: '중국',
    averageRating: 4.6,
    reviewCount: 12,
  },
];

const mockCreatedTea = {
  id: 3,
  name: '새로운 차',
  type: '녹차',
  seller: '새 찻집',
  year: 2024,
  origin: '한국',
  averageRating: 0,
  reviewCount: 0,
};

vi.mock('../../lib/api', () => ({
  teasApi: {
    getAll: vi.fn((query?: string) => {
      if (!query) return Promise.resolve(mockTeas);
      const filtered = mockTeas.filter(tea => 
        tea.name.toLowerCase().includes(query.toLowerCase())
      );
      return Promise.resolve(filtered);
    }),
    getById: vi.fn((id: number) => {
      const tea = mockTeas.find(t => t.id === id);
      return Promise.resolve(tea || null);
    }),
    create: vi.fn(() => Promise.resolve(mockCreatedTea)),
  },
}));

const mockUseAuth = vi.fn(() => ({
  isAuthenticated: true,
  user: { id: 1, name: '테스트 사용자', email: 'test@example.com' },
  login: vi.fn(),
  register: vi.fn(),
  loginWithKakao: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
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

const renderNewTea = (initialEntry = '/tea/new') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/tea/new" element={<NewTea />} />
        <Route path="/tea/:id" element={<div data-testid="tea-detail-page">차 상세</div>} />
        <Route path="/note/new" element={<div data-testid="note-new-page">노트 작성</div>} />
        <Route path="/login" element={<div data-testid="login-page">로그인</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('NewTea 페이지', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('페이지가 정상적으로 렌더링된다', () => {
    renderNewTea();
    // Header의 title과 페이지의 h1 모두 "새 차 등록"이므로 getAllByRole 사용
    const headings = screen.getAllByRole('heading', { name: '새 차 등록' });
    expect(headings.length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/차 이름/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '차 종류 선택' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '녹차' })).toBeInTheDocument();
  });

  it('searchQuery 파라미터가 있으면 차 이름 필드가 자동 채워진다', () => {
    renderNewTea('/tea/new?searchQuery=테스트차');
    expect(screen.getByDisplayValue('테스트차')).toBeInTheDocument();
  });

  it('필수 필드 없이 제출하면 에러를 표시한다', async () => {
    const user = userEvent.setup();
    renderNewTea();

    const submitButton = screen.getByRole('button', { name: '등록하기' });
    // HTML5 validation을 우회하기 위해 form의 submit 이벤트를 직접 트리거
    const form = submitButton.closest('form');
    if (form) {
      // preventDefault를 호출하지 않도록 설정
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      Object.defineProperty(submitEvent, 'preventDefault', { value: vi.fn() });
      form.dispatchEvent(submitEvent);
    }

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('차 이름을 입력해주세요.');
    });
  });

  it('차 종류 없이 제출하면 에러를 표시한다', async () => {
    const user = userEvent.setup();
    renderNewTea();

    const nameInput = screen.getByLabelText(/차 이름/);
    await user.type(nameInput, '테스트 차');

    // HTML5 required 속성을 우회하기 위해 form의 submit 이벤트를 직접 트리거
    const submitButton = screen.getByRole('button', { name: '등록하기' });
    const form = submitButton.closest('form');
    
    if (form) {
      // HTML5 validation을 우회하기 위해 preventDefault를 호출하지 않음
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      Object.defineProperty(submitEvent, 'preventDefault', { value: vi.fn() });
      form.dispatchEvent(submitEvent);
    }

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('차 종류를 입력해주세요.');
    });
  });

  it('연도가 1900 미만이면 에러를 표시한다', async () => {
    const user = userEvent.setup();
    renderNewTea();

    const nameInput = screen.getByLabelText(/차 이름/);
    const 녹차Button = screen.getByRole('button', { name: '녹차' });
    const yearInput = screen.getByLabelText(/연도/) as HTMLInputElement;

    await user.type(nameInput, '테스트 차');
    await user.click(녹차Button);
    
    // HTML5 min 속성을 우회하기 위해 form에 noValidate 추가
    const submitButton = screen.getByRole('button', { name: '등록하기' });
    const form = submitButton.closest('form');
    if (form) {
      form.setAttribute('noValidate', '');
    }
    
    // yearInput의 value를 직접 설정하고 React의 onChange를 트리거
    await user.clear(yearInput);
    // React state를 업데이트하기 위해 실제 입력 이벤트 시뮬레이션
    await user.type(yearInput, '1800');

    // form submit 이벤트 직접 트리거 (HTML5 validation 우회)
    if (form) {
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      Object.defineProperty(submitEvent, 'preventDefault', { value: vi.fn() });
      form.dispatchEvent(submitEvent);
    }

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('연도는 1900년 이상이어야 합니다.');
    }, { timeout: 3000 });
  });

  it('정상적인 차 정보를 입력하면 등록에 성공한다', async () => {
    const user = userEvent.setup();
    const { teasApi } = await import('../../lib/api');

    renderNewTea();

    const nameInput = screen.getByLabelText(/차 이름/);
    const 녹차Button = screen.getByRole('button', { name: '녹차' });
    const yearInput = screen.getByLabelText(/연도/);
    const sellerInput = screen.getByLabelText(/구매처/);
    const originInput = screen.getByLabelText(/산지/);

    await user.type(nameInput, '새로운 차');
    await user.click(녹차Button);
    await user.type(yearInput, '2024');
    await user.type(sellerInput, '새 찻집');
    await user.type(originInput, '한국');

    await user.click(screen.getByRole('button', { name: '등록하기' }));

    expect(teasApi.create).toHaveBeenCalledWith({
      name: '새로운 차',
      type: '녹차',
      year: 2024,
      seller: '새 찻집',
      origin: '한국',
    });

    await waitFor(() => {
      expect(toastMock.success).toHaveBeenCalledWith('차가 등록되었습니다.');
    });

    await waitFor(() => {
      expect(getNavigateSpy()).toHaveBeenCalledWith('/tea/3');
    }, { timeout: 2000 });
  });

  it('returnTo 파라미터가 있으면 해당 페이지로 이동한다', async () => {
    const user = userEvent.setup();
    renderNewTea('/tea/new?returnTo=/note/new&searchQuery=새차');

    const nameInput = screen.getByLabelText(/차 이름/);
    const 녹차Button = screen.getByRole('button', { name: '녹차' });

    await user.type(nameInput, '새차');
    await user.click(녹차Button);

    await user.click(screen.getByRole('button', { name: '등록하기' }));

    await waitFor(() => {
      expect(getNavigateSpy()).toHaveBeenCalledWith('/note/new?teaId=3');
    }, { timeout: 2000 });
  });

  it('중복된 차 이름을 입력하면 경고 메시지를 표시한다', async () => {
    const user = userEvent.setup();
    const { teasApi } = await import('../../lib/api');

    renderNewTea();

    const nameInput = screen.getByLabelText(/차 이름/);
    
    await user.type(nameInput, '정산소종');

    // debounce 대기 (500ms)
    await waitFor(() => {
      expect(teasApi.getAll).toHaveBeenCalled();
    }, { timeout: 1000 });

    await waitFor(() => {
      expect(screen.getByText(/동일한 이름의 차가 이미 등록되어 있습니다/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('중복 경고에서 기존 차 사용하기 버튼을 클릭하면 해당 차 상세 페이지로 이동한다', async () => {
    const user = userEvent.setup();
    const { teasApi } = await import('../../lib/api');

    renderNewTea('/tea/new?returnTo=/note/new');

    const nameInput = screen.getByLabelText(/차 이름/);
    
    await user.type(nameInput, '정산소종');

    await waitFor(() => {
      expect(screen.getByText(/동일한 이름의 차가 이미 등록되어 있습니다/)).toBeInTheDocument();
    }, { timeout: 2000 });

    const useExistingButton = screen.getByRole('button', { name: '기존 차 사용하기' });
    await user.click(useExistingButton);

    await waitFor(() => {
      expect(getNavigateSpy()).toHaveBeenCalledWith('/note/new?teaId=1');
    });
  });

  it('로그인하지 않은 사용자는 로그인 페이지로 리다이렉트된다', async () => {
    mockUseAuth.mockReturnValueOnce({
      isAuthenticated: false,
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      loginWithKakao: vi.fn(),
      logout: vi.fn(),
    });

    renderNewTea();

    await waitFor(() => {
      expect(getNavigateSpy()).toHaveBeenCalledWith('/login');
      expect(toastMock.error).toHaveBeenCalledWith('로그인이 필요합니다.');
    });
  });

  it('선택적 필드(연도, 구매처, 산지) 없이도 등록할 수 있다', async () => {
    const user = userEvent.setup();
    const { teasApi } = await import('../../lib/api');

    renderNewTea();

    const nameInput = screen.getByLabelText(/차 이름/);
    const 홍차Button = screen.getByRole('button', { name: '홍차' });

    await user.type(nameInput, '최소 정보 차');
    await user.click(홍차Button);

    await user.click(screen.getByRole('button', { name: '등록하기' }));

    expect(teasApi.create).toHaveBeenCalledWith({
      name: '최소 정보 차',
      type: '홍차',
      year: undefined,
      seller: undefined,
      origin: undefined,
    });
  });

  it('모든 차 종류 버튼이 표시된다', () => {
    renderNewTea();
    
    expect(screen.getByRole('button', { name: '녹차' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '홍차' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '우롱차' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '백차' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '흑차' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '대용차' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '황차' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '보이차' })).toBeInTheDocument();
  });
});

