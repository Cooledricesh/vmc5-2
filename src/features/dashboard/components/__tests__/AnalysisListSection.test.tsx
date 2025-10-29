import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnalysisListSection } from '../AnalysisListSection';
import React from 'react';

// Mock dashboard hooks
vi.mock('../../hooks/useDashboardAnalyses', () => ({
  useDashboardAnalyses: vi.fn(),
}));

// Mock constants
vi.mock('../../lib/constants', () => ({
  PERIOD_OPTIONS: [
    { value: 'all', label: '전체' },
    { value: '7days', label: '최근 7일' },
  ],
  SORT_OPTIONS: [
    { value: 'latest', label: '최신순' },
    { value: 'oldest', label: '오래된순' },
  ],
  POLLING_INTERVAL: 5000,
  MAX_POLLING_COUNT: 12,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,
  CACHE_TIME: {
    SUMMARY: 5 * 60 * 1000,
    STATS: 5 * 60 * 1000,
    ANALYSES: 1 * 60 * 1000,
  },
  STATUS_LABELS: {
    processing: '처리 중',
    completed: '완료',
    failed: '실패',
  },
  AI_MODEL_LABELS: {
    'gemini-2.0-flash': 'Flash',
    'gemini-2.0-pro': 'Pro',
  },
  GENDER_LABELS: {
    male: '남성',
    female: '여성',
  },
  SUBSCRIPTION_STATUS_LABELS: {
    active: '활성',
    pending_cancellation: '해지 예정',
    suspended: '일시 중단',
  },
}));

// Mock child components
vi.mock('../FilterBar', () => ({
  FilterBar: () => <div data-testid="filter-bar">FilterBar</div>,
}));

vi.mock('../AnalysisCard', () => ({
  AnalysisCard: ({ analysis }: any) => (
    <div data-testid={`analysis-card-${analysis.id}`}>{analysis.name}</div>
  ),
}));

vi.mock('../PaginationControls', () => ({
  PaginationControls: () => <div data-testid="pagination-controls">PaginationControls</div>,
}));

vi.mock('../EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state">EmptyState</div>,
}));

import { useDashboardAnalyses } from '../../hooks/useDashboardAnalyses';

const mockUseDashboardAnalyses = useDashboardAnalyses as any;

// Mock DashboardContext
const mockDashboardContext = (overrides = {}) => {
  return {
    state: {
      pagination: { current_page: 1 },
      analyses: {
        analyses: [],
        pagination: { total_pages: 1, total_count: 0 },
        isLoading: false,
        error: null,
      },
      userSummary: { user: null, subscription: null, isLoading: false, error: null },
      stats: { total_count: 0, monthly_count: 0, this_week_count: 0, isLoading: false, error: null },
      filters: { period: 'all', sort: 'latest' },
      polling: { isPolling: false, pollingCount: 0 },
    },
    actions: {
      fetchSummary: vi.fn(),
      fetchStats: vi.fn(),
      fetchAnalyses: vi.fn(),
      setPeriod: vi.fn(),
      setSort: vi.fn(),
      resetFilters: vi.fn(),
      setPage: vi.fn(),
      startPolling: vi.fn(),
      stopPolling: vi.fn(),
    },
    computed: {
      hasProcessingAnalyses: false,
      isEmpty: false,
      isInitialLoading: false,
    },
    ...overrides,
  };
};

