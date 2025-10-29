import { describe, it, expect } from 'vitest';
import { ensureArray, hasProcessingAnalysis, isAnalysesEmpty } from '../helpers';
import type { AnalysisItem } from '../../lib/dto';

describe('Dashboard Context Helpers', () => {
  describe('ensureArray', () => {
    it('should return the array if it is defined', () => {
      const arr = [1, 2, 3];
      expect(ensureArray(arr)).toBe(arr);
    });

    it('should return empty array if input is undefined', () => {
      expect(ensureArray(undefined)).toEqual([]);
    });

    it('should return empty array if input is null', () => {
      expect(ensureArray(null)).toEqual([]);
    });

    it('should return empty array if input is an empty array', () => {
      expect(ensureArray([])).toEqual([]);
    });
  });

  describe('hasProcessingAnalysis', () => {
    it('should return true if there is a processing analysis', () => {
      const analyses: AnalysisItem[] = [
        {
          id: '1',
          status: 'completed',
          created_at: '2024-01-01',
          birth_date: '1990-01-01',
          birth_time: '12:00',
          gender: 'male',
        },
        {
          id: '2',
          status: 'processing',
          created_at: '2024-01-02',
          birth_date: '1991-01-01',
          birth_time: '13:00',
          gender: 'female',
        },
      ];

      expect(hasProcessingAnalysis(analyses)).toBe(true);
    });

    it('should return false if there are no processing analyses', () => {
      const analyses: AnalysisItem[] = [
        {
          id: '1',
          status: 'completed',
          created_at: '2024-01-01',
          birth_date: '1990-01-01',
          birth_time: '12:00',
          gender: 'male',
        },
        {
          id: '2',
          status: 'failed',
          created_at: '2024-01-02',
          birth_date: '1991-01-01',
          birth_time: '13:00',
          gender: 'female',
        },
      ];

      expect(hasProcessingAnalysis(analyses)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(hasProcessingAnalysis([])).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(hasProcessingAnalysis(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(hasProcessingAnalysis(null)).toBe(false);
    });
  });

  describe('isAnalysesEmpty', () => {
    it('should return true when analyses is empty and not loading', () => {
      expect(isAnalysesEmpty([], false)).toBe(true);
    });

    it('should return false when analyses is empty but loading', () => {
      expect(isAnalysesEmpty([], true)).toBe(false);
    });

    it('should return false when analyses has items', () => {
      const analyses: AnalysisItem[] = [
        {
          id: '1',
          status: 'completed',
          created_at: '2024-01-01',
          birth_date: '1990-01-01',
          birth_time: '12:00',
          gender: 'male',
        },
      ];

      expect(isAnalysesEmpty(analyses, false)).toBe(false);
    });

    it('should return true for undefined when not loading', () => {
      expect(isAnalysesEmpty(undefined, false)).toBe(true);
    });

    it('should return true for null when not loading', () => {
      expect(isAnalysesEmpty(null, false)).toBe(true);
    });
  });
});
