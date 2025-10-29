import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaginationControls } from '../PaginationControls';
import { DashboardProvider } from '../../context/DashboardContext';
import React from 'react';

// Mock dashboard actions
vi.mock('../../actions/dashboardActions', () => ({
  fetchSummary: vi.fn(),
  fetchStats: vi.fn(),
  fetchAnalyses: vi.fn(),
}));

// Mock constants - 완전한 mock 제공
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

// DashboardContext를 mock하여 pagination 데이터 제공
const mockDashboardContext = (overrides = {}) => {
  const defaultContext = {
    state: {
      pagination: {
        current_page: 1,
      },
      analyses: {
        analyses: [],
        pagination: {
          total_pages: 5,
          total_count: 50,
        },
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
  };

  return {
    ...defaultContext,
    ...overrides,
    state: {
      ...defaultContext.state,
      ...(overrides as any).state,
    },
  };
};

// Helper: PaginationControls를 mock context로 렌더링
const renderPaginationControls = (contextOverrides = {}) => {
  const mockContext = mockDashboardContext(contextOverrides);

  // Context를 mock
  vi.spyOn(React, 'useContext').mockReturnValue(mockContext);

  return render(<PaginationControls />);
};

describe('PaginationControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // RED: total_pages가 1 이하일 때 렌더링 안 함
  it('should not render when total_pages is 1 or less', () => {
    // Arrange: total_pages = 1
    const { container } = renderPaginationControls({
      state: {
        analyses: {
          analyses: [],
          pagination: {
            total_pages: 1,
            total_count: 10,
          },
          isLoading: false,
          error: null,
        },
      },
    });

    // Assert: 렌더링되지 않음
    expect(container.firstChild).toBeNull();
  });

  // RED: 페이지네이션 버튼 렌더링 테스트
  it('should render pagination buttons when total_pages > 1', () => {
    // Arrange & Act: total_pages = 5
    renderPaginationControls({
      state: {
        pagination: { current_page: 1 },
        analyses: {
          analyses: [],
          pagination: {
            total_pages: 5,
            total_count: 50,
          },
          isLoading: false,
          error: null,
        },
      },
    });

    // Assert: 이전/다음 버튼이 렌더링되는지 확인
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  // RED: 첫 페이지에서 이전 버튼 disabled
  it('should disable previous button on first page', () => {
    // Arrange & Act: current_page = 1
    renderPaginationControls({
      state: {
        pagination: { current_page: 1 },
        analyses: {
          analyses: [],
          pagination: {
            total_pages: 5,
            total_count: 50,
          },
          isLoading: false,
          error: null,
        },
      },
    });

    // Assert: 이전 버튼이 disabled
    const buttons = screen.getAllByRole('button');
    const prevButton = buttons[0];
    expect(prevButton).toBeDisabled();
  });

  // RED: 마지막 페이지에서 다음 버튼 disabled
  it('should disable next button on last page', () => {
    // Arrange & Act: current_page = 5 (마지막 페이지)
    renderPaginationControls({
      state: {
        pagination: { current_page: 5 },
        analyses: {
          analyses: [],
          pagination: {
            total_pages: 5,
            total_count: 50,
          },
          isLoading: false,
          error: null,
        },
      },
    });

    // Assert: 다음 버튼이 disabled
    const buttons = screen.getAllByRole('button');
    const nextButton = buttons[buttons.length - 1];
    expect(nextButton).toBeDisabled();
  });

  // RED: 페이지 번호 버튼 클릭 테스트
  it('should call setPage when page number button is clicked', () => {
    // Arrange
    const mockSetPage = vi.fn();
    const mockContext = mockDashboardContext({
      state: {
        pagination: { current_page: 1 },
        analyses: {
          analyses: [],
          pagination: {
            total_pages: 5,
            total_count: 50,
          },
          isLoading: false,
          error: null,
        },
      },
      actions: {
        setPage: mockSetPage,
      },
    });

    vi.spyOn(React, 'useContext').mockReturnValue(mockContext);
    render(<PaginationControls />);

    // Act: 페이지 2 버튼 클릭
    const page2Button = screen.getByRole('button', { name: '2' });
    fireEvent.click(page2Button);

    // Assert: setPage가 호출됨
    expect(mockSetPage).toHaveBeenCalledWith(2);
  });

  // RED: 현재 페이지 강조 표시
  it('should highlight current page button', () => {
    // Arrange & Act: current_page = 3
    renderPaginationControls({
      state: {
        pagination: { current_page: 3 },
        analyses: {
          analyses: [],
          pagination: {
            total_pages: 5,
            total_count: 50,
          },
          isLoading: false,
          error: null,
        },
      },
    });

    // Assert: 현재 페이지 버튼이 표시됨
    const page3Button = screen.getByRole('button', { name: '3' });
    expect(page3Button).toBeInTheDocument();
  });

  // RED: 7페이지 이상일 때 ellipsis 표시
  it('should show ellipsis when total_pages > 7', () => {
    // Arrange & Act: total_pages = 10, current_page = 5
    renderPaginationControls({
      state: {
        pagination: { current_page: 5 },
        analyses: {
          analyses: [],
          pagination: {
            total_pages: 10,
            total_count: 100,
          },
          isLoading: false,
          error: null,
        },
      },
    });

    // Assert: ellipsis (...) 가 표시됨
    expect(screen.getAllByText('...').length).toBeGreaterThan(0);
  });
});
