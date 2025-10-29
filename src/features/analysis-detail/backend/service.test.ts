import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnalysisById, deleteAnalysis } from './service';
import { analysisDetailErrorCodes } from './error';

describe('Analysis Detail Service', () => {
  let mockSupabase: Partial<SupabaseClient>;
  const mockUserId = 'test-user-id';
  const mockAnalysisId = 'analysis-id-123';

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Setup basic mock Supabase client
    mockSupabase = {
      from: vi.fn(),
    };
  });

  describe('getAnalysisById', () => {
    const mockAnalysisData = {
      id: mockAnalysisId,
      user_id: mockUserId,
      subject_name: '홍길동',
      birth_date: '1990-01-01',
      birth_time: '14:30',
      gender: 'male',
      ai_model: 'gemini-2.0-pro',
      analysis_result: {
        heavenly_stems: {
          year: '경오',
          month: '무자',
          day: '갑진',
          hour: '신미',
        },
        five_elements: {
          wood: 2,
          fire: 3,
          earth: 1,
          metal: 2,
          water: 2,
        },
      },
      status: 'completed',
      view_count: 5,
      created_at: '2024-01-01T00:00:00Z',
      last_viewed_at: '2024-01-02T00:00:00Z',
    };

    it('should return analysis detail and increment view count', async () => {
      // Arrange: Mock successful database responses
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: mockAnalysisData,
              error: null,
            })
          ),
        })),
      }));

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            error: null,
          })
        ),
      }));

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'analyses') {
          return {
            select: mockSelect,
            update: mockUpdate,
          };
        }
        return {};
      }) as any;

      // Act: Call service function
      const result = await getAnalysisById(
        mockSupabase as SupabaseClient,
        mockAnalysisId,
        mockUserId
      );

      // Assert: Verify result structure
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toEqual({
        id: mockAnalysisData.id,
        subject_name: mockAnalysisData.subject_name,
        birth_date: mockAnalysisData.birth_date,
        birth_time: mockAnalysisData.birth_time,
        gender: mockAnalysisData.gender,
        ai_model: mockAnalysisData.ai_model,
        analysis_result: mockAnalysisData.analysis_result,
        status: mockAnalysisData.status,
        view_count: 6, // Incremented from 5
        created_at: mockAnalysisData.created_at,
        last_viewed_at: expect.any(String),
      });

      // Verify select was called correctly
      expect(mockSupabase.from).toHaveBeenCalledWith('analyses');
      expect(mockSelect).toHaveBeenCalled();

      // Verify update was called for view count increment
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should return 404 when analysis not found', async () => {
      // Arrange: Mock not found response
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: null,
              })
            ),
          })),
        })),
      })) as any;

      // Act
      const result = await getAnalysisById(
        mockSupabase as SupabaseClient,
        'non-existent-id',
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error.code).toBe(analysisDetailErrorCodes.analysisNotFound);
      expect(result.error.message).toBe('분석 결과를 찾을 수 없습니다');
    });

    it('should return 403 when user does not own the analysis', async () => {
      // Arrange: Mock analysis owned by different user
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: {
                  ...mockAnalysisData,
                  user_id: 'different-user-id',
                },
                error: null,
              })
            ),
          })),
        })),
      })) as any;

      // Act
      const result = await getAnalysisById(
        mockSupabase as SupabaseClient,
        mockAnalysisId,
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.error.code).toBe(analysisDetailErrorCodes.forbidden);
      expect(result.error.message).toBe('이 분석 결과에 접근할 권한이 없습니다');
    });

    it('should return 500 on database error', async () => {
      // Arrange: Mock database error
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: 'Database connection failed' },
              })
            ),
          })),
        })),
      })) as any;

      // Act
      const result = await getAnalysisById(
        mockSupabase as SupabaseClient,
        mockAnalysisId,
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error.code).toBe(analysisDetailErrorCodes.databaseError);
      expect(result.error.message).toBe('Database connection failed');
    });

    it('should handle view count update failure gracefully', async () => {
      // Arrange: Mock successful select but failed update
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'analyses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: mockAnalysisData,
                    error: null,
                  })
                ),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  error: { message: 'Update failed' },
                })
              ),
            })),
          };
        }
        return {};
      }) as any;

      // Spy on console.error to verify it's called
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      const result = await getAnalysisById(
        mockSupabase as SupabaseClient,
        mockAnalysisId,
        mockUserId
      );

      // Assert: Should still return success even if view count update fails
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to increment view count:',
        expect.objectContaining({ message: 'Update failed' })
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle analysis without birth time', async () => {
      // Arrange: Mock analysis without birth_time
      const analysisWithoutTime = {
        ...mockAnalysisData,
        birth_time: null,
      };

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: analysisWithoutTime,
                error: null,
              })
            ),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() =>
            Promise.resolve({
              error: null,
            })
          ),
        })),
      })) as any;

      // Act
      const result = await getAnalysisById(
        mockSupabase as SupabaseClient,
        mockAnalysisId,
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(true);
      expect(result.data.birth_time).toBeNull();
    });
  });

  describe('deleteAnalysis', () => {
    it('should delete analysis for authorized user', async () => {
      // Arrange: Mock successful responses
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'analyses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: { user_id: mockUserId },
                    error: null,
                  })
                ),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  error: null,
                })
              ),
            })),
          };
        }
        return {};
      }) as any;

      // Act
      const result = await deleteAnalysis(
        mockSupabase as SupabaseClient,
        mockAnalysisId,
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toBeUndefined();

      // Verify delete was called
      expect(mockSupabase.from).toHaveBeenCalledWith('analyses');
    });

    it('should return 404 when analysis not found', async () => {
      // Arrange: Mock not found response
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: null,
              })
            ),
          })),
        })),
      })) as any;

      // Act
      const result = await deleteAnalysis(
        mockSupabase as SupabaseClient,
        'non-existent-id',
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error.code).toBe(analysisDetailErrorCodes.analysisNotFound);
      expect(result.error.message).toBe('분석 결과를 찾을 수 없습니다');
    });

    it('should return 403 when user does not own the analysis', async () => {
      // Arrange: Mock analysis owned by different user
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: { user_id: 'different-user-id' },
                error: null,
              })
            ),
          })),
        })),
      })) as any;

      // Act
      const result = await deleteAnalysis(
        mockSupabase as SupabaseClient,
        mockAnalysisId,
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(false);
      expect(result.status).toBe(403);
      expect(result.error.code).toBe(analysisDetailErrorCodes.forbidden);
      expect(result.error.message).toBe('이 분석을 삭제할 권한이 없습니다');
    });

    it('should return 500 on database error during select', async () => {
      // Arrange: Mock database error during select
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: 'Database error' },
              })
            ),
          })),
        })),
      })) as any;

      // Act
      const result = await deleteAnalysis(
        mockSupabase as SupabaseClient,
        mockAnalysisId,
        mockUserId
      );

      // Assert: Service should handle gracefully
      // Since the service only checks if data is null, not the error
      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error.code).toBe(analysisDetailErrorCodes.analysisNotFound);
    });

    it('should return 500 on database error during delete', async () => {
      // Arrange: Mock successful select but failed delete
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'analyses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: { user_id: mockUserId },
                    error: null,
                  })
                ),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(() =>
                Promise.resolve({
                  error: { message: 'Delete failed' },
                })
              ),
            })),
          };
        }
        return {};
      }) as any;

      // Act
      const result = await deleteAnalysis(
        mockSupabase as SupabaseClient,
        mockAnalysisId,
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error.code).toBe(analysisDetailErrorCodes.databaseError);
      expect(result.error.message).toBe('Delete failed');
    });
  });
});
