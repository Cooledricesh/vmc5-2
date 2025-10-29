import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeavenlyStemsSection } from '../HeavenlyStemsSection';

// Mock convertToKorean
vi.mock('../../lib/utils', () => ({
  convertToKorean: vi.fn((stem) => {
    const mapping: Record<string, string> = {
      '庚午': '경오',
      '戊寅': '무인',
      '甲子': '갑자',
      '丙戌': '병술',
    };
    return mapping[stem] || stem;
  }),
}));

// Mock useAnalysisData hook
let mockAnalysisData = {
  data: {
    id: 'test-id',
    analysis_result: {
      heavenly_stems: {
        year: '庚午',
        month: '戊寅',
        day: '甲子',
        hour: '丙戌',
      },
    },
  },
  isLoading: false,
  error: null,
};

vi.mock('../../hooks/useAnalysisData', () => ({
  useAnalysisData: () => mockAnalysisData,
}));

describe('HeavenlyStemsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock data
    mockAnalysisData = {
      data: {
        id: 'test-id',
        analysis_result: {
          heavenly_stems: {
            year: '庚午',
            month: '戊寅',
            day: '甲子',
            hour: '丙戌',
          },
        },
      } as any,
      isLoading: false,
      error: null,
    };
  });

  describe('렌더링', () => {
    // RED: 천간지지 섹션 렌더링
    it('should render heavenly stems section with title', () => {
      // Arrange & Act
      render(<HeavenlyStemsSection />);

      // Assert: 섹션 제목
      expect(screen.getByText('천간지지 (사주팔자)')).toBeInTheDocument();
    });

    // RED: 년주 렌더링
    it('should render year pillar (년주)', () => {
      // Arrange & Act
      render(<HeavenlyStemsSection />);

      // Assert: 년주 라벨과 값
      expect(screen.getByText('년주')).toBeInTheDocument();
      expect(screen.getByText('庚午')).toBeInTheDocument();
      expect(screen.getByText('(경오)')).toBeInTheDocument();
    });

    // RED: 월주 렌더링
    it('should render month pillar (월주)', () => {
      // Arrange & Act
      render(<HeavenlyStemsSection />);

      // Assert: 월주 라벨과 값
      expect(screen.getByText('월주')).toBeInTheDocument();
      expect(screen.getByText('戊寅')).toBeInTheDocument();
      expect(screen.getByText('(무인)')).toBeInTheDocument();
    });

    // RED: 일주 렌더링
    it('should render day pillar (일주)', () => {
      // Arrange & Act
      render(<HeavenlyStemsSection />);

      // Assert: 일주 라벨과 값
      expect(screen.getByText('일주')).toBeInTheDocument();
      expect(screen.getByText('甲子')).toBeInTheDocument();
      expect(screen.getByText('(갑자)')).toBeInTheDocument();
    });

    // RED: 시주 렌더링
    it('should render hour pillar (시주)', () => {
      // Arrange & Act
      render(<HeavenlyStemsSection />);

      // Assert: 시주 라벨과 값
      expect(screen.getByText('시주')).toBeInTheDocument();
      expect(screen.getByText('丙戌')).toBeInTheDocument();
      expect(screen.getByText('(병술)')).toBeInTheDocument();
    });
  });

  describe('조건부 렌더링', () => {
    // RED: 시주가 없을 때 '미상' 표시
    it('should render "미상" when hour is null', () => {
      // Arrange: hour를 null로 설정
      mockAnalysisData.data = {
        ...mockAnalysisData.data,
        analysis_result: {
          heavenly_stems: {
            year: '庚午',
            month: '戊寅',
            day: '甲子',
            hour: null,
          },
        },
      } as any;

      // Act
      render(<HeavenlyStemsSection />);

      // Assert: '미상' 표시, 한글 읽기는 표시 안됨
      expect(screen.getByText('미상')).toBeInTheDocument();
      // '미상' 옆에 괄호가 없는지 확인 (다른 기둥은 괄호가 있음)
      const misangElement = screen.getByText('미상');
      const parentElement = misangElement.parentElement;
      const koreanTexts = parentElement?.querySelectorAll('.text-xs.text-gray-400');
      expect(koreanTexts?.length).toBe(0); // 미상일 때는 한글 읽기가 없어야 함
    });

    // RED: 데이터가 없을 때 null 반환
    it('should return null when data is not available', () => {
      // Arrange: data를 null로 설정
      mockAnalysisData.data = null;

      // Act
      const { container } = render(<HeavenlyStemsSection />);

      // Assert: 아무것도 렌더링되지 않음
      expect(container.firstChild).toBeNull();
    });

    // RED: analysis_result가 없을 때 null 반환
    it('should return null when analysis_result is not available', () => {
      // Arrange: analysis_result를 null로 설정
      mockAnalysisData.data = {
        id: 'test-id',
        analysis_result: null,
      } as any;

      // Act
      const { container } = render(<HeavenlyStemsSection />);

      // Assert: 아무것도 렌더링되지 않음
      expect(container.firstChild).toBeNull();
    });
  });

  describe('레이아웃', () => {
    // RED: 4개의 기둥이 모두 렌더링되는지 확인
    it('should render all four pillars', () => {
      // Arrange & Act
      render(<HeavenlyStemsSection />);

      // Assert: 4개의 기둥 라벨
      expect(screen.getByText('년주')).toBeInTheDocument();
      expect(screen.getByText('월주')).toBeInTheDocument();
      expect(screen.getByText('일주')).toBeInTheDocument();
      expect(screen.getByText('시주')).toBeInTheDocument();
    });
  });
});
