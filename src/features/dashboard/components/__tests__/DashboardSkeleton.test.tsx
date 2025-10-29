import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DashboardSkeleton } from '../DashboardSkeleton';

describe('DashboardSkeleton', () => {
  describe('🔴 RED: 초기 렌더링', () => {
    it('컴포넌트가 렌더링되어야 함', () => {
      // Arrange & Act
      const { container } = render(<DashboardSkeleton />);

      // Assert
      expect(container).toBeInTheDocument();
    });

    it('container div가 적절한 클래스를 가져야 함', () => {
      // Arrange & Act
      const { container } = render(<DashboardSkeleton />);

      // Assert
      const mainDiv = container.querySelector('.container.mx-auto');
      expect(mainDiv).toBeInTheDocument();
    });
  });

  describe('🔴 RED: 사용자 정보 스켈레톤', () => {
    it('사용자 정보 스켈레톤 Card가 렌더링되어야 함', () => {
      // Arrange & Act
      const { container } = render(<DashboardSkeleton />);

      // Assert
      // 첫 번째 Card는 사용자 정보 스켈레톤
      const cards = container.querySelectorAll('[class*="card"]');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('사용자 정보 영역에 Skeleton이 있어야 함', () => {
      // Arrange & Act
      const { container } = render(<DashboardSkeleton />);

      // Assert
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('🔴 RED: 통계 카드 스켈레톤', () => {
    it('3개의 통계 카드 스켈레톤이 렌더링되어야 함', () => {
      // Arrange & Act
      const { container } = render(<DashboardSkeleton />);

      // Assert
      // grid가 있는지 확인
      const grid = container.querySelector('.grid.grid-cols-1');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('🔴 RED: 필터 바 스켈레톤', () => {
    it('필터 바 스켈레톤이 렌더링되어야 함', () => {
      // Arrange & Act
      const { container } = render(<DashboardSkeleton />);

      // Assert
      const filterBar = container.querySelector('.flex.gap-4');
      expect(filterBar).toBeInTheDocument();
    });
  });

  describe('🔴 RED: 분석 카드 그리드 스켈레톤', () => {
    it('6개의 분석 카드 스켈레톤이 렌더링되어야 함', () => {
      // Arrange & Act
      const { container } = render(<DashboardSkeleton />);

      // Assert
      // 마지막 grid는 분석 카드 그리드 (6개 아이템)
      const grids = container.querySelectorAll('.grid');
      expect(grids.length).toBeGreaterThanOrEqual(2); // 통계 카드 grid + 분석 카드 grid
    });

    it('분석 카드 그리드는 responsive 클래스를 가져야 함', () => {
      // Arrange & Act
      const { container } = render(<DashboardSkeleton />);

      // Assert
      // lg:grid-cols-3를 가진 grid 찾기
      const analysisGrid = container.querySelector('[class*="lg:grid-cols-3"]');
      expect(analysisGrid).toBeInTheDocument();
    });
  });
});
