'use client';

import React, { createContext, useReducer, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatRelativeTime } from '@/lib/utils/date';
import { getAiModelBadge, getGenderIcon } from '../lib/utils';
import type { AnalysisDetailState, AnalysisDetailAction, UIState } from '../lib/types';
import { analysisDetailReducer, initialState } from './reducer';
import {
  fetchAnalysis as fetchAnalysisAction,
  deleteAnalysis as deleteAnalysisAction,
  reanalyzeAnalysis as reanalyzeAnalysisAction,
} from '../actions/analysisDetailActions';

type AnalysisDetailContextValue = {
  state: AnalysisDetailState;
  actions: {
    fetchAnalysis: (id: string) => Promise<void>;
    setActiveTab: (tab: UIState['activeTab']) => void;
    openReanalyzeModal: () => void;
    closeReanalyzeModal: () => void;
    reanalyzeAnalysis: () => Promise<void>;
    openDeleteModal: () => void;
    closeDeleteModal: () => void;
    deleteAnalysis: () => Promise<void>;
    setChartLoading: (loading: boolean) => void;
  };
  computed: {
    canReanalyze: boolean;
    relativeTime: string;
    aiModelBadge: string;
    genderIcon: string;
  };
};

const AnalysisDetailContext = createContext<AnalysisDetailContextValue | null>(null);

export const AnalysisDetailProvider: React.FC<{
  children: React.ReactNode;
  analysisId: string;
}> = ({ children, analysisId }) => {
  const [state, dispatch] = useReducer(analysisDetailReducer, initialState);
  const router = useRouter();

  // API 호출 함수
  const fetchAnalysis = useCallback(async (id: string) => {
    await fetchAnalysisAction(dispatch, id);
  }, []);

  const reanalyzeAnalysis = useCallback(async () => {
    if (!state.analysis.data) return;

    const result = await reanalyzeAnalysisAction(dispatch, {
      original_analysis_id: state.analysis.data.id,
      subject_name: state.analysis.data.subject_name,
      birth_date: state.analysis.data.birth_date,
      birth_time: state.analysis.data.birth_time,
      gender: state.analysis.data.gender,
    });

    if (result.success && result.new_analysis_id) {
      router.push(`/analysis/${result.new_analysis_id}`);
    }
  }, [state.analysis.data, router]);

  const deleteAnalysis = useCallback(async () => {
    if (!state.analysis.data) return;

    const result = await deleteAnalysisAction(dispatch, state.analysis.data.id);

    if (result.success) {
      router.push('/dashboard');
    }
  }, [state.analysis.data, router]);

  // 액션 헬퍼
  const setActiveTab = useCallback((tab: UIState['activeTab']) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: { tab } });
  }, []);

  const openReanalyzeModal = useCallback(() => {
    if (state.user.subscription_tier !== 'pro') {
      alert('Pro 구독이 필요합니다');
      return;
    }
    dispatch({ type: 'OPEN_REANALYZE_MODAL' });
  }, [state.user.subscription_tier]);

  const closeReanalyzeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_REANALYZE_MODAL' });
  }, []);

  const openDeleteModal = useCallback(() => {
    dispatch({ type: 'OPEN_DELETE_MODAL' });
  }, []);

  const closeDeleteModal = useCallback(() => {
    dispatch({ type: 'CLOSE_DELETE_MODAL' });
  }, []);

  const setChartLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_CHART_LOADING', payload: { loading } });
  }, []);

  // 파생 데이터 (computed)
  const computed = useMemo(
    () => ({
      canReanalyze: state.user.subscription_tier === 'pro' && state.user.remaining_count > 0,
      relativeTime: state.analysis.data?.created_at
        ? formatRelativeTime(state.analysis.data.created_at)
        : '',
      aiModelBadge: state.analysis.data?.ai_model
        ? getAiModelBadge(state.analysis.data.ai_model)
        : '',
      genderIcon: state.analysis.data?.gender ? getGenderIcon(state.analysis.data.gender) : '',
    }),
    [
      state.user.subscription_tier,
      state.user.remaining_count,
      state.analysis.data?.created_at,
      state.analysis.data?.ai_model,
      state.analysis.data?.gender,
    ]
  );

  // 초기 데이터 로드
  useEffect(() => {
    fetchAnalysis(analysisId);
  }, [analysisId, fetchAnalysis]);

  // Context value를 useMemo로 최적화하여 불필요한 리렌더링 방지
  const value: AnalysisDetailContextValue = useMemo(
    () => ({
      state,
      actions: {
        fetchAnalysis,
        setActiveTab,
        openReanalyzeModal,
        closeReanalyzeModal,
        reanalyzeAnalysis,
        openDeleteModal,
        closeDeleteModal,
        deleteAnalysis,
        setChartLoading,
      },
      computed,
    }),
    [
      state,
      fetchAnalysis,
      setActiveTab,
      openReanalyzeModal,
      closeReanalyzeModal,
      reanalyzeAnalysis,
      openDeleteModal,
      closeDeleteModal,
      deleteAnalysis,
      setChartLoading,
      computed,
    ]
  );

  return (
    <AnalysisDetailContext.Provider value={value}>{children}</AnalysisDetailContext.Provider>
  );
};

export const useAnalysisDetailContext = () => {
  const context = React.useContext(AnalysisDetailContext);
  if (!context) {
    throw new Error('useAnalysisDetailContext must be used within AnalysisDetailProvider');
  }
  return context;
};
