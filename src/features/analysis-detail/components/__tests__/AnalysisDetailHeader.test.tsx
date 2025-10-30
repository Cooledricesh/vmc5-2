import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalysisDetailHeader } from '../AnalysisDetailHeader';

// Mock next/navigation
const mockRouterBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockRouterBack,
    push: vi.fn(),
  }),
}));

// Mock AnalysisDetailContext
const mockOpenReanalyzeModal = vi.fn();
const mockOpenDeleteModal = vi.fn();
const mockCloseReanalyzeModal = vi.fn();
const mockCloseDeleteModal = vi.fn();

// Default mock context value
const mockContextValue = {
  state: {
    analysis: {
      data: {
        id: 'test-analysis-id',
        subject_name: '홍길동',
        birth_date: '1990-01-01',
        birth_time: '12:00',
        gender: 'male',
        status: 'completed',
        ai_model: 'gemini-2.0-pro',
        created_at: '2025-01-01T00:00:00Z',
        view_count: 10,
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
    openReanalyzeModal: mockOpenReanalyzeModal,
    closeReanalyzeModal: mockCloseReanalyzeModal,
    reanalyzeAnalysis: vi.fn(),
    openDeleteModal: mockOpenDeleteModal,
    closeDeleteModal: mockCloseDeleteModal,
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

describe('AnalysisDetailHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('렌더링', () => {
    // RED: 뒤로가기 버튼 렌더링 테스트
    it('should render back button', () => {
      // Arrange & Act
      render(<AnalysisDetailHeader />);

      // Assert: 뒤로가기 버튼이 렌더링되는지 확인
      const backButton = screen.getByRole('button', { name: /뒤로가기/i });
      expect(backButton).toBeInTheDocument();
    });

    // RED: 더보기 메뉴 버튼 렌더링 테스트
    it('should render more options menu button', () => {
      // Arrange & Act
      render(<AnalysisDetailHeader />);

      // Assert: 더보기 버튼이 렌더링되는지 확인
      const menuButtons = screen.getAllByRole('button');
      expect(menuButtons.length).toBeGreaterThan(1);
    });
  });

  describe('사용자 인터랙션', () => {
    // RED: 뒤로가기 버튼 클릭 시 router.back() 호출
    it('should call router.back() when back button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<AnalysisDetailHeader />);
      const backButton = screen.getByRole('button', { name: /뒤로가기/i });

      // Act: 뒤로가기 버튼 클릭
      await user.click(backButton);

      // Assert: router.back()이 호출되었는지 확인
      expect(mockRouterBack).toHaveBeenCalledOnce();
    });

    // RED: 더보기 메뉴 클릭 시 드롭다운 메뉴 표시
    it('should show dropdown menu when more options button is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<AnalysisDetailHeader />);
      const menuButtons = screen.getAllByRole('button');
      const moreButton = menuButtons[1]; // 두 번째 버튼이 더보기 버튼

      // Act: 더보기 버튼 클릭
      await user.click(moreButton);

      // Assert: 드롭다운 메뉴가 표시되는지 확인
      const deleteMenuItem = await screen.findByText('삭제');
      expect(deleteMenuItem).toBeInTheDocument();
    });

    // RED: 재분석 메뉴 아이템 클릭 시 openReanalyzeModal 호출
    it('should call openReanalyzeModal when reanalyze menu item is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<AnalysisDetailHeader />);
      const menuButtons = screen.getAllByRole('button');
      const moreButton = menuButtons[1];

      // Act: 더보기 버튼 클릭 → 재분석 메뉴 클릭
      await user.click(moreButton);
      const reanalyzeMenuItem = await screen.findByText('재분석');
      await user.click(reanalyzeMenuItem);

      // Assert: openReanalyzeModal이 호출되었는지 확인
      expect(mockOpenReanalyzeModal).toHaveBeenCalledOnce();
    });

    // RED: 삭제 메뉴 아이템 클릭 시 openDeleteModal 호출
    it('should call openDeleteModal when delete menu item is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<AnalysisDetailHeader />);
      const menuButtons = screen.getAllByRole('button');
      const moreButton = menuButtons[1];

      // Act: 더보기 버튼 클릭 → 삭제 메뉴 클릭
      await user.click(moreButton);
      const deleteMenuItem = await screen.findByText('삭제');
      await user.click(deleteMenuItem);

      // Assert: openDeleteModal이 호출되었는지 확인
      expect(mockOpenDeleteModal).toHaveBeenCalledOnce();
    });
  });

  describe('조건부 렌더링', () => {
    // RED: canReanalyze가 false일 때 재분석 메뉴 아이템 숨김
    it('should not show reanalyze menu item when canReanalyze is false', async () => {
      // Arrange: canReanalyze를 false로 변경
      mockContextValue.computed.canReanalyze = false;
      mockContextValue.state.user.subscription_tier = 'free';
      mockContextValue.state.user.remaining_count = 0;

      const user = userEvent.setup();
      render(<AnalysisDetailHeader />);
      const menuButtons = screen.getAllByRole('button');
      const moreButton = menuButtons[1];

      // Act: 더보기 버튼 클릭
      await user.click(moreButton);

      // Assert: 재분석 메뉴 아이템이 표시되지 않는지 확인
      const reanalyzeMenuItem = screen.queryByText('재분석');
      expect(reanalyzeMenuItem).not.toBeInTheDocument();

      // Cleanup: 원래 상태로 복원
      mockContextValue.computed.canReanalyze = true;
      mockContextValue.state.user.subscription_tier = 'pro';
      mockContextValue.state.user.remaining_count = 10;
    });
  });
});
