import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteModal } from '../DeleteModal';

// Mock context
const mockCloseDeleteModal = vi.fn();
const mockDeleteAnalysis = vi.fn();

let mockContextValue = {
  state: {
    ui: {
      modals: {
        delete: {
          isOpen: true,
          isProcessing: false,
        },
      },
    },
  },
  actions: {
    closeDeleteModal: mockCloseDeleteModal,
    deleteAnalysis: mockDeleteAnalysis,
  },
};

vi.mock('../../context/AnalysisDetailContext', () => ({
  useAnalysisDetailContext: () => mockContextValue,
}));

describe('DeleteModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContextValue = {
      state: {
        ui: {
          modals: {
            delete: {
              isOpen: true,
              isProcessing: false,
            },
          },
        },
      },
      actions: {
        closeDeleteModal: mockCloseDeleteModal,
        deleteAnalysis: mockDeleteAnalysis,
      },
    };
  });

  describe('렌더링', () => {
    it('should render delete modal when isOpen is true', () => {
      render(<DeleteModal />);
      expect(screen.getByText('분석 결과 삭제')).toBeInTheDocument();
    });

    it('should render warning message', () => {
      render(<DeleteModal />);
      expect(screen.getByText(/정말로 이 분석 결과를 삭제하시겠습니까/)).toBeInTheDocument();
      expect(screen.getByText(/삭제된 데이터는 복구할 수 없습니다/)).toBeInTheDocument();
    });

    it('should render cancel and delete buttons', () => {
      render(<DeleteModal />);
      expect(screen.getByText('취소')).toBeInTheDocument();
      expect(screen.getByText('삭제')).toBeInTheDocument();
    });
  });

  describe('사용자 인터랙션', () => {
    it('should call closeDeleteModal when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<DeleteModal />);

      const cancelButton = screen.getByText('취소');
      await user.click(cancelButton);

      expect(mockCloseDeleteModal).toHaveBeenCalledOnce();
    });

    it('should call deleteAnalysis when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<DeleteModal />);

      const deleteButton = screen.getByText('삭제');
      await user.click(deleteButton);

      expect(mockDeleteAnalysis).toHaveBeenCalledOnce();
    });
  });

  describe('로딩 상태', () => {
    it('should show processing text when isProcessing is true', () => {
      mockContextValue.state.ui.modals.delete.isProcessing = true;
      render(<DeleteModal />);
      expect(screen.getByText('삭제 중...')).toBeInTheDocument();
    });

    it('should disable buttons when isProcessing is true', () => {
      mockContextValue.state.ui.modals.delete.isProcessing = true;
      render(<DeleteModal />);

      const cancelButton = screen.getByText('취소');
      const deleteButton = screen.getByText('삭제 중...');
      expect(cancelButton).toBeDisabled();
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('조건부 렌더링', () => {
    it('should return null when isOpen is false', () => {
      mockContextValue.state.ui.modals.delete.isOpen = false;
      const { container } = render(<DeleteModal />);
      expect(container.firstChild).toBeNull();
    });
  });
});
