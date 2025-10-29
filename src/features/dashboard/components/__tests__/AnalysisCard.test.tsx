import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnalysisCard } from '../AnalysisCard';
import type { AnalysisItem } from '../../lib/dto';

describe('AnalysisCard', () => {
  const mockAnalysis: AnalysisItem = {
    id: '1',
    subject_name: '홍길동',
    birth_date: '1990-01-01',
    gender: 'male',
    ai_model: 'gpt-4',
    status: 'completed',
    view_count: 5,
    created_at: '2024-01-01T00:00:00Z',
  };

  describe('🔴 RED: 기본 렌더링', () => {
    it('컴포넌트가 렌더링되어야 함', () => {
      // Arrange & Act
      render(<AnalysisCard analysis={mockAnalysis} />);

      // Assert
      expect(screen.getByText('홍길동')).toBeInTheDocument();
    });

    it('생년월일과 나이가 표시되어야 함', () => {
      // Arrange & Act
      render(<AnalysisCard analysis={mockAnalysis} />);

      // Assert
      expect(screen.getByText(/생년월일/i)).toBeInTheDocument();
      expect(screen.getByText(/세\)/i)).toBeInTheDocument();
    });

    it('성별이 표시되어야 함', () => {
      // Arrange & Act
      render(<AnalysisCard analysis={mockAnalysis} />);

      // Assert
      expect(screen.getByText(/성별/i)).toBeInTheDocument();
    });

    it('AI 모델이 표시되어야 함', () => {
      // Arrange & Act
      render(<AnalysisCard analysis={mockAnalysis} />);

      // Assert
      expect(screen.getByText(/AI 모델/i)).toBeInTheDocument();
    });

    it('조회수가 표시되어야 함', () => {
      // Arrange & Act
      render(<AnalysisCard analysis={mockAnalysis} />);

      // Assert
      expect(screen.getByText(/5회 조회/i)).toBeInTheDocument();
    });
  });

  describe('🔴 RED: 상태별 렌더링', () => {
    it('완료 상태일 때 Link로 감싸져야 함', () => {
      // Arrange
      const completedAnalysis: AnalysisItem = {
        ...mockAnalysis,
        status: 'completed',
      };

      // Act
      const { container } = render(<AnalysisCard analysis={completedAnalysis} />);

      // Assert
      const link = container.querySelector('a[href="/analysis/1"]');
      expect(link).toBeInTheDocument();
    });

    it('처리 중 상태일 때 Link로 감싸지지 않아야 함', () => {
      // Arrange
      const processingAnalysis: AnalysisItem = {
        ...mockAnalysis,
        status: 'processing',
      };

      // Act
      const { container } = render(<AnalysisCard analysis={processingAnalysis} />);

      // Assert
      const link = container.querySelector('a');
      expect(link).not.toBeInTheDocument();
    });

    it('실패 상태일 때 Link로 감싸지지 않아야 함', () => {
      // Arrange
      const failedAnalysis: AnalysisItem = {
        ...mockAnalysis,
        status: 'failed',
      };

      // Act
      const { container } = render(<AnalysisCard analysis={failedAnalysis} />);

      // Assert
      const link = container.querySelector('a');
      expect(link).not.toBeInTheDocument();
    });

    it('처리 중 상태일 때 로딩 아이콘이 표시되어야 함', () => {
      // Arrange
      const processingAnalysis: AnalysisItem = {
        ...mockAnalysis,
        status: 'processing',
      };

      // Act
      const { container } = render(<AnalysisCard analysis={processingAnalysis} />);

      // Assert - Loader2 아이콘은 animate-spin 클래스를 가짐
      const loader = container.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });
  });

  describe('🔴 RED: Badge 렌더링', () => {
    it('완료 상태 Badge가 표시되어야 함', () => {
      // Arrange
      const completedAnalysis: AnalysisItem = {
        ...mockAnalysis,
        status: 'completed',
      };

      // Act
      render(<AnalysisCard analysis={completedAnalysis} />);

      // Assert
      expect(screen.getByText(/완료/i)).toBeInTheDocument();
    });

    it('처리 중 상태 Badge가 표시되어야 함', () => {
      // Arrange
      const processingAnalysis: AnalysisItem = {
        ...mockAnalysis,
        status: 'processing',
      };

      // Act
      render(<AnalysisCard analysis={processingAnalysis} />);

      // Assert
      expect(screen.getByText(/처리 중/i)).toBeInTheDocument();
    });
  });
});
