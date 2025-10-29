import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardSummarySection } from '../DashboardSummarySection';
import { DashboardProvider } from '../../context/DashboardContext';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock useDashboardSummary hook
vi.mock('../../hooks/useDashboardSummary', () => ({
  useDashboardSummary: vi.fn(),
}));

// Mock formatDateKorean
vi.mock('@/lib/utils/date', () => ({
  formatDateKorean: vi.fn((date) => `2025년 1월 1일`),
}));

import { useDashboardSummary } from '../../hooks/useDashboardSummary';

const mockUseDashboardSummary = useDashboardSummary as any;

describe('DashboardSummarySection', () => {
  // RED: 초기 렌더링 테스트 - loading 상태
  it('should render loading skeleton when isLoading is true', () => {
    // Arrange: loading 상태 mock
    mockUseDashboardSummary.mockReturnValue({
      user: null,
      subscription: null,
      isLoading: true,
      error: null,
    });

    // Act: 컴포넌트 렌더링
    render(<DashboardSummarySection />);

    // Assert: Skeleton이 표시되는지 확인
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // RED: error 상태 렌더링 테스트
  it('should render error message when error exists', () => {
    // Arrange: error 상태 mock
    const errorMessage = '사용자 정보를 불러올 수 없습니다';
    mockUseDashboardSummary.mockReturnValue({
      user: null,
      subscription: null,
      isLoading: false,
      error: errorMessage,
    });

    // Act: 컴포넌트 렌더링
    render(<DashboardSummarySection />);

    // Assert: 에러 메시지가 표시되는지 확인
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  // RED: 무료 사용자 정보 렌더링 테스트
  it('should render free tier user information', () => {
    // Arrange: 무료 사용자 mock
    mockUseDashboardSummary.mockReturnValue({
      user: {
        id: '1',
        name: '홍길동',
        email: 'test@example.com',
        subscription_tier: 'free',
      },
      subscription: {
        remaining_count: 3,
      },
      isLoading: false,
      error: null,
    });

    // Act: 컴포넌트 렌더링
    render(<DashboardSummarySection />);

    // Assert: 사용자 정보가 표시되는지 확인
    expect(screen.getByText('홍길동님, 환영합니다')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('무료 체험')).toBeInTheDocument();
    expect(screen.getByText('3회')).toBeInTheDocument();
  });

  // RED: Pro 사용자 정보 렌더링 테스트
  it('should render pro tier user information with payment details', () => {
    // Arrange: Pro 사용자 mock
    mockUseDashboardSummary.mockReturnValue({
      user: {
        id: '1',
        name: '홍길동',
        email: 'test@example.com',
        subscription_tier: 'pro',
      },
      subscription: {
        remaining_count: 100,
        next_payment_date: '2025-02-01',
        card_last_4digits: '1234',
      },
      isLoading: false,
      error: null,
    });

    // Act: 컴포넌트 렌더링
    render(<DashboardSummarySection />);

    // Assert: Pro 사용자 정보가 표시되는지 확인
    expect(screen.getByText('홍길동님, 환영합니다')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('100회')).toBeInTheDocument();
    expect(screen.getByText(/다음 결제일:/)).toBeInTheDocument();
    expect(screen.getByText(/결제 카드:.*1234/)).toBeInTheDocument();
  });

  // RED: 무료 사용자 체험 횟수 소진 시 Pro 구독 링크 표시
  it('should show pro subscription link when free user has no remaining count', () => {
    // Arrange: 무료 사용자 체험 횟수 0
    mockUseDashboardSummary.mockReturnValue({
      user: {
        id: '1',
        name: '홍길동',
        email: 'test@example.com',
        subscription_tier: 'free',
      },
      subscription: {
        remaining_count: 0,
      },
      isLoading: false,
      error: null,
    });

    // Act: 컴포넌트 렌더링
    render(<DashboardSummarySection />);

    // Assert: Pro 구독 링크가 표시되는지 확인
    expect(screen.getByText('무료 체험 횟수를 모두 사용했습니다.')).toBeInTheDocument();
    expect(screen.getByText('Pro 구독하기')).toBeInTheDocument();
  });

  // RED: 새 분석하기 링크 렌더링 테스트
  it('should render new analysis link', () => {
    // Arrange: 정상 사용자 mock
    mockUseDashboardSummary.mockReturnValue({
      user: {
        id: '1',
        name: '홍길동',
        email: 'test@example.com',
        subscription_tier: 'free',
      },
      subscription: {
        remaining_count: 3,
      },
      isLoading: false,
      error: null,
    });

    // Act: 컴포넌트 렌더링
    render(<DashboardSummarySection />);

    // Assert: 새 분석하기 링크가 표시되는지 확인
    const newAnalysisLink = screen.getByText('새 분석하기');
    expect(newAnalysisLink).toBeInTheDocument();
    expect(newAnalysisLink.closest('a')).toHaveAttribute('href', '/analysis/new');
  });
});
