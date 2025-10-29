import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentMethodModal, ChangePaymentModal } from '../PaymentMethodModal';

// Mock Dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

// Mock RadioGroup
vi.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children, onValueChange }: any) => (
    <div onChange={(e: any) => onValueChange?.(e.target.value)}>{children}</div>
  ),
  RadioGroupItem: ({ value }: any) => <input type="radio" value={value} />,
}));

describe('PaymentMethodModal', () => {
  const mockOnClose = vi.fn();
  const mockOnAdd = vi.fn();

  describe('기본 렌더링', () => {
    it('should render when isOpen is true', () => {
      render(<PaymentMethodModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

      expect(screen.getByRole('heading', { name: '결제 수단 등록' })).toBeInTheDocument();
      expect(screen.getByText('구독 결제에 사용할 결제 수단을 등록해주세요')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      const { container } = render(
        <PaymentMethodModal isOpen={false} onClose={mockOnClose} onAdd={mockOnAdd} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render payment method options', () => {
      render(<PaymentMethodModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

      expect(screen.getByText('신용/체크카드')).toBeInTheDocument();
      expect(screen.getByText('간편결제')).toBeInTheDocument();
      expect(screen.getByText('계좌이체')).toBeInTheDocument();
    });

    it('should render current payment methods when provided', () => {
      const currentMethods = [
        {
          id: '1',
          type: 'CARD' as const,
          name: 'KB국민카드',
          last4: '1234',
          isDefault: true,
        },
      ];

      render(
        <PaymentMethodModal
          isOpen={true}
          onClose={mockOnClose}
          onAdd={mockOnAdd}
          currentMethods={currentMethods}
        />
      );

      expect(screen.getByText('현재 결제 수단')).toBeInTheDocument();
      expect(screen.getByText('KB국민카드')).toBeInTheDocument();
      expect(screen.getByText('**** 1234')).toBeInTheDocument();
    });
  });

  describe('약관 동의', () => {
    it('should disable submit button when terms not accepted', () => {
      render(<PaymentMethodModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

      const submitButton = screen.getByRole('button', { name: '결제 수단 등록' });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when terms accepted', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);

      const submitButton = screen.getByRole('button', { name: '결제 수단 등록' });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('사용자 인터랙션', () => {
    it('should call onAdd when submit button is clicked', async () => {
      const user = userEvent.setup();
      render(<PaymentMethodModal isOpen={true} onClose={mockOnClose} onAdd={mockOnAdd} />);

      const termsCheckbox = screen.getByRole('checkbox');
      await user.click(termsCheckbox);

      const submitButton = screen.getByRole('button', { name: '결제 수단 등록' });
      await user.click(submitButton);

      expect(mockOnAdd).toHaveBeenCalled();
    });
  });
});

describe('ChangePaymentModal', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  it('should render change payment modal', () => {
    render(<ChangePaymentModal isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

    expect(screen.getByText('결제 수단 변경')).toBeInTheDocument();
    expect(screen.getByText(/다음 결제부터 새로운 결제 수단이 적용됩니다/)).toBeInTheDocument();
  });

  it('should render current and new payment methods', () => {
    const currentMethod = {
      id: '1',
      type: 'CARD' as const,
      name: 'KB국민카드',
      last4: '1234',
    };

    const newMethod = {
      id: '2',
      type: 'CARD' as const,
      name: '신한카드',
      last4: '5678',
    };

    render(
      <ChangePaymentModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        currentMethod={currentMethod}
        newMethod={newMethod}
      />
    );

    expect(screen.getByText('현재 결제 수단')).toBeInTheDocument();
    expect(screen.getByText('KB국민카드')).toBeInTheDocument();
    expect(screen.getByText('새 결제 수단')).toBeInTheDocument();
    expect(screen.getByText('신한카드')).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    render(<ChangePaymentModal isOpen={true} onClose={mockOnClose} onConfirm={mockOnConfirm} />);

    const confirmButton = screen.getByText('변경 확인');
    await user.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalled();
  });
});
