import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TagInput } from '../TagInput';

describe('TagInput 컴포넌트', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('초기 상태에서 태그 입력 필드를 렌더링해야 함', () => {
    render(<TagInput tags={[]} onChange={mockOnChange} />);

    expect(screen.getByPlaceholderText(/태그를 입력하거나 추천 태그를 선택하세요/)).toBeInTheDocument();
  });

  it('기존 태그를 표시해야 함', () => {
    const tags = ['풀향', '허브향'];
    render(<TagInput tags={tags} onChange={mockOnChange} />);

    expect(screen.getByText('풀향')).toBeInTheDocument();
    expect(screen.getByText('허브향')).toBeInTheDocument();
  });

  it('Enter 키로 태그를 추가해야 함', async () => {
    const user = userEvent.setup();
    render(<TagInput tags={[]} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(/태그를 입력하거나 추천 태그를 선택하세요/);
    await user.type(input, '새태그');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(['새태그']);
    });
  });

  it('중복 태그는 추가하지 않아야 함', async () => {
    const user = userEvent.setup();
    render(<TagInput tags={['기존태그']} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(/태그를 입력하거나 추천 태그를 선택하세요/);
    await user.type(input, '기존태그');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  it('빈 태그는 추가하지 않아야 함', async () => {
    const user = userEvent.setup();
    render(<TagInput tags={[]} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(/태그를 입력하거나 추천 태그를 선택하세요/);
    await user.type(input, '   '); // 공백만 입력
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  it('태그 삭제 버튼을 클릭하면 태그를 제거해야 함', async () => {
    const user = userEvent.setup();
    render(<TagInput tags={['태그1', '태그2']} onChange={mockOnChange} />);

    // 태그가 렌더링되었는지 확인
    expect(screen.getByText('태그1')).toBeInTheDocument();
    expect(screen.getByText('태그2')).toBeInTheDocument();

    // 삭제 버튼 찾기 (aria-label 사용)
    const deleteButton = screen.getByRole('button', { name: /태그1 태그 삭제/ });
    await user.click(deleteButton);

    expect(mockOnChange).toHaveBeenCalledWith(['태그2']);
  });

  it('최대 태그 개수에 도달하면 입력 필드가 비활성화되어야 함', () => {
    const tags = Array.from({ length: 10 }, (_, i) => `태그${i + 1}`);
    render(<TagInput tags={tags} onChange={mockOnChange} maxTags={10} />);

    const input = screen.getByPlaceholderText(/태그를 입력하거나 추천 태그를 선택하세요/);
    expect(input).toBeDisabled();
  });

  it('추천 태그를 클릭하면 태그를 추가해야 함', async () => {
    const user = userEvent.setup();
    render(<TagInput tags={[]} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(/태그를 입력하거나 추천 태그를 선택하세요/);
    await user.type(input, '꽃');

    // 추천 태그 목록이 나타날 때까지 대기
    await waitFor(() => {
      const suggestionButton = screen.queryByRole('button', { name: /꽃향/ });
      expect(suggestionButton).toBeInTheDocument();
    }, { timeout: 3000 });

    const suggestionButton = screen.getByRole('button', { name: /꽃향/ });
    await user.click(suggestionButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(['꽃향']);
    });
  });

  it('한글 입력 중 Enter 키를 눌러도 태그가 중복 추가되지 않아야 함', async () => {
    const user = userEvent.setup();
    render(<TagInput tags={[]} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(/태그를 입력하거나 추천 태그를 선택하세요/);
    
    // 한글 입력 시뮬레이션
    await user.type(input, '귀여워');
    
    // 조합 완료 대기
    await waitFor(() => {
      expect(input).toHaveValue('귀여워');
    });

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith(['귀여워']);
    });
  });

  it('Backspace 키로 빈 입력 상태에서 마지막 태그를 제거해야 함', async () => {
    const user = userEvent.setup();
    render(<TagInput tags={['태그1', '태그2']} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(/태그를 입력하거나 추천 태그를 선택하세요/);
    await user.click(input);
    await user.keyboard('{Backspace}');

    expect(mockOnChange).toHaveBeenCalledWith(['태그1']);
  });

  it('Escape 키로 추천 목록을 닫아야 함', async () => {
    const user = userEvent.setup();
    render(<TagInput tags={[]} onChange={mockOnChange} />);

    const input = screen.getByPlaceholderText(/태그를 입력하거나 추천 태그를 선택하세요/);
    await user.type(input, '꽃');

    // 추천 태그 버튼이 나타날 때까지 대기
    await waitFor(() => {
      const suggestionButton = screen.queryByRole('button', { name: /꽃향/ });
      expect(suggestionButton).toBeInTheDocument();
    }, { timeout: 3000 });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      const suggestionButton = screen.queryByRole('button', { name: /꽃향/ });
      expect(suggestionButton).not.toBeInTheDocument();
    });
  });
});

