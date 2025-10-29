import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalysisErrorState } from '../AnalysisErrorState';

// Mock next/navigation
const mockBack = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

describe('AnalysisErrorState', () => {
  // RED: ANALYSIS_NOT_FOUND 에러 렌더링
  it('should render ANALYSIS_NOT_FOUND error message', () => {
    // Arrange & Act
    render(<AnalysisErrorState error="ANALYSIS_NOT_FOUND" />);

    // Assert
    expect(screen.getByText('분석 결과를 찾을 수 없습니다')).toBeInTheDocument();
    expect(screen.getByText('삭제되었거나 존재하지 않는 분석입니다.')).toBeInTheDocument();
  });

  // RED: FORBIDDEN 에러 렌더링
  it('should render FORBIDDEN error message', () => {
    // Arrange & Act
    render(<AnalysisErrorState error="FORBIDDEN" />);

    // Assert
    expect(screen.getByText('접근 권한이 없습니다')).toBeInTheDocument();
    expect(screen.getByText('이 분석 결과를 조회할 권한이 없습니다.')).toBeInTheDocument();
  });

  // RED: UNAUTHORIZED 에러 렌더링
  it('should render UNAUTHORIZED error message', () => {
    // Arrange & Act
    render(<AnalysisErrorState error="UNAUTHORIZED" />);

    // Assert
    expect(screen.getByText('로그인이 필요합니다')).toBeInTheDocument();
    expect(screen.getByText('분석 결과를 조회하려면 로그인해주세요.')).toBeInTheDocument();
  });

  // RED: 일반 에러 메시지 렌더링
  it('should render generic error message for unknown errors', () => {
    // Arrange
    const customError = '알 수 없는 오류입니다';

    // Act
    render(<AnalysisErrorState error={customError} />);

    // Assert
    expect(screen.getByText('오류가 발생했습니다')).toBeInTheDocument();
    expect(screen.getByText(customError)).toBeInTheDocument();
  });

  // RED: 이전으로 버튼 클릭
  it('should call router.back when clicking back button', () => {
    // Arrange
    render(<AnalysisErrorState error="ANALYSIS_NOT_FOUND" />);

    // Act
    const backButton = screen.getByText('이전으로');
    fireEvent.click(backButton);

    // Assert
    expect(mockBack).toHaveBeenCalled();
  });

  // RED: 대시보드로 가기 버튼 클릭
  it('should navigate to dashboard when clicking dashboard button', () => {
    // Arrange
    render(<AnalysisErrorState error="ANALYSIS_NOT_FOUND" />);

    // Act
    const dashboardButton = screen.getByText('대시보드로 가기');
    fireEvent.click(dashboardButton);

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
});
