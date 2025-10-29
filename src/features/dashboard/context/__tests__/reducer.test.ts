import { dashboardReducer, initialState } from '../reducer';
import type { DashboardState } from '../types';

describe('dashboardReducer', () => {
  describe('FETCH_ANALYSES_ERROR', () => {
    it('should preserve analyses array when error occurs', () => {
      // Arrange
      const stateWithData: DashboardState = {
        ...initialState,
        analyses: {
          analyses: [
            {
              id: '1',
              status: 'completed',
              created_at: '2024-01-01',
              birth_date: '1990-01-01',
              birth_time: '12:00',
              gender: 'male',
            },
          ],
          pagination: {
            current_page: 1,
            total_pages: 1,
            total_count: 1,
            per_page: 10,
          },
          isLoading: false,
          error: null,
        },
      };

      // Act
      const newState = dashboardReducer(stateWithData, {
        type: 'FETCH_ANALYSES_ERROR',
        payload: { error: 'Network error' },
      });

      // Assert
      expect(newState.analyses.analyses).toBeDefined();
      expect(Array.isArray(newState.analyses.analyses)).toBe(true);
      expect(newState.analyses.analyses).toHaveLength(1);
      expect(newState.analyses.error).toBe('Network error');
      expect(newState.analyses.isLoading).toBe(false);
    });

    it('should maintain empty array on error when no previous data exists', () => {
      // Arrange - using initialState which has empty array
      const state = { ...initialState };

      // Act
      const newState = dashboardReducer(state, {
        type: 'FETCH_ANALYSES_ERROR',
        payload: { error: 'Network error' },
      });

      // Assert
      expect(newState.analyses.analyses).toBeDefined();
      expect(Array.isArray(newState.analyses.analyses)).toBe(true);
      expect(newState.analyses.analyses).toHaveLength(0);
    });
  });

  describe('UPDATE_ANALYSIS_STATUS', () => {
    it('should handle UPDATE_ANALYSIS_STATUS with undefined analyses array', () => {
      // Arrange: Simulate corrupted state (shouldn't happen, but defensive programming)
      const corruptedState: DashboardState = {
        ...initialState,
        analyses: {
          ...initialState.analyses,
          analyses: undefined as any, // Force undefined for testing
        },
      };

      // Act & Assert: Should not throw error
      expect(() => {
        dashboardReducer(corruptedState, {
          type: 'UPDATE_ANALYSIS_STATUS',
          payload: { id: '1', status: 'completed' },
        });
      }).not.toThrow();
    });

    it('should handle UPDATE_ANALYSIS_STATUS with valid analyses array', () => {
      // Arrange
      const stateWithData: DashboardState = {
        ...initialState,
        analyses: {
          analyses: [
            {
              id: '1',
              status: 'processing',
              created_at: '2024-01-01',
              birth_date: '1990-01-01',
              birth_time: '12:00',
              gender: 'male',
            },
            {
              id: '2',
              status: 'completed',
              created_at: '2024-01-02',
              birth_date: '1991-01-01',
              birth_time: '13:00',
              gender: 'female',
            },
          ],
          pagination: initialState.analyses.pagination,
          isLoading: false,
          error: null,
        },
      };

      // Act
      const newState = dashboardReducer(stateWithData, {
        type: 'UPDATE_ANALYSIS_STATUS',
        payload: { id: '1', status: 'completed' },
      });

      // Assert
      expect(newState.analyses.analyses[0].status).toBe('completed');
      expect(newState.analyses.analyses[1].status).toBe('completed');
    });

    it('should not modify analyses if id does not match', () => {
      // Arrange
      const stateWithData: DashboardState = {
        ...initialState,
        analyses: {
          analyses: [
            {
              id: '1',
              status: 'processing',
              created_at: '2024-01-01',
              birth_date: '1990-01-01',
              birth_time: '12:00',
              gender: 'male',
            },
          ],
          pagination: initialState.analyses.pagination,
          isLoading: false,
          error: null,
        },
      };

      // Act
      const newState = dashboardReducer(stateWithData, {
        type: 'UPDATE_ANALYSIS_STATUS',
        payload: { id: 'non-existent', status: 'completed' },
      });

      // Assert
      expect(newState.analyses.analyses[0].status).toBe('processing');
    });
  });

  describe('initial state', () => {
    it('should have analyses as empty array, not undefined', () => {
      expect(initialState.analyses.analyses).toBeDefined();
      expect(Array.isArray(initialState.analyses.analyses)).toBe(true);
      expect(initialState.analyses.analyses).toHaveLength(0);
    });
  });
});
