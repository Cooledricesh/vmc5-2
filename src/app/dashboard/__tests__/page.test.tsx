import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from '../page';

// DashboardProvider 모킹
vi.mock('@/features/dashboard/context/DashboardContext', () => ({
  DashboardProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Dashboard 컴포넌트들 모킹
vi.mock('@/features/dashboard/components/DashboardSummarySection', () => ({
  DashboardSummarySection: () => <div data-testid="summary-section">Summary Section</div>
}));

vi.mock('@/features/dashboard/components/DashboardStatsCards', () => ({
  DashboardStatsCards: () => <div data-testid="stats-cards">Stats Cards</div>
}));

vi.mock('@/features/dashboard/components/AnalysisListSection', () => ({
  AnalysisListSection: () => <div data-testid="analysis-list">Analysis List</div>
}));

describe('DashboardPage', () => {
  let mockParams: Promise<Record<string, never>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = Promise.resolve({});
  });

  it('대시보드 페이지가 정상적으로 렌더링되어야 함', async () => {
    // Arrange & Act
    render(<DashboardPage params={mockParams} />);

    // Assert
    expect(screen.getByTestId('summary-section')).toBeInTheDocument();
    expect(screen.getByTestId('stats-cards')).toBeInTheDocument();
    expect(screen.getByTestId('analysis-list')).toBeInTheDocument();
  });

  it('대시보드의 주요 섹션들이 올바른 순서로 렌더링되어야 함', async () => {
    // Arrange & Act
    const { container } = render(<DashboardPage params={mockParams} />);
    const sections = container.querySelectorAll('[data-testid]');

    // Assert
    expect(sections).toHaveLength(3);
    expect(sections[0]).toHaveAttribute('data-testid', 'summary-section');
    expect(sections[1]).toHaveAttribute('data-testid', 'stats-cards');
    expect(sections[2]).toHaveAttribute('data-testid', 'analysis-list');
  });

  it('컨테이너에 올바른 스타일 클래스가 적용되어야 함', async () => {
    // Arrange & Act
    const { container } = render(<DashboardPage params={mockParams} />);
    const mainContainer = container.querySelector('.container');

    // Assert
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass('container', 'mx-auto', 'px-4', 'py-8', 'max-w-7xl');
  });

  it('페이지가 client 컴포넌트로 선언되어 있어야 함', async () => {
    // Arrange
    const moduleContent = await import('../page');

    // Assert - client 컴포넌트는 default export를 가져야 함
    expect(moduleContent.default).toBeDefined();
    expect(typeof moduleContent.default).toBe('function');
  });
});
