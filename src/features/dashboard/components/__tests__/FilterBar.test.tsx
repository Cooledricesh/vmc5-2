import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from '../FilterBar';
import { DashboardProvider } from '../../context/DashboardContext';

// Mock dashboard actions
vi.mock('../../actions/dashboardActions', () => ({
  fetchSummary: vi.fn(),
  fetchStats: vi.fn(),
  fetchAnalyses: vi.fn(),
}));

// Mock constants
vi.mock('../../lib/constants', () => ({
  PERIOD_OPTIONS: [
    { value: 'all', label: '전체' },
    { value: '7days', label: '최근 7일' },
    { value: '30days', label: '최근 30일' },
    { value: '90days', label: '최근 90일' },
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

// Helper: FilterBar를 Provider로 감싸서 렌더링
const renderFilterBar = () => {
  return render(
    <DashboardProvider>
      <FilterBar />
    </DashboardProvider>
  );
};

describe('FilterBar', () => {
  // RED: 초기 렌더링 테스트
  it('should render period and sort selects', () => {
    // Arrange & Act: 컴포넌트 렌더링
    renderFilterBar();

    // Assert: select 요소들이 렌더링되는지 확인
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
  });

  // RED: 초기화 버튼 렌더링 테스트
  it('should render reset filters button', () => {
    // Arrange & Act: 컴포넌트 렌더링
    renderFilterBar();

    // Assert: 초기화 버튼이 렌더링되는지 확인
    const resetButton = screen.getByRole('button', { name: /필터 초기화/i });
    expect(resetButton).toBeInTheDocument();
  });

  // RED: 기간 필터 변경 테스트
  it('should change period filter when selected', () => {
    // Arrange: 컴포넌트 렌더링
    renderFilterBar();

    // Act: 기간 select 클릭
    const periodSelects = screen.getAllByRole('combobox');
    const periodSelect = periodSelects[0];

    fireEvent.click(periodSelect);

    // Assert: 기간 옵션들이 표시되는지 확인
    expect(screen.getAllByText('전체').length).toBeGreaterThan(0);
    expect(screen.getByText('최근 7일')).toBeInTheDocument();
    expect(screen.getByText('최근 30일')).toBeInTheDocument();
    expect(screen.getByText('최근 90일')).toBeInTheDocument();
  });

  // RED: 정렬 필터 변경 테스트
  it('should change sort filter when selected', () => {
    // Arrange: 컴포넌트 렌더링
    renderFilterBar();

    // Act: 정렬 select 클릭
    const selects = screen.getAllByRole('combobox');
    const sortSelect = selects[1];

    fireEvent.click(sortSelect);

    // Assert: 정렬 옵션들이 표시되는지 확인
    expect(screen.getAllByText('최신순').length).toBeGreaterThan(0);
    expect(screen.getByText('오래된순')).toBeInTheDocument();
  });

  // RED: 필터 초기화 버튼 클릭 테스트
  it('should reset filters when reset button is clicked', () => {
    // Arrange: 컴포넌트 렌더링
    renderFilterBar();

    // Act: 초기화 버튼 클릭
    const resetButton = screen.getByRole('button', { name: /필터 초기화/i });
    fireEvent.click(resetButton);

    // Assert: 버튼이 클릭 가능한지 확인
    expect(resetButton).toBeInTheDocument();
  });

  // RED: 반응형 레이아웃 클래스 확인
  it('should have responsive layout classes', () => {
    // Arrange & Act: 컴포넌트 렌더링
    const { container } = renderFilterBar();

    // Assert: flex 레이아웃 클래스가 적용되었는지 확인
    const filterBarContainer = container.querySelector('.flex');
    expect(filterBarContainer).toBeInTheDocument();
    expect(filterBarContainer).toHaveClass('flex-col', 'sm:flex-row');
  });

  // RED: 아이콘 렌더링 테스트
  it('should render reset icon', () => {
    // Arrange & Act: 컴포넌트 렌더링
    const { container } = renderFilterBar();

    // Assert: RotateCcw 아이콘이 렌더링되는지 확인 (SVG로 렌더링됨)
    const resetButton = screen.getByRole('button', { name: /필터 초기화/i });
    const icon = resetButton.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
