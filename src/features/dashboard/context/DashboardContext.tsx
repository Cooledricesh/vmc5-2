'use client';

import React, { createContext, useReducer, useCallback, useMemo, useEffect, useRef } from 'react';
import { dashboardReducer, initialState } from './reducer';
import type { DashboardState, FilterState } from './types';
import { fetchSummary, fetchStats, fetchAnalyses } from '../actions/dashboardActions';
import { POLLING_INTERVAL, MAX_POLLING_COUNT } from '../lib/constants';

type DashboardContextValue = {
  state: DashboardState;
  actions: {
    fetchSummary: () => Promise<void>;
    fetchStats: () => Promise<void>;
    fetchAnalyses: () => Promise<void>;
    setPeriod: (period: FilterState['period']) => void;
    setSort: (sort: FilterState['sort']) => void;
    resetFilters: () => void;
    setPage: (page: number) => void;
    startPolling: () => void;
    stopPolling: () => void;
  };
  computed: {
    hasProcessingAnalyses: boolean;
    isEmpty: boolean;
    isInitialLoading: boolean;
  };
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // API 호출 함수
  const handleFetchSummary = useCallback(async () => {
    await fetchSummary(dispatch);
  }, []);

  const handleFetchStats = useCallback(async () => {
    await fetchStats(dispatch);
  }, []);

  const handleFetchAnalyses = useCallback(async () => {
    await fetchAnalyses(dispatch, {
      period: state.filters.period,
      sort: state.filters.sort,
      page: state.pagination.current_page,
      limit: state.pagination.per_page,
    });
  }, [state.filters, state.pagination]);

  // 액션 헬퍼
  const setPeriod = useCallback((period: FilterState['period']) => {
    dispatch({ type: 'SET_PERIOD', payload: { period } });
  }, []);

  const setSort = useCallback((sort: FilterState['sort']) => {
    dispatch({ type: 'SET_SORT', payload: { sort } });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  const setPage = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', payload: { page } });
  }, []);

  const startPolling = useCallback(() => {
    dispatch({ type: 'START_POLLING' });
  }, []);

  const stopPolling = useCallback(() => {
    dispatch({ type: 'STOP_POLLING' });
  }, []);

  // 파생 데이터 (computed)
  const computed = useMemo(
    () => ({
      hasProcessingAnalyses: state.analyses.analyses.some((a) => a.status === 'processing'),
      isEmpty: state.analyses.analyses.length === 0 && !state.analyses.isLoading,
      isInitialLoading: state.userSummary.isLoading && state.stats.isLoading && state.analyses.isLoading,
    }),
    [state]
  );

  // 초기 데이터 로드
  useEffect(() => {
    handleFetchSummary();
    handleFetchStats();
    handleFetchAnalyses();
  }, []); // 최초 마운트 시에만 실행

  // 필터/페이지 변경 시 데이터 재조회
  useEffect(() => {
    handleFetchAnalyses();
  }, [state.filters, state.pagination.current_page]); // 의존성 배열 수정

  // 폴링 로직
  useEffect(() => {
    if (!state.polling.isPolling) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // 최대 횟수 체크
    if (state.polling.pollingCount >= MAX_POLLING_COUNT) {
      dispatch({ type: 'STOP_POLLING' });
      return;
    }

    pollingIntervalRef.current = setInterval(() => {
      dispatch({ type: 'INCREMENT_POLLING_COUNT' });

      handleFetchAnalyses();
    }, POLLING_INTERVAL);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [state.polling.isPolling, state.polling.pollingCount, handleFetchAnalyses]);

  const value: DashboardContextValue = {
    state,
    actions: {
      fetchSummary: handleFetchSummary,
      fetchStats: handleFetchStats,
      fetchAnalyses: handleFetchAnalyses,
      setPeriod,
      setSort,
      resetFilters,
      setPage,
      startPolling,
      stopPolling,
    },
    computed,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboardContext = () => {
  const context = React.useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within DashboardProvider');
  }
  return context;
};
