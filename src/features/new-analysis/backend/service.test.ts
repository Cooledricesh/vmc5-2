import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getUserAnalysisCount,
  checkDuplicateAnalysis,
  createNewAnalysis,
  getAnalysisStatus,
  refundAnalysisCount,
} from './service';
import { newAnalysisErrorCodes } from './error';

// Mock the Gemini client
vi.mock('../../../lib/external/gemini-client', () => ({
  getGeminiClient: vi.fn(() => ({
    generateSajuAnalysis: vi.fn().mockResolvedValue({
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
      fortune_flow: {
        major_fortune: '대운 분석',
        yearly_fortune: '연운 분석',
      },
      interpretation: {
        personality: '성격 분석',
        wealth: '재물운',
        health: '건강운',
        love: '애정운',
      },
    }),
  })),
  getGeminiProClient: vi.fn(() => ({
    generateSajuAnalysis: vi.fn().mockResolvedValue({
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
      fortune_flow: {
        major_fortune: '대운 분석',
        yearly_fortune: '연운 분석',
      },
      interpretation: {
        personality: '성격 분석',
        wealth: '재물운',
        health: '건강운',
        love: '애정운',
      },
    }),
  })),
}));

describe('New Analysis Service', () => {
  let mockSupabase: Partial<SupabaseClient>;
  const mockUserId = 'test-user-id';
  const mockAnalysisId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      from: vi.fn(),
    };
  });

  describe('getUserAnalysisCount', () => {
    it('should return count for pro user', async () => {
      // Arrange: Mock pro user data
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: {
                  subscription_tier: 'pro',
                  free_analysis_count: 3,
                  monthly_analysis_count: 8,
                },
                error: null,
              })
            ),
          })),
        })),
      })) as any;

      // Act
      const result = await getUserAnalysisCount(
        mockSupabase as SupabaseClient,
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toEqual({
        subscription_tier: 'pro',
        remaining_count: 8,
        max_count: 10,
        is_insufficient: false,
      });
    });

    it('should return count for free user', async () => {
      // Arrange: Mock free user data
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: {
                  subscription_tier: 'free',
                  free_analysis_count: 2,
                  monthly_analysis_count: 0,
                },
                error: null,
              })
            ),
          })),
        })),
      })) as any;

      // Act
      const result = await getUserAnalysisCount(
        mockSupabase as SupabaseClient,
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({
        subscription_tier: 'free',
        remaining_count: 2,
        max_count: 3,
        is_insufficient: false,
      });
    });

    it('should indicate insufficient count when count is 0', async () => {
      // Arrange: Mock user with no remaining analyses
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: {
                  subscription_tier: 'free',
                  free_analysis_count: 0,
                  monthly_analysis_count: 0,
                },
                error: null,
              })
            ),
          })),
        })),
      })) as any;

      // Act
      const result = await getUserAnalysisCount(
        mockSupabase as SupabaseClient,
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(true);
      expect(result.data.is_insufficient).toBe(true);
      expect(result.data.remaining_count).toBe(0);
    });

    it('should return 404 when user not found', async () => {
      // Arrange: Mock user not found
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
      const result = await getUserAnalysisCount(
        mockSupabase as SupabaseClient,
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error.code).toBe(newAnalysisErrorCodes.unauthorized);
    });

    it('should return 500 on database error', async () => {
      // Arrange: Mock database error
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
      const result = await getUserAnalysisCount(
        mockSupabase as SupabaseClient,
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error.code).toBe(newAnalysisErrorCodes.databaseError);
    });
  });

  describe('checkDuplicateAnalysis', () => {
    it('should return null when no analysis is in progress', async () => {
      // Arrange: Need to support double .eq() calls
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({
                  data: null,
                  error: null,
                })
              ),
            })),
          })),
        })),
      })) as any;

      // Act
      const result = await checkDuplicateAnalysis(
        mockSupabase as SupabaseClient,
        mockUserId
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should return analysis ID when analysis is in progress', async () => {
      // Arrange
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({
                  data: { id: mockAnalysisId },
                  error: null,
                })
              ),
            })),
          })),
        })),
      })) as any;

      // Act
      const result = await checkDuplicateAnalysis(
        mockSupabase as SupabaseClient,
        mockUserId
      );

      // Assert
      expect(result).toBe(mockAnalysisId);
    });
  });

  describe('getAnalysisStatus', () => {
    it('should return completed analysis status', async () => {
      // Arrange
      const mockAnalysisData = {
        id: mockAnalysisId,
        status: 'completed',
        analysis_result: { test: 'data' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:05:00Z',
      };

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({
                  data: mockAnalysisData,
                  error: null,
                })
              ),
            })),
          })),
        })),
      })) as any;

      // Act
      const result = await getAnalysisStatus(
        mockSupabase as SupabaseClient,
        mockAnalysisId,
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data.status).toBe('completed');
      expect(result.data.id).toBe(mockAnalysisId);
    });

    it('should return processing status', async () => {
      // Arrange
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({
                  data: {
                    id: mockAnalysisId,
                    status: 'processing',
                    analysis_result: null,
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                  },
                  error: null,
                })
              ),
            })),
          })),
        })),
      })) as any;

      // Act
      const result = await getAnalysisStatus(
        mockSupabase as SupabaseClient,
        mockAnalysisId,
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(true);
      expect(result.data.status).toBe('processing');
      expect(result.data.analysis_result).toBeNull();
    });

    it('should return 404 when analysis not found', async () => {
      // Arrange
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({
                  data: null,
                  error: null,
                })
              ),
            })),
          })),
        })),
      })) as any;

      // Act
      const result = await getAnalysisStatus(
        mockSupabase as SupabaseClient,
        mockAnalysisId,
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error.code).toBe(newAnalysisErrorCodes.analysisNotFound);
    });

    it('should return 500 on database error', async () => {
      // Arrange
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({
                  data: null,
                  error: { message: 'Database error' },
                })
              ),
            })),
          })),
        })),
      })) as any;

      // Act
      const result = await getAnalysisStatus(
        mockSupabase as SupabaseClient,
        mockAnalysisId,
        mockUserId
      );

      // Assert
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error.code).toBe(newAnalysisErrorCodes.databaseError);
    });
  });

  describe('refundAnalysisCount', () => {
    it('should refund count for free user', async () => {
      // Arrange
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { free_analysis_count: 1 },
              error: null,
            })
          ),
        })),
      }));

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      mockSupabase.from = vi.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })) as any;

      // Act
      await refundAnalysisCount(
        mockSupabase as SupabaseClient,
        mockUserId,
        'free'
      );

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith({ free_analysis_count: 2 });
    });

    it('should refund count for pro user', async () => {
      // Arrange
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { monthly_analysis_count: 5 },
              error: null,
            })
          ),
        })),
      }));

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      mockSupabase.from = vi.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })) as any;

      // Act
      await refundAnalysisCount(
        mockSupabase as SupabaseClient,
        mockUserId,
        'pro'
      );

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith({ monthly_analysis_count: 6 });
    });

    it('should not exceed max count when refunding', async () => {
      // Arrange: User already at max count
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { free_analysis_count: 3 }, // Already at max
              error: null,
            })
          ),
        })),
      }));

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      }));

      mockSupabase.from = vi.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })) as any;

      // Act
      await refundAnalysisCount(
        mockSupabase as SupabaseClient,
        mockUserId,
        'free'
      );

      // Assert: Should remain at 3, not go to 4
      expect(mockUpdate).toHaveBeenCalledWith({ free_analysis_count: 3 });
    });

    it('should handle missing user data gracefully', async () => {
      // Arrange
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: null,
              })
            ),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })) as any;

      // Act & Assert: Should not throw
      await expect(
        refundAnalysisCount(
          mockSupabase as SupabaseClient,
          mockUserId,
          'free'
        )
      ).resolves.not.toThrow();
    });
  });

  describe('createNewAnalysis', () => {
    const mockRequest = {
      subject_name: '홍길동',
      birth_date: '1990-01-01',
      birth_time: '14:30',
      gender: 'male' as const,
    };

    it('should create analysis for pro user successfully', async () => {
      // Arrange: Mock all database operations
      const mockFrom = vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      subscription_tier: 'pro',
                      free_analysis_count: 3,
                      monthly_analysis_count: 8,
                    },
                    error: null,
                  })
                ),
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { monthly_analysis_count: 8 },
                    error: null,
                  })
                ),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          };
        }
        if (table === 'analyses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() =>
                    Promise.resolve({
                      data: null, // No duplicate analysis
                      error: null,
                    })
                  ),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { id: mockAnalysisId },
                    error: null,
                  })
                ),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          };
        }
        return {};
      });

      mockSupabase.from = mockFrom as any;

      // Act
      const result = await createNewAnalysis(
        mockSupabase as SupabaseClient,
        mockUserId,
        'pro',
        mockRequest,
        'test-api-key'
      );

      // Assert
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data.analysis_id).toBe(mockAnalysisId);
      expect(result.data.status).toBe('completed');
      expect(result.data.remaining_count).toBe(7); // Decremented from 8
    });

    it('should return error when analysis count is insufficient', async () => {
      // Arrange: Mock user with no remaining analyses
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: {
                  subscription_tier: 'free',
                  free_analysis_count: 0,
                  monthly_analysis_count: 0,
                },
                error: null,
              })
            ),
          })),
        })),
      })) as any;

      // Act
      const result = await createNewAnalysis(
        mockSupabase as SupabaseClient,
        mockUserId,
        'free',
        mockRequest,
        'test-api-key'
      );

      // Assert
      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error.code).toBe(newAnalysisErrorCodes.insufficientAnalysisCount);
    });

    it('should return error when analysis is already in progress', async () => {
      // Arrange
      const mockFrom = vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      subscription_tier: 'pro',
                      free_analysis_count: 3,
                      monthly_analysis_count: 8,
                    },
                    error: null,
                  })
                ),
              })),
            })),
          };
        }
        if (table === 'analyses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() =>
                    Promise.resolve({
                      data: { id: 'existing-id' }, // Duplicate found
                      error: null,
                    })
                  ),
                })),
              })),
            })),
          };
        }
        return {};
      });

      mockSupabase.from = mockFrom as any;

      // Act
      const result = await createNewAnalysis(
        mockSupabase as SupabaseClient,
        mockUserId,
        'pro',
        mockRequest,
        'test-api-key'
      );

      // Assert
      expect(result.ok).toBe(false);
      expect(result.status).toBe(409);
      expect(result.error.code).toBe(newAnalysisErrorCodes.analysisInProgress);
    });

    it('should handle analysis without birth time', async () => {
      // Arrange: Request without birth_time
      const requestWithoutTime = {
        ...mockRequest,
        birth_time: null,
      };

      const mockFrom = vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() =>
                  Promise.resolve({
                    data: {
                      subscription_tier: 'free',
                      free_analysis_count: 2,
                      monthly_analysis_count: 0,
                    },
                    error: null,
                  })
                ),
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { free_analysis_count: 2 },
                    error: null,
                  })
                ),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          };
        }
        if (table === 'analyses') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() =>
                    Promise.resolve({
                      data: null,
                      error: null,
                    })
                  ),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: { id: mockAnalysisId },
                    error: null,
                  })
                ),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
          };
        }
        return {};
      });

      mockSupabase.from = mockFrom as any;

      // Act
      const result = await createNewAnalysis(
        mockSupabase as SupabaseClient,
        mockUserId,
        'free',
        requestWithoutTime,
        'test-api-key'
      );

      // Assert
      expect(result.ok).toBe(true);
      expect(result.data.analysis_id).toBe(mockAnalysisId);
    });
  });
});
