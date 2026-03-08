import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ReportModal } from '../ReportModal';
import { notesApi } from '../../lib/api';
import { toast } from 'sonner';

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    notesApi: {
      ...actual.notesApi,
      report: vi.fn(),
    },
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ReportModal', () => {
  const mockOnOpenChange = vi.fn();
  const noteId = 42;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('모달이 열렸을 때 제목과 신고 사유 목록을 표시해야 함', () => {
    render(<ReportModal open={true} onOpenChange={mockOnOpenChange} noteId={noteId} />);

    expect(screen.getByText('차록 신고')).toBeInTheDocument();
    expect(screen.getByText('신고 사유를 선택해주세요.')).toBeInTheDocument();
    expect(screen.getByText('스팸')).toBeInTheDocument();
    expect(screen.getByText('부적절한 내용')).toBeInTheDocument();
    expect(screen.getByText('저작권 침해')).toBeInTheDocument();
    expect(screen.getByText('기타')).toBeInTheDocument();
  });

  it('모달이 닫혔을 때 내용을 표시하지 않아야 함', () => {
    render(<ReportModal open={false} onOpenChange={mockOnOpenChange} noteId={noteId} />);

    expect(screen.queryByText('차록 신고')).not.toBeInTheDocument();
  });

  it('사유를 선택하지 않으면 신고하기 버튼이 비활성화되어야 함', () => {
    render(<ReportModal open={true} onOpenChange={mockOnOpenChange} noteId={noteId} />);

    const submitButton = screen.getByRole('button', { name: '신고하기' });
    expect(submitButton).toBeDisabled();
  });

  it('사유를 선택하면 신고하기 버튼이 활성화되어야 함', async () => {
    const user = userEvent.setup();
    render(<ReportModal open={true} onOpenChange={mockOnOpenChange} noteId={noteId} />);

    await user.click(screen.getByLabelText('스팸'));

    const submitButton = screen.getByRole('button', { name: '신고하기' });
    expect(submitButton).not.toBeDisabled();
  });

  it('신고 제출 성공 시 API가 호출되고 toast.success가 표시되어야 함', async () => {
    const user = userEvent.setup();
    vi.mocked(notesApi.report).mockResolvedValue({ id: 1, message: '신고가 접수되었습니다.' });

    render(<ReportModal open={true} onOpenChange={mockOnOpenChange} noteId={noteId} />);

    await user.click(screen.getByLabelText('스팸'));
    await user.click(screen.getByRole('button', { name: '신고하기' }));

    await waitFor(() => {
      expect(notesApi.report).toHaveBeenCalledWith(noteId, 'spam');
      expect(toast.success).toHaveBeenCalledWith('신고가 접수되었습니다.');
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('신고 제출 실패 시 toast.error가 표시되어야 함', async () => {
    const user = userEvent.setup();
    vi.mocked(notesApi.report).mockRejectedValue(new Error('Network error'));

    render(<ReportModal open={true} onOpenChange={mockOnOpenChange} noteId={noteId} />);

    await user.click(screen.getByLabelText('부적절한 내용'));
    await user.click(screen.getByRole('button', { name: '신고하기' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('신고 접수에 실패했습니다. 다시 시도해주세요.');
    });
  });

  it('취소 버튼 클릭 시 onOpenChange(false)가 호출되어야 함', async () => {
    const user = userEvent.setup();
    render(<ReportModal open={true} onOpenChange={mockOnOpenChange} noteId={noteId} />);

    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
