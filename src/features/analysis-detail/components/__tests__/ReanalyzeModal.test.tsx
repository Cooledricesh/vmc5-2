import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReanalyzeModal } from '../ReanalyzeModal';

// Mock context
const mockCloseReanalyzeModal = vi.fn();
const mockReanalyzeAnalysis = vi.fn();

let mockContextValue = {
  state: {
    analysis: {
      data: {
        id: 'test-id',
        subject_name: '홍길동',
        birth_date: '1990-01-01',
        birth_time: '12:00',
        gender: 'male',
      },
    },
    user: {
      remaining_count: 10,
    },
    ui: {
      modals: {
        reanalyze: {
          isOpen: true,
          isProcessing: false,
        },
      },
    },
  },
  actions: {
    closeReanalyzeModal: mockCloseReanalyzeModal,
    reanalyzeAnalysis: mockReanalyzeAnalysis,
  },
  computed: {
    genderIcon: '👨',
  },
};

vi.mock('../../context/AnalysisDetailContext', () => ({
  useAnalysisDetailContext: () => mockContextValue,
}));

describe('ReanalyzeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContextValue = {
      state: {
        analysis: {
          data: {
            id: 'test-id',
            subject_name: '홍길동',
            birth_date: '1990-01-01',
            birth_time: '12:00',
            gender: 'male',
          },
        } as any,
        user: {
          remaining_count: 10,
        },
        ui: {
          modals: {
            reanalyze: {
              isOpen: true,
              isProcessing: false,
            },
          },
        },
      } as any,
      actions: {
        closeReanalyzeModal: mockCloseReanalyzeModal,
        reanalyzeAnalysis: mockReanalyzeAnalysis,
      },
      computed: {
        genderIcon: '👨',
      },
    };
  });

  describe('렌더링', () => {
    it('should render reanalyze modal when isOpen is true', () => {
      render(<ReanalyzeModal />);
      expect(screen.getByText('재분석')).toBeInTheDocument();
    });

    it('should render subject information', () => {
      render(<ReanalyzeModal />);
      expect(screen.getByText(/홍길동/)).toBeInTheDocument();
      expect(screen.getByText(/1990-01-01/)).toBeInTheDocument();
      expect(screen.getByText(/12:00/)).toBeInTheDocument();
    });

    it('should render remaining count', () => {
      render(<ReanalyzeModal />);
      expect(screen.getByText('남은 분석 횟수')).toBeInTheDocument();
      expect(screen.getByText('10회')).toBeInTheDocument();
    });

    it('should render cancel and reanalyze buttons', () => {
      render(<ReanalyzeModal />);
      expect(screen.getByText('취소')).toBeInTheDocument();
      expect(screen.getByText('재분석 시작')).toBeInTheDocument();
    });

    it('should render info message', () => {
      render(<ReanalyzeModal />);
      expect(
        screen.getByText(/재분석은 최신 AI 모델을 사용하여 더 정확한 결과를 제공합니다/)
      ).toBeInTheDocument();
    });
  });

  describe('사용자 인터랙션', () => {
    it('should call closeReanalyzeModal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<ReanalyzeModal />);

      const cancelButton = screen.getByText('취소');
      await user.click(cancelButton);

      expect(mockCloseReanalyzeModal).toHaveBeenCalledOnce();
    });

    it('should call reanalyzeAnalysis when reanalyze button is clicked', async () => {
      const user = userEvent.setup();
      render(<ReanalyzeModal />);

      const reanalyzeButton = screen.getByText('재분석 시작');
      await user.click(reanalyzeButton);

      expect(mockReanalyzeAnalysis).toHaveBeenCalledOnce();
    });
  });

  describe('로딩 상태', () => {
    it('should show processing text when isProcessing is true', () => {
      mockContextValue.state.ui.modals.reanalyze.isProcessing = true;
      render(<ReanalyzeModal />);
      expect(screen.getByText('재분석 중...')).toBeInTheDocument();
    });

    it('should disable buttons when isProcessing is true', () => {
      mockContextValue.state.ui.modals.reanalyze.isProcessing = true;
      render(<ReanalyzeModal />);

      const cancelButton = screen.getByText('취소');
      const reanalyzeButton = screen.getByText('재분석 중...');
      expect(cancelButton).toBeDisabled();
      expect(reanalyzeButton).toBeDisabled();
    });
  });

  describe('조건부 렌더링', () => {
    it('should return null when isOpen is false', () => {
      mockContextValue.state.ui.modals.reanalyze.isOpen = false;
      const { container } = render(<ReanalyzeModal />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null when data is not available', () => {
      mockContextValue.state.analysis.data = null;
      const { container } = render(<ReanalyzeModal />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render birth_time when it is null', () => {
      mockContextValue.state.analysis.data = {
        ...mockContextValue.state.analysis.data,
        birth_time: null,
      };
      render(<ReanalyzeModal />);
      expect(screen.queryByText('출생시간')).not.toBeInTheDocument();
    });
  });
});
