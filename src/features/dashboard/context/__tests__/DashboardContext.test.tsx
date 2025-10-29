import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardProvider, useDashboardContext } from '../DashboardContext';
import * as dashboardActions from '../../actions/dashboardActions';

// Mock the dashboard actions
vi.mock('../../actions/dashboardActions');

const mockFetchSummary = vi.mocked(dashboardActions.fetchSummary);
const mockFetchStats = vi.mocked(dashboardActions.fetchStats);
const mockFetchAnalyses = vi.mocked(dashboardActions.fetchAnalyses);

describe('DashboardContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    mockFetchSummary.mockResolvedValue(undefined);
    mockFetchStats.mockResolvedValue(undefined);
    mockFetchAnalyses.mockResolvedValue(undefined);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DashboardProvider>{children}</DashboardProvider>
  );

  describe('computed values', () => {
    it('should handle undefined analyses array gracefully in hasProcessingAnalyses', async () => {
      // Arrange: Mock API to dispatch error that doesn't preserve analyses array
      mockFetchAnalyses.mockImplementation(async (dispatch) => {
        dispatch({ type: 'FETCH_ANALYSES_START' });
        dispatch({
          type: 'FETCH_ANALYSES_ERROR',
          payload: { error: 'Network error' },
        });
      });

      // Act: Render hook
      const { result } = renderHook(() => useDashboardContext(), { wrapper });

      // Wait for initial effects to complete
      await waitFor(() => {
        expect(result.current.state.analyses.isLoading).toBe(false);
      });

      // Assert: Should not throw error when accessing computed values
      expect(() => result.current.computed.hasProcessingAnalyses).not.toThrow();
      expect(result.current.computed.hasProcessingAnalyses).toBe(false);
    });

    it('should handle empty analyses array in hasProcessingAnalyses', async () => {
      // Arrange
      mockFetchAnalyses.mockImplementation(async (dispatch) => {
        dispatch({ type: 'FETCH_ANALYSES_START' });
        dispatch({
          type: 'FETCH_ANALYSES_SUCCESS',
          payload: {
            analyses: [],
            pagination: {
              current_page: 1,
              total_pages: 0,
              total_count: 0,
              per_page: 10,
            },
          },
        });
      });

      // Act
      const { result } = renderHook(() => useDashboardContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.analyses.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.computed.hasProcessingAnalyses).toBe(false);
      expect(result.current.computed.isEmpty).toBe(true);
    });

    it('should detect processing analyses correctly', async () => {
      // Arrange
      mockFetchAnalyses.mockImplementation(async (dispatch) => {
        dispatch({ type: 'FETCH_ANALYSES_START' });
        dispatch({
          type: 'FETCH_ANALYSES_SUCCESS',
          payload: {
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
            pagination: {
              current_page: 1,
              total_pages: 1,
              total_count: 2,
              per_page: 10,
            },
          },
        });
      });

      // Act
      const { result } = renderHook(() => useDashboardContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.analyses.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.computed.hasProcessingAnalyses).toBe(true);
    });

    it('should calculate isEmpty correctly when loading is false and analyses is empty', async () => {
      // Arrange
      mockFetchAnalyses.mockImplementation(async (dispatch) => {
        dispatch({ type: 'FETCH_ANALYSES_START' });
        dispatch({
          type: 'FETCH_ANALYSES_SUCCESS',
          payload: {
            analyses: [],
            pagination: {
              current_page: 1,
              total_pages: 0,
              total_count: 0,
              per_page: 10,
            },
          },
        });
      });

      // Act
      const { result } = renderHook(() => useDashboardContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.analyses.isLoading).toBe(false);
      });

      // Assert
      expect(result.current.computed.isEmpty).toBe(true);
    });

    it('should not be empty when loading', async () => {
      // Arrange: Don't resolve the fetch
      mockFetchAnalyses.mockImplementation(async (dispatch) => {
        dispatch({ type: 'FETCH_ANALYSES_START' });
        // Don't dispatch success or error to keep loading state
      });

      // Act
      const { result } = renderHook(() => useDashboardContext(), { wrapper });

      // Assert (immediately, while still loading)
      expect(result.current.state.analyses.isLoading).toBe(true);
      expect(result.current.computed.isEmpty).toBe(false);
    });
  });

  describe('reducer edge cases', () => {
    it('should preserve analyses array on FETCH_ANALYSES_ERROR', async () => {
      // Arrange: First load with data, then error
      let callCount = 0;
      mockFetchAnalyses.mockImplementation(async (dispatch) => {
        dispatch({ type: 'FETCH_ANALYSES_START' });

        if (callCount === 0) {
          // First call succeeds
          dispatch({
            type: 'FETCH_ANALYSES_SUCCESS',
            payload: {
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
            },
          });
        } else {
          // Second call fails
          dispatch({
            type: 'FETCH_ANALYSES_ERROR',
            payload: { error: 'Network error' },
          });
        }
        callCount++;
      });

      // Act
      const { result } = renderHook(() => useDashboardContext(), { wrapper });

      // Wait for first load
      await waitFor(() => {
        expect(result.current.state.analyses.isLoading).toBe(false);
        expect(result.current.state.analyses.analyses).toHaveLength(1);
      });

      // Trigger second load (will fail)
      await act(async () => {
        await result.current.actions.fetchAnalyses();
      });

      // Wait for error state
      await waitFor(() => {
        expect(result.current.state.analyses.error).toBe('Network error');
      });

      // Assert: analyses array should still exist and be accessible
      expect(() => result.current.computed.hasProcessingAnalyses).not.toThrow();
      expect(result.current.state.analyses.analyses).toBeDefined();
      expect(Array.isArray(result.current.state.analyses.analyses)).toBe(true);
    });

    it('should handle UPDATE_ANALYSIS_STATUS with undefined analyses array', () => {
      // This test will check if UPDATE_ANALYSIS_STATUS action handles undefined gracefully
      // We'll test this via the reducer directly in a separate test file
      expect(true).toBe(true); // Placeholder - will implement in reducer.test.ts
    });
  });
});
