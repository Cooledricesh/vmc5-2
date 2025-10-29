import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  describe('🔴 RED: 초기 렌더링', () => {
    it('컴포넌트가 렌더링되어야 함', () => {
      // Arrange & Act
      render(<EmptyState />);

      // Assert
      expect(screen.getByRole('heading', { name: /분석 이력이 없습니다/i })).toBeInTheDocument();
    });

    it('FileText 아이콘이 표시되어야 함', () => {
      // Arrange & Act
      const { container } = render(<EmptyState />);

      // Assert - lucide-react 아이콘은 svg로 렌더링됨
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('안내 메시지가 표시되어야 함', () => {
      // Arrange & Act
      render(<EmptyState />);

      // Assert
      expect(
        screen.getByText(/첫 사주 분석을 시작하여 당신의 운명을 확인해보세요/i)
      ).toBeInTheDocument();
    });
  });

  describe('🔴 RED: 새 분석하기 링크', () => {
    it('새 분석하기 버튼이 있어야 함', () => {
      // Arrange & Act
      render(<EmptyState />);

      // Assert
      const button = screen.getByRole('link', { name: /새 분석하기/i });
      expect(button).toBeInTheDocument();
    });

    it('새 분석하기 버튼은 /analysis/new로 연결되어야 함', () => {
      // Arrange & Act
      render(<EmptyState />);

      // Assert
      const link = screen.getByRole('link', { name: /새 분석하기/i });
      expect(link).toHaveAttribute('href', '/analysis/new');
    });
  });

  describe('🔴 RED: 스타일링', () => {
    it('Card 컴포넌트가 border-dashed 클래스를 가져야 함', () => {
      // Arrange & Act
      const { container } = render(<EmptyState />);

      // Assert
      const card = container.querySelector('.border-dashed');
      expect(card).toBeInTheDocument();
    });
  });
});
