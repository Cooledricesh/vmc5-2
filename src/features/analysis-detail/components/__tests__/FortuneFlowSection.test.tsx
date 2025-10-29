import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FortuneFlowSection } from '../FortuneFlowSection';

// Mock useAnalysisData hook
let mockAnalysisData = {
  data: {
    id: 'test-id',
    analysis_result: {
      fortune_flow: {
        major_fortune: '대운이 좋습니다.\n10년 주기로 변화합니다.',
        yearly_fortune: '올해는 좋은 해입니다.\n새로운 시작의 해입니다.',
      },
    },
  },
  isLoading: false,
  error: null,
};

vi.mock('../../hooks/useAnalysisData', () => ({
  useAnalysisData: () => mockAnalysisData,
}));

describe('FortuneFlowSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock data
    mockAnalysisData = {
      data: {
        id: 'test-id',
        analysis_result: {
          fortune_flow: {
            major_fortune: '대운이 좋습니다.\n10년 주기로 변화합니다.',
            yearly_fortune: '올해는 좋은 해입니다.\n새로운 시작의 해입니다.',
          },
        },
      } as any,
      isLoading: false,
      error: null,
    };
  });

  describe('렌더링', () => {
    it('should render fortune flow section with title', () => {
      render(<FortuneFlowSection />);
      expect(screen.getByText('운세 흐름')).toBeInTheDocument();
    });

    it('should render major fortune (대운)', () => {
      render(<FortuneFlowSection />);
      expect(screen.getByText('대운 (大運)')).toBeInTheDocument();
      expect(screen.getByText(/대운이 좋습니다/)).toBeInTheDocument();
    });

    it('should render yearly fortune (세운)', () => {
      render(<FortuneFlowSection />);
      expect(screen.getByText('세운 (歲運)')).toBeInTheDocument();
      expect(screen.getByText(/올해는 좋은 해입니다/)).toBeInTheDocument();
    });
  });

  describe('조건부 렌더링', () => {
    it('should return null when data is not available', () => {
      mockAnalysisData.data = null;
      const { container } = render(<FortuneFlowSection />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null when analysis_result is not available', () => {
      mockAnalysisData.data = {
        id: 'test-id',
        analysis_result: null,
      } as any;
      const { container } = render(<FortuneFlowSection />);
      expect(container.firstChild).toBeNull();
    });
  });
});
