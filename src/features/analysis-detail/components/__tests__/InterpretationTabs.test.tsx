import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InterpretationTabs } from '../InterpretationTabs';

// Mock MarkdownRenderer
vi.mock('@/lib/utils/markdown', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

// Mock hooks
const mockSetActiveTab = vi.fn();
let mockActiveTab = 'personality';
let mockAnalysisData = {
  data: {
    id: 'test-id',
    analysis_result: {
      interpretation: {
        personality: '성격 분석 내용입니다.',
        wealth: '재운 분석 내용입니다.',
        health: '건강운 내용입니다.',
        love: '연애운 내용입니다.',
      },
    },
  },
  isLoading: false,
  error: null,
};

vi.mock('../../hooks/useActiveTab', () => ({
  useActiveTab: () => ({
    activeTab: mockActiveTab,
    setActiveTab: mockSetActiveTab,
  }),
}));

vi.mock('../../hooks/useAnalysisData', () => ({
  useAnalysisData: () => mockAnalysisData,
}));

describe('InterpretationTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveTab = 'personality';
    mockAnalysisData = {
      data: {
        id: 'test-id',
        analysis_result: {
          interpretation: {
            personality: '성격 분석 내용입니다.',
            wealth: '재운 분석 내용입니다.',
            health: '건강운 내용입니다.',
            love: '연애운 내용입니다.',
          },
        },
      } as any,
      isLoading: false,
      error: null,
    };
  });

  describe('렌더링', () => {
    it('should render interpretation tabs section with title', () => {
      render(<InterpretationTabs />);
      expect(screen.getByText('종합 해석')).toBeInTheDocument();
    });

    it('should render all tab buttons', () => {
      render(<InterpretationTabs />);
      expect(screen.getByText('성격 분석')).toBeInTheDocument();
      expect(screen.getByText('재운 분석')).toBeInTheDocument();
      expect(screen.getByText('건강운')).toBeInTheDocument();
      expect(screen.getByText('연애운')).toBeInTheDocument();
    });

    it('should render active tab content', () => {
      render(<InterpretationTabs />);
      expect(screen.getByText('성격 분석 내용입니다.')).toBeInTheDocument();
    });
  });

  describe('사용자 인터랙션', () => {
    it('should call setActiveTab when tab button is clicked', async () => {
      const user = userEvent.setup();
      render(<InterpretationTabs />);

      const wealthTab = screen.getByText('재운 분석');
      await user.click(wealthTab);

      expect(mockSetActiveTab).toHaveBeenCalledWith('wealth');
    });

    it('should render wealth content when wealth tab is active', () => {
      mockActiveTab = 'wealth';
      mockAnalysisData.data!.analysis_result!.interpretation = {
        personality: '성격 분석 내용입니다.',
        wealth: '재운 분석 내용입니다.',
        health: '건강운 내용입니다.',
        love: '연애운 내용입니다.',
      } as any;

      render(<InterpretationTabs />);
      expect(screen.getByText('재운 분석 내용입니다.')).toBeInTheDocument();
    });
  });

  describe('조건부 렌더링', () => {
    it('should return null when data is not available', () => {
      mockAnalysisData.data = null;
      const { container } = render(<InterpretationTabs />);
      expect(container.firstChild).toBeNull();
    });

    it('should return null when analysis_result is not available', () => {
      mockAnalysisData.data = {
        id: 'test-id',
        analysis_result: null,
      } as any;
      const { container } = render(<InterpretationTabs />);
      expect(container.firstChild).toBeNull();
    });
  });
});
