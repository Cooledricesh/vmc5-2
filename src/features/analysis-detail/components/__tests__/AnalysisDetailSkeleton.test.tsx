import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AnalysisDetailSkeleton } from '../AnalysisDetailSkeleton';

describe('AnalysisDetailSkeleton', () => {
  // RED: 스켈레톤 렌더링 테스트
  it('should render skeleton loading state', () => {
    // Arrange & Act
    const { container } = render(<AnalysisDetailSkeleton />);

    // Assert: skeleton 요소들이 렌더링되는지 확인
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // RED: 컨테이너 클래스 확인
  it('should have correct container classes', () => {
    // Arrange & Act
    const { container } = render(<AnalysisDetailSkeleton />);

    // Assert: container 클래스가 적용되었는지 확인
    const containerDiv = container.querySelector('.container');
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv).toHaveClass('mx-auto', 'px-4', 'py-8', 'max-w-5xl');
  });

  // RED: 여러 Card 스켈레톤 렌더링
  it('should render multiple card skeletons', () => {
    // Arrange & Act
    const { container } = render(<AnalysisDetailSkeleton />);

    // Assert: 여러 개의 Card 컴포넌트가 렌더링되는지 확인
    const cards = container.querySelectorAll('[class*="rounded"]');
    expect(cards.length).toBeGreaterThan(3);
  });
});