describe('AnalysisListSection', () => {
  // RED: loading 상태 렌더링 테스트
  it('should render loading skeletons when isLoading is true', () => {
    // Arrange: loading 상태 mock
    mockUseDashboardAnalyses.mockReturnValue({
      analyses: [],
      isLoading: true,
      error: null,
    });

    vi.spyOn(React, 'useContext').mockReturnValue(
      mockDashboardContext({
        computed: { isEmpty: false },
      })
    );

    // Act: 컴포넌트 렌더링
    render(<AnalysisListSection />);

    // Assert: FilterBar와 skeleton이 표시됨
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // RED: error 상태 렌더링 테스트
  it('should render error message when error exists', () => {
    // Arrange: error 상태 mock
    const errorMessage = '분석 목록을 불러올 수 없습니다';
    mockUseDashboardAnalyses.mockReturnValue({
      analyses: [],
      isLoading: false,
      error: errorMessage,
    });

    vi.spyOn(React, 'useContext').mockReturnValue(
      mockDashboardContext({
        computed: { isEmpty: false },
      })
    );

    // Act: 컴포넌트 렌더링
    render(<AnalysisListSection />);

    // Assert: 에러 메시지가 표시됨
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
  });

  // RED: empty 상태 렌더링 테스트
  it('should render EmptyState when computed.isEmpty is true', () => {
    // Arrange: empty 상태 mock
    mockUseDashboardAnalyses.mockReturnValue({
      analyses: [],
      isLoading: false,
      error: null,
    });

    vi.spyOn(React, 'useContext').mockReturnValue(
      mockDashboardContext({
        computed: { isEmpty: true },
      })
    );

    // Act: 컴포넌트 렌더링
    render(<AnalysisListSection />);

    // Assert: EmptyState가 표시됨
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  // RED: 분석 목록 렌더링 테스트
  it('should render analysis cards when analyses exist', () => {
    // Arrange: 분석 목록 mock
    const mockAnalyses = [
      { id: '1', name: '홍길동', created_at: '2025-01-01', status: 'completed' },
      { id: '2', name: '김철수', created_at: '2025-01-02', status: 'completed' },
      { id: '3', name: '이영희', created_at: '2025-01-03', status: 'processing' },
    ];

    mockUseDashboardAnalyses.mockReturnValue({
      analyses: mockAnalyses,
      isLoading: false,
      error: null,
    });

    vi.spyOn(React, 'useContext').mockReturnValue(
      mockDashboardContext({
        computed: { isEmpty: false },
      })
    );

    // Act: 컴포넌트 렌더링
    render(<AnalysisListSection />);

    // Assert: 모든 분석 카드가 표시됨
    expect(screen.getByTestId('analysis-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('analysis-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('analysis-card-3')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('김철수')).toBeInTheDocument();
    expect(screen.getByText('이영희')).toBeInTheDocument();
  });

  // RED: FilterBar와 PaginationControls 렌더링 테스트
  it('should render FilterBar and PaginationControls with analyses', () => {
    // Arrange: 분석 목록 mock
    const mockAnalyses = [
      { id: '1', name: '홍길동', created_at: '2025-01-01', status: 'completed' },
    ];

    mockUseDashboardAnalyses.mockReturnValue({
      analyses: mockAnalyses,
      isLoading: false,
      error: null,
    });

    vi.spyOn(React, 'useContext').mockReturnValue(
      mockDashboardContext({
        computed: { isEmpty: false },
      })
    );

    // Act: 컴포넌트 렌더링
    render(<AnalysisListSection />);

    // Assert: FilterBar와 PaginationControls가 표시됨
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
    expect(screen.getByTestId('pagination-controls')).toBeInTheDocument();
  });

  // RED: 그리드 레이아웃 렌더링 테스트
  it('should render cards in grid layout', () => {
    // Arrange: 분석 목록 mock
    const mockAnalyses = [
      { id: '1', name: '홍길동', created_at: '2025-01-01', status: 'completed' },
    ];

    mockUseDashboardAnalyses.mockReturnValue({
      analyses: mockAnalyses,
      isLoading: false,
      error: null,
    });

    vi.spyOn(React, 'useContext').mockReturnValue(
      mockDashboardContext({
        computed: { isEmpty: false },
      })
    );

    // Act: 컴포넌트 렌더링
    const { container } = render(<AnalysisListSection />);

    // Assert: grid 클래스가 적용되었는지 확인
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toBeInTheDocument();
    expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });
});
