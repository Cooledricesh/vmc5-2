import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubscriptionModal, UpgradeModal, CancelSubscriptionModal } from '../SubscriptionModal';

// Mock Dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

describe('SubscriptionModal', () => {
  const mockOnClose = vi.fn();
  const mockOnClick = vi.fn();

  describe('기본 렌더링', () => {
    it('should render when isOpen is true', () => {
      render(
        <SubscriptionModal isOpen={true} onClose={mockOnClose} title="Test Title">
          <div>Test Content</div>
        </SubscriptionModal>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(
        <SubscriptionModal isOpen={false} onClose={mockOnClose} title="Test Title">
          <div>Test Content</div>
        </SubscriptionModal>
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render description when provided', () => {
      render(
        <SubscriptionModal
          isOpen={true}
          onClose={mockOnClose}
          title="Test Title"
          description="Test Description"
        >
          <div>Content</div>
        </SubscriptionModal>
      );

      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });
  });

  describe('액션 버튼', () => {
    it('should render primary and secondary buttons', () => {
      render(
        <SubscriptionModal
          isOpen={true}
          onClose={mockOnClose}
          title="Test"
          actions={{
            primary: { label: 'Primary', onClick: mockOnClick },
            secondary: { label: 'Secondary', onClick: mockOnClick },
          }}
        >
          <div>Content</div>
        </SubscriptionModal>
      );

      expect(screen.getByText('Primary')).toBeInTheDocument();
      expect(screen.getByText('Secondary')).toBeInTheDocument();
    });

    it('should show loading text when primary button is loading', () => {
      render(
        <SubscriptionModal
          isOpen={true}
          onClose={mockOnClose}
          title="Test"
          actions={{
            primary: { label: 'Submit', onClick: mockOnClick, loading: true },
          }}
        >
          <div>Content</div>
        </SubscriptionModal>
      );

      expect(screen.getByText('처리 중...')).toBeInTheDocument();
    });
  });
});

describe('UpgradeModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUpgrade = vi.fn();

  it('should render upgrade modal with benefits', () => {
    render(<UpgradeModal isOpen={true} onClose={mockOnClose} onUpgrade={mockOnUpgrade} />);

    expect(screen.getByText('Pro 멤버십으로 업그레이드')).toBeInTheDocument();
    expect(screen.getByText('₩9,900')).toBeInTheDocument();
    expect(screen.getByText('무제한 사주 분석')).toBeInTheDocument();
  });

  it('should call onUpgrade when upgrade button is clicked', async () => {
    const user = userEvent.setup();
    render(<UpgradeModal isOpen={true} onClose={mockOnClose} onUpgrade={mockOnUpgrade} />);

    const upgradeButton = screen.getByText(/월 9,900원으로 시작하기/);
    await user.click(upgradeButton);

    expect(mockOnUpgrade).toHaveBeenCalled();
  });

  it('should disable upgrade button when already pro', () => {
    render(
      <UpgradeModal
        isOpen={true}
        onClose={mockOnClose}
        onUpgrade={mockOnUpgrade}
        currentPlan="pro"
      />
    );

    const upgradeButton = screen.getByText(/월 9,900원으로 시작하기/);
    expect(upgradeButton).toBeDisabled();
  });
});

describe('CancelSubscriptionModal', () => {
  const mockOnClose = vi.fn();
  const mockOnCancel = vi.fn();

  it('should render cancel modal with reasons', () => {
    render(
      <CancelSubscriptionModal isOpen={true} onClose={mockOnClose} onCancel={mockOnCancel} />
    );

    expect(screen.getByText('정말 구독을 취소하시겠어요?')).toBeInTheDocument();
    expect(screen.getByText('가격이 비싸다고 생각해요')).toBeInTheDocument();
  });

  it('should disable cancel button when no reason selected', () => {
    render(
      <CancelSubscriptionModal isOpen={true} onClose={mockOnClose} onCancel={mockOnCancel} />
    );

    const cancelButton = screen.getByText('구독 취소');
    expect(cancelButton).toBeDisabled();
  });

  it('should enable cancel button when reason is selected', async () => {
    const user = userEvent.setup();
    render(
      <CancelSubscriptionModal isOpen={true} onClose={mockOnClose} onCancel={mockOnCancel} />
    );

    const reasonRadio = screen.getByLabelText('가격이 비싸다고 생각해요');
    await user.click(reasonRadio);

    const cancelButton = screen.getByText('구독 취소');
    expect(cancelButton).not.toBeDisabled();
  });
});
