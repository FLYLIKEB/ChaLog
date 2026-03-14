import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Onboarding } from '../Onboarding';
import { MemoryRouter } from 'react-router-dom';
import { usersApi } from '../../lib/api';
import { UserOnboardingPreference } from '../../types';

const mockNavigate = vi.fn();
const mockRefreshOnboardingStatus = vi.fn();
const mockUseAuth = vi.fn(() => ({
  user: { id: 1, name: '테스트 사용자', email: 'test@example.com' },
  isLoading: false,
  refreshOnboardingStatus: mockRefreshOnboardingStatus,
}));

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    usersApi: {
      getOnboardingPreference: vi.fn(),
      updateOnboardingPreference: vi.fn(),
    },
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../components/Header', () => ({
  Header: ({ title }: { title: string }) => <header>{title}</header>,
}));

vi.mock('../../components/OnboardingTagSelector', () => ({
  OnboardingTagSelector: ({
    title,
    tags,
    selectedTags,
    onToggle,
  }: {
    title: string;
    tags: string[];
    selectedTags: string[];
    onToggle: (tag: string) => void;
  }) => (
    <div>
      <span>{title}</span>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onToggle(tag)}
          aria-pressed={selectedTags.includes(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../../components/RatingGuideModal', () => ({
  RatingGuideModal: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

const mockEmptyPreference: UserOnboardingPreference = {
  preferredTeaTypes: [],
  preferredFlavorTags: [],
  hasCompletedOnboarding: false,
};

describe('Onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: '테스트 사용자', email: 'test@example.com' },
      isLoading: false,
      refreshOnboardingStatus: mockRefreshOnboardingStatus,
    });
    vi.mocked(usersApi.getOnboardingPreference).mockResolvedValue(mockEmptyPreference);
    vi.mocked(usersApi.updateOnboardingPreference).mockResolvedValue(mockEmptyPreference);
    mockRefreshOnboardingStatus.mockResolvedValue(true);
  });

  it('1단계(관심 차종) 화면을 표시해야 함', async () => {
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('관심 차종')).toBeInTheDocument();
    });
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('비로그인 상태면 /login으로 이동해야 함', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      refreshOnboardingStatus: mockRefreshOnboardingStatus,
    });

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  it('차종 선택 후 다음 버튼 클릭 시 2단계로 이동해야 함', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('관심 차종')).toBeInTheDocument();
    });

    // 차종 태그 중 첫 번째 클릭
    const teaButtons = screen.getAllByRole('button', { name: /녹차|홍차|백차/ });
    await user.click(teaButtons[0]);

    const nextButton = screen.getByRole('button', { name: '다음' });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('2/3')).toBeInTheDocument();
    });
  });

  it('차종 미선택 상태에서 다음 클릭 시 에러 메시지를 표시해야 함', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('관심 차종')).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: '다음' });
    await user.click(nextButton);

    // 2단계로 이동하지 않음
    expect(screen.queryByText('2/3')).not.toBeInTheDocument();
  });

  it('3단계에서 완료 버튼 클릭 시 updateOnboardingPreference를 호출해야 함', async () => {
    const user = userEvent.setup();
    vi.mocked(usersApi.getOnboardingPreference).mockResolvedValue({
      preferredTeaTypes: ['녹차'],
      preferredFlavorTags: ['꽃향'],
      hasCompletedOnboarding: false,
    });

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('관심 차종')).toBeInTheDocument();
    });

    // step1: 다음
    const nextBtn1 = screen.getByRole('button', { name: '다음' });
    await user.click(nextBtn1);

    // step2: 다음
    await waitFor(() => expect(screen.getByText('2/3')).toBeInTheDocument());
    const nextBtn2 = screen.getByRole('button', { name: '다음' });
    await user.click(nextBtn2);

    // step3: 완료
    await waitFor(() => expect(screen.getByText('3/3')).toBeInTheDocument());
    const completeBtn = screen.getByRole('button', { name: '완료' });
    await user.click(completeBtn);

    await waitFor(() => {
      expect(usersApi.updateOnboardingPreference).toHaveBeenCalledWith(1, {
        preferredTeaTypes: ['녹차'],
        preferredFlavorTags: ['꽃향'],
      });
    });
  });

  it('온보딩 저장 성공 시 refreshOnboardingStatus를 호출해야 함', async () => {
    const user = userEvent.setup();
    vi.mocked(usersApi.getOnboardingPreference).mockResolvedValue({
      preferredTeaTypes: ['녹차'],
      preferredFlavorTags: ['꽃향'],
      hasCompletedOnboarding: false,
    });

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('관심 차종')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(screen.getByText('2/3')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(screen.getByText('3/3')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '완료' }));

    await waitFor(() => {
      expect(mockRefreshOnboardingStatus).toHaveBeenCalledWith(1);
    });
  });

  it('온보딩 저장 실패 시 에러 toast를 표시해야 함', async () => {
    const user = userEvent.setup();
    vi.mocked(usersApi.getOnboardingPreference).mockResolvedValue({
      preferredTeaTypes: ['녹차'],
      preferredFlavorTags: ['꽃향'],
      hasCompletedOnboarding: false,
    });
    vi.mocked(usersApi.updateOnboardingPreference).mockRejectedValue(new Error('서버 오류'));

    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('관심 차종')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(screen.getByText('2/3')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(screen.getByText('3/3')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '완료' }));

    await waitFor(() => {
      expect(usersApi.updateOnboardingPreference).toHaveBeenCalled();
    });
    // refreshOnboardingStatus는 호출되지 않아야 함
    expect(mockRefreshOnboardingStatus).not.toHaveBeenCalled();
  });
});
