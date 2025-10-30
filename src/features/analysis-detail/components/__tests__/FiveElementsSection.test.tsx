import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FiveElementsSection } from '../FiveElementsSection';

// Mock RadarChart
vi.mock('@/components/charts/RadarChart', () => ({
  RadarChart: ({ data }: { data: any[] }) => (
    <div data-testid="radar-chart">Radar Chart with {data.length} items</div>
  ),
}));

// Import actual implementation and mock other functions if needed
import { createFiveElementsChartData } from '../../lib/utils';

// Mock hooks and context
let mockAnalysisData = {
  data: {
    id: 'test-id',
    analysis_result: {
      five_elements: {
        wood_score: 2,
        fire_score: 1,
        earth_score: 3,
        metal_score: 1,
        water_score: 1,
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
            wood_score: 2,
            fire_score: 1,
            earth_score: 3,
            metal_score: 1,
            water_score: 1,
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
      expect(screen.getByText('2%')).toBeInTheDocument();
      expect(screen.getByText('화(火)')).toBeInTheDocument();
      const onePercents = screen.getAllByText('1%');
      expect(onePercents.length).toBe(3); // 화, 금, 수가 모두 1%
      expect(screen.getByText('토(土)')).toBeInTheDocument();
      expect(screen.getByText('3%')).toBeInTheDocument();
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
            wood_score: 2,
            fire_score: 1,
            // missing earth_score, metal_score, water_score
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
