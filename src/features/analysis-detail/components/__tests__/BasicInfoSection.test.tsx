import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BasicInfoSection } from '../BasicInfoSection';

// Mock formatDateKorean
vi.mock('@/lib/utils/date', () => ({
  formatDateKorean: vi.fn((date) => '1990년 1월 1일'),
}));

// Mock AnalysisDetailContext
const mockContextValue = {
  state: {
    analysis: {
      data: {
        id: 'test-id',
        subject_name: '홍길동',
        birth_date: '1990-01-01',
        birth_time: '12:00',
        gender: 'male',
        status: 'completed',
        ai_model: 'gemini-2.0-pro',
        created_at: '2025-01-01T00:00:00Z',
        view_count: 42,
        analysis_result: {},
      },
      isLoading: false,
      error: null,
    },
    user: {
      subscription_tier: 'pro',
      remaining_count: 10,
    },
    ui: {
      activeTab: 'personality' as any,
      modals: {
        reanalyze: { isOpen: false, isProcessing: false },
        delete: { isOpen: false, isProcessing: false },
      },
      chartLoading: {
        fiveElements: false,
      },
    },
  },
  actions: {
    fetchAnalysis: vi.fn(),
    setActiveTab: vi.fn(),
    openReanalyzeModal: vi.fn(),
    closeReanalyzeModal: vi.fn(),
    reanalyzeAnalysis: vi.fn(),
    openDeleteModal: vi.fn(),
    closeDeleteModal: vi.fn(),
    deleteAnalysis: vi.fn(),
    setChartLoading: vi.fn(),
  },
  computed: {
    canReanalyze: true,
    relativeTime: '1일 전',
    aiModelBadge: 'Pro',
    genderIcon: '👨',
  },
};

vi.mock('../../context/AnalysisDetailContext', () => ({
  useAnalysisDetailContext: () => mockContextValue,
}));

