import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CancelSubscriptionModalContainer } from '../CancelSubscriptionModalContainer';
import { apiClient } from '@/lib/remote/api-client';

// Mock Dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

// Mock API client
vi.mock('@/lib/remote/api-client', () => ({
  apiClient: {
    delete: vi.fn(),
  },
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('CancelSubscriptionModalContainer - Integration', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  describe('구독 해지 성공 시나리오', () => {
    it('should successfully cancel subscription with reason and feedback', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          subscription_id: '123',
          subscription_tier: 'pro',
          subscription_status: 'pending_cancellation',
          effective_until: '2024-12-31',
        },
      };

      vi.mocked(apiClient.delete).mockResolvedValueOnce(mockResponse);

      render(
        <CancelSubscriptionModalContainer
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { wrapper }
      );

      // 해지 사유 선택
      const reasonRadio = screen.getByLabelText('가격이 비싸다고 생각해요');
      await user.click(reasonRadio);

      // 구독 취소 버튼 클릭
      const cancelButton = screen.getByText('구독 취소');
      expect(cancelButton).not.toBeDisabled();
      await user.click(cancelButton);

      // API 호출 확인
      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalledWith('/api/subscription/cancel', {
          data: {
            cancellation_reason: 'expensive',
            feedback: undefined,
          },
        });
      });

      // 성공 토스트 표시
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '구독이 해지되었습니다',
            variant: 'default',
          })
        );
      });

      // onSuccess 콜백 호출
      expect(mockOnSuccess).toHaveBeenCalled();

      // 모달 닫힘
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should cancel subscription with "other" reason and custom feedback', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        data: {
          subscription_id: '123',
          subscription_tier: 'pro',
          subscription_status: 'pending_cancellation',
        },
      };

      vi.mocked(apiClient.delete).mockResolvedValueOnce(mockResponse);

      render(
        <CancelSubscriptionModalContainer
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { wrapper }
      );

      // "기타" 사유 선택
      const otherRadio = screen.getByLabelText('기타');
      await user.click(otherRadio);

      // 피드백 입력
      const feedbackTextarea = screen.getByPlaceholderText('서비스 개선에 도움이 됩니다...');
      await user.type(feedbackTextarea, '다른 서비스가 더 좋아요');

      // 구독 취소 버튼 클릭
      const cancelButton = screen.getByText('구독 취소');
      await user.click(cancelButton);

      // API 호출 확인 (피드백 포함)
      await waitFor(() => {
        expect(apiClient.delete).toHaveBeenCalledWith('/api/subscription/cancel', {
          data: {
            cancellation_reason: 'other',
            feedback: '다른 서비스가 더 좋아요',
          },
        });
      });
    });
  });

  describe('구독 해지 실패 시나리오', () => {
    it('should handle API error and show error toast', async () => {
      const user = userEvent.setup();
      const mockError = {
        response: {
          data: {
            error: {
              code: 'SUBSCRIPTION_NOT_FOUND',
              message: '활성 구독을 찾을 수 없습니다',
            },
          },
        },
      };

      vi.mocked(apiClient.delete).mockRejectedValueOnce(mockError);

      render(
        <CancelSubscriptionModalContainer
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { wrapper }
      );

      // 해지 사유 선택
      const reasonRadio = screen.getByLabelText('가격이 비싸다고 생각해요');
      await user.click(reasonRadio);

      // 구독 취소 버튼 클릭
      const cancelButton = screen.getByText('구독 취소');
      await user.click(cancelButton);

      // 에러 토스트 표시
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '구독 해지 실패',
            description: '활성 구독을 찾을 수 없습니다',
            variant: 'destructive',
          })
        );
      });

      // onSuccess는 호출되지 않음
      expect(mockOnSuccess).not.toHaveBeenCalled();

      // 모달은 열린 상태 유지
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      const user = userEvent.setup();
      vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('Network error'));

      render(
        <CancelSubscriptionModalContainer
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { wrapper }
      );

      const reasonRadio = screen.getByLabelText('일시적으로 사용을 중단하려고 해요');
      await user.click(reasonRadio);

      const cancelButton = screen.getByText('구독 취소');
      await user.click(cancelButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('UI 상태 관리', () => {
    it('should disable button when no reason is selected', () => {
      render(
        <CancelSubscriptionModalContainer
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { wrapper }
      );

      const cancelButton = screen.getByText('구독 취소');
      expect(cancelButton).toBeDisabled();
    });

    it('should show loading state during cancellation', async () => {
      const user = userEvent.setup();
      vi.mocked(apiClient.delete).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: {} }), 100))
      );

      render(
        <CancelSubscriptionModalContainer
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { wrapper }
      );

      const reasonRadio = screen.getByLabelText('기능이 유용하지 않아요');
      await user.click(reasonRadio);

      const cancelButton = screen.getByText('구독 취소');
      await user.click(cancelButton);

      // 로딩 중 텍스트 표시
      await waitFor(() => {
        expect(screen.getByText('처리 중...')).toBeInTheDocument();
      });

      // 버튼 비활성화
      expect(cancelButton).toBeDisabled();
    });

    it('should call onClose when "구독 유지" button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <CancelSubscriptionModalContainer
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />,
        { wrapper }
      );

      const keepButton = screen.getByText('구독 유지');
      await user.click(keepButton);

      expect(mockOnClose).toHaveBeenCalled();
      expect(apiClient.delete).not.toHaveBeenCalled();
    });
  });
});
