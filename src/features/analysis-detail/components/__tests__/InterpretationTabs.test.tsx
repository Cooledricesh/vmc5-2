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
      personality: {
        strengths: ['강점1', '강점2'],
        weaknesses: ['약점1', '약점2'],
        characteristics: '주요 특징 내용입니다.',
      },
      career_wealth: {
        suitable_careers: ['직업1', '직업2'],
        wealth_fortune: '재물운 내용입니다.',
        career_advice: '경력 조언 내용입니다.',
      },
      health: {
        vulnerable_areas: '주의 부위 내용입니다.',
        health_advice: '건강 조언 내용입니다.',
        favorable_elements: '유리한 오행 내용입니다.',
      },
      relationships: {
        marriage_compatibility: '결혼/연애운 내용입니다.',
        compatible_types: ['잘 맞는 유형1', '잘 맞는 유형2'],
        challenging_types: ['주의할 유형1', '주의할 유형2'],
        relationship_advice: '관계 조언 내용입니다.',
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
          personality: {
            strengths: ['강점1', '강점2'],
            weaknesses: ['약점1', '약점2'],
            characteristics: '주요 특징 내용입니다.',
          },
          career_wealth: {
            suitable_careers: ['직업1', '직업2'],
            wealth_fortune: '재물운 내용입니다.',
            career_advice: '경력 조언 내용입니다.',
          },
          health: {
            vulnerable_areas: '주의 부위 내용입니다.',
            health_advice: '건강 조언 내용입니다.',
            favorable_elements: '유리한 오행 내용입니다.',
          },
          relationships: {
            marriage_compatibility: '결혼/연애운 내용입니다.',
            compatible_types: ['잘 맞는 유형1', '잘 맞는 유형2'],
            challenging_types: ['주의할 유형1', '주의할 유형2'],
            relationship_advice: '관계 조언 내용입니다.',
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
      expect(screen.getByText(/강점1/)).toBeInTheDocument();
      expect(screen.getByText(/주요 특징 내용입니다/)).toBeInTheDocument();
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

      render(<InterpretationTabs />);
      expect(screen.getByText(/직업1/)).toBeInTheDocument();
      expect(screen.getByText(/재물운 내용입니다/)).toBeInTheDocument();
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