describe('BasicInfoSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock context value
    mockContextValue.state.analysis.data = {
      id: 'test-id',
      subject_name: '홍길동',
      birth_date: '1990-01-01',
      birth_time: '12:00',
      gender: 'male',
      status: 'completed',
      ai_model: 'gemini-2.0-pro',
      created_at: '2025-01-01T00:00:00Z',
      view_count: 42,
      analysis_result: {},
    } as any;
    mockContextValue.computed = {
      canReanalyze: true,
      relativeTime: '1일 전',
      aiModelBadge: 'Pro',
      genderIcon: '👨',
    };
  });

  describe('렌더링', () => {
    // RED: 기본 정보가 렌더링되는지 테스트
    it('should render basic information section with all data', () => {
      // Arrange & Act
      render(<BasicInfoSection />);

      // Assert: 기본 정보 섹션 제목
      expect(screen.getByText('기본 정보')).toBeInTheDocument();

      // Assert: 성함
      expect(screen.getByText('성함')).toBeInTheDocument();
      expect(screen.getByText('👨 홍길동')).toBeInTheDocument();

      // Assert: 생년월일
      expect(screen.getByText('생년월일')).toBeInTheDocument();
      expect(screen.getByText('1990년 1월 1일')).toBeInTheDocument();

      // Assert: 출생시간
      expect(screen.getByText('출생시간')).toBeInTheDocument();
      expect(screen.getByText('12:00')).toBeInTheDocument();

      // Assert: 성별
      expect(screen.getByText('성별')).toBeInTheDocument();
      expect(screen.getByText('남성')).toBeInTheDocument();
    });

    // RED: AI 모델 뱃지 렌더링
    it('should render AI model badge', () => {
      // Arrange & Act
      render(<BasicInfoSection />);

      // Assert: AI 모델 뱃지 표시
      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    // RED: 상대 시간 렌더링
    it('should render relative time', () => {
      // Arrange & Act
      render(<BasicInfoSection />);

      // Assert: 상대 시간 표시
      expect(screen.getByText('1일 전')).toBeInTheDocument();
    });

    // RED: 조회수 렌더링
    it('should render view count', () => {
      // Arrange & Act
      render(<BasicInfoSection />);

      // Assert: 조회수 표시
      expect(screen.getByText('조회수 42')).toBeInTheDocument();
    });

    // RED: 상태 뱃지 렌더링
    it('should render status badge', () => {
      // Arrange & Act
      render(<BasicInfoSection />);

      // Assert: 상태 뱃지 표시
      expect(screen.getByText('완료')).toBeInTheDocument();
    });
  });

  describe('조건부 렌더링', () => {
    // RED: 출생시간이 없을 때 렌더링하지 않음
    it('should not render birth_time when it is null', () => {
      // Arrange: birth_time을 null로 설정
      mockContextValue.state.analysis.data = {
        ...mockContextValue.state.analysis.data,
        birth_time: null,
      } as any;

      // Act
      render(<BasicInfoSection />);

      // Assert: 출생시간 라벨이 표시되지 않음
      expect(screen.queryByText('출생시간')).not.toBeInTheDocument();
    });

    // RED: 데이터가 없을 때 null 반환
    it('should return null when data is not available', () => {
      // Arrange: data를 null로 설정
      mockContextValue.state.analysis.data = null;

      // Act
      const { container } = render(<BasicInfoSection />);

      // Assert: 아무것도 렌더링되지 않음
      expect(container.firstChild).toBeNull();
    });

    // RED: 여성일 때 '여성' 표시
    it('should render female gender correctly', () => {
      // Arrange: gender를 female로 설정
      mockContextValue.state.analysis.data = {
        ...mockContextValue.state.analysis.data,
        gender: 'female',
      } as any;
      mockContextValue.computed.genderIcon = '👩';

      // Act
      render(<BasicInfoSection />);

      // Assert: 성별이 '여성'으로 표시됨
      expect(screen.getByText('여성')).toBeInTheDocument();
      expect(screen.getByText('👩 홍길동')).toBeInTheDocument();
    });

    // RED: 처리 중 상태일 때 '처리 중' 표시
    it('should render processing status', () => {
      // Arrange: status를 processing으로 설정
      mockContextValue.state.analysis.data = {
        ...mockContextValue.state.analysis.data,
        status: 'processing',
      } as any;

      // Act
      render(<BasicInfoSection />);

      // Assert: 상태가 '처리 중'으로 표시됨
      expect(screen.getByText('처리 중')).toBeInTheDocument();
    });

    // RED: Flash 모델일 때 뱃지 표시
    it('should render Flash badge for gemini-2.0-flash model', () => {
      // Arrange: AI 모델을 Flash로 설정
      mockContextValue.state.analysis.data = {
        ...mockContextValue.state.analysis.data,
        ai_model: 'gemini-2.0-flash',
      } as any;
      mockContextValue.computed.aiModelBadge = 'Flash';

      // Act
      render(<BasicInfoSection />);

      // Assert: Flash 뱃지 표시
      expect(screen.getByText('Flash')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    // RED: 조회수가 0일 때
    it('should render view count as 0', () => {
      // Arrange: view_count를 0으로 설정
      mockContextValue.state.analysis.data = {
        ...mockContextValue.state.analysis.data,
        view_count: 0,
      } as any;

      // Act
      render(<BasicInfoSection />);

      // Assert: 조회수가 0으로 표시됨
      expect(screen.getByText('조회수 0')).toBeInTheDocument();
    });

    // RED: 매우 큰 조회수
    it('should render large view count', () => {
      // Arrange: view_count를 큰 수로 설정
      mockContextValue.state.analysis.data = {
        ...mockContextValue.state.analysis.data,
        view_count: 999999,
      } as any;

      // Act
      render(<BasicInfoSection />);

      // Assert: 큰 조회수가 표시됨
      expect(screen.getByText('조회수 999999')).toBeInTheDocument();
    });
  });
});
