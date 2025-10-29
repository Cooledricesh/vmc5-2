import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FiveElementsSection } from '../FiveElementsSection';

// Mock RadarChart
vi.mock('@/components/charts/RadarChart', () => ({
  RadarChart: ({ data }: { data: any[] }) => (
    <div data-testid="radar-chart">Radar Chart with {data.length} items</div>
  ),
}));

// Mock createFiveElementsChartData
vi.mock('../../lib/utils', () => ({
  createFiveElementsChartData: vi.fn((fiveElements) => [
    { element: '목(木)', count: fiveElements.wood, fullMark: 5, color: '#10B981' },
    { element: '화(火)', count: fiveElements.fire, fullMark: 5, color: '#EF4444' },
    { element: '토(土)', count: fiveElements.earth, fullMark: 5, color: '#D97706' },
    { element: '금(金)', count: fiveElements.metal, fullMark: 5, color: '#6B7280' },
    { element: '수(水)', count: fiveElements.water, fullMark: 5, color: '#3B82F6' },
  ]),
}));

// Mock hooks and context
let mockAnalysisData = {
  data: {
    id: 'test-id',
    analysis_result: {
      five_elements: {
        wood: 2,
        fire: 1,
        earth: 3,
        metal: 1,
        water: 1,
      },
    },
  },
  isLoading: false,
  error: null,
};

const mockSetChartLoading = vi.fn();
let mockChartLoading = false;

vi.mock('../../hooks/useAnalysisData', () => ({
  useAnalysisData: () => mockAnalysisData,
}));

vi.mock('../../context/AnalysisDetailContext', () => ({
  useAnalysisDetailContext: () => ({
    state: {
      ui: {
        chartLoading: {
          fiveElements: mockChartLoading,
        },
      },
    },
    actions: {
      setChartLoading: mockSetChartLoading,
    },
  }),
}));

describe('FiveElementsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChartLoading = false;
    mockAnalysisData = {
      data: {
        id: 'test-id',
        analysis_result: {
          five_elements: {
            wood: 2,
            fire: 1,
            earth: 3,
            metal: 1,
            water: 1,
          },
        },
      } as any,
      isLoading: false,
      error: null,
    };
  });

  describe('렌더링', () => {
    it('should render five elements section with title', () => {
      render(<FiveElementsSection />);
      expect(screen.getByText('오행 분석')).toBeInTheDocument();
    });

    it('should render radar chart', () => {
      render(<FiveElementsSection />);
      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
    });

    it('should render all five elements with counts', () => {
      render(<FiveElementsSection />);
      expect(screen.getByText('목(木)')).toBeInTheDocument();
      expect(screen.getByText('2개')).toBeInTheDocument();
      expect(screen.getByText('화(火)')).toBeInTheDocument();
      const oneGaes = screen.getAllByText('1개');
      expect(oneGaes.length).toBe(3); // 화, 금, 수가 모두 1개
      expect(screen.getByText('토(土)')).toBeInTheDocument();
      expect(screen.getByText('3개')).toBeInTheDocument();
      expect(screen.getByText('금(金)')).toBeInTheDocument();
      expect(screen.getByText('수(水)')).toBeInTheDocument();
    });
  });

  describe('로딩 상태', () => {
    it('should render loading spinner when chartLoading is true', () => {
      mockChartLoading = true;
      render(<FiveElementsSection />);
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not render chart when loading', () => {
      mockChartLoading = true;
      render(<FiveElementsSection />);
      expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
    });
  });

  describe('조건부 렌더링', () => {
    it('should return null when data is not available', () => {
      mockAnalysisData.data = null;
      const { container } = render(<FiveElementsSection />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null when analysis_result is not available', () => {
      mockAnalysisData.data = {
        id: 'test-id',
        analysis_result: null,
      } as any;
      const { container } = render(<FiveElementsSection />);
      expect(container.firstChild).toBeNull();
    });

    it('should render empty chart when five_elements is incomplete', () => {
      mockAnalysisData.data = {
        id: 'test-id',
        analysis_result: {
          five_elements: {
            wood: 2,
            fire: 1,
            // missing earth, metal, water
          },
        },
      } as any;
      render(<FiveElementsSection />);
      // Chart는 렌더링되지만 데이터가 비어있음
      const radarChart = screen.getByTestId('radar-chart');
      expect(radarChart).toBeInTheDocument();
      expect(radarChart).toHaveTextContent('0 items');
    });
  });
});
