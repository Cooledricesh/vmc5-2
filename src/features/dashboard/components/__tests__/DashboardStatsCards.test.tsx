import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardStatsCards } from '../DashboardStatsCards';

// Mock useDashboardStats hook
vi.mock('../../hooks/useDashboardStats', () => ({
  useDashboardStats: vi.fn(),
}));

import { useDashboardStats } from '../../hooks/useDashboardStats';

const mockUseDashboardStats = useDashboardStats as any;

describe('DashboardStatsCards', () => {
  // RED: loading 상태 렌더링 테스트
  it('should render loading skeletons when isLoading is true', () => {
    // Arrange: loading 상태 mock
    mockUseDashboardStats.mockReturnValue({
      total_count: 0,
      monthly_count: 0,
      this_week_count: 0,
      isLoading: true,
      error: null,
    });

    // Act: 컴포넌트 렌더링
    render(<DashboardStatsCards />);

    // Assert: 3개의 카드 스켈레톤이 표시되는지 확인
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // RED: error 상태 렌더링 테스트
  it('should render error message when error exists', () => {
    // Arrange: error 상태 mock
    const errorMessage = '통계 정보를 불러올 수 없습니다';
    mockUseDashboardStats.mockReturnValue({
      total_count: 0,
      monthly_count: 0,
      this_week_count: 0,
      isLoading: false,
      error: errorMessage,
    });

    // Act: 컴포넌트 렌더링
    render(<DashboardStatsCards />);

    // Assert: 에러 메시지가 표시되는지 확인
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  // RED: 통계 데이터 렌더링 테스트
  it('should render stats data correctly', () => {
    // Arrange: 통계 데이터 mock
    mockUseDashboardStats.mockReturnValue({
      total_count: 42,
      monthly_count: 15,
      this_week_count: 5,
      isLoading: false,
      error: null,
    });

    // Act: 컴포넌트 렌더링
    render(<DashboardStatsCards />);

    // Assert: 각 통계 카드가 올바르게 표시되는지 확인
    expect(screen.getByText('총 분석 횟수')).toBeInTheDocument();
    expect(screen.getByText('42회')).toBeInTheDocument();
    expect(screen.getByText('전체 분석 이력')).toBeInTheDocument();

    expect(screen.getByText('이번 달 분석')).toBeInTheDocument();
    expect(screen.getByText('15회')).toBeInTheDocument();
    expect(screen.getByText('이번 달 분석 횟수')).toBeInTheDocument();

    expect(screen.getByText('이번 주 분석')).toBeInTheDocument();
    expect(screen.getByText('5회')).toBeInTheDocument();
    expect(screen.getByText('이번 주 분석 횟수')).toBeInTheDocument();
  });

  // RED: 0건 통계 렌더링 테스트
  it('should render zero stats correctly', () => {
    // Arrange: 0건 통계 mock
    mockUseDashboardStats.mockReturnValue({
      total_count: 0,
      monthly_count: 0,
      this_week_count: 0,
      isLoading: false,
      error: null,
    });

    // Act: 컴포넌트 렌더링
    render(<DashboardStatsCards />);

    // Assert: 0회가 올바르게 표시되는지 확인
    const zeroStats = screen.getAllByText('0회');
    expect(zeroStats).toHaveLength(3);
  });

  // RED: 아이콘 렌더링 테스트
  it('should render icons for each stat card', () => {
    // Arrange: 통계 데이터 mock
    mockUseDashboardStats.mockReturnValue({
      total_count: 10,
      monthly_count: 5,
      this_week_count: 2,
      isLoading: false,
      error: null,
    });

    // Act: 컴포넌트 렌더링
    const { container } = render(<DashboardStatsCards />);

    // Assert: SVG 아이콘이 렌더링되는지 확인 (lucide-react 아이콘은 SVG로 렌더링됨)
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBe(3);
  });

  // RED: 그리드 레이아웃 렌더링 테스트
  it('should render cards in grid layout', () => {
    // Arrange: 통계 데이터 mock
    mockUseDashboardStats.mockReturnValue({
      total_count: 10,
      monthly_count: 5,
      this_week_count: 2,
      isLoading: false,
      error: null,
    });

    // Act: 컴포넌트 렌더링
    const { container } = render(<DashboardStatsCards />);

    // Assert: grid 클래스가 적용되었는지 확인
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-3');
  });
});
