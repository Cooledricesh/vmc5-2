import type { AnalysisDetailState, AnalysisDetailAction } from '../lib/types';

export const initialState: AnalysisDetailState = {
  analysis: {
    data: null,
    isLoading: true,
    error: null,
  },
  ui: {
    activeTab: 'personality',
    modals: {
      reanalyze: { isOpen: false, isProcessing: false },
      delete: { isOpen: false, isProcessing: false },
      share: { isOpen: false, shareUrl: null },
    },
    chartLoading: {
      fiveElements: true,
    },
  },
  user: {
    subscription_tier: 'free',
    remaining_count: 0,
  },
};

export function analysisDetailReducer(
  state: AnalysisDetailState,
  action: AnalysisDetailAction
): AnalysisDetailState {
  switch (action.type) {
    // 분석 조회
    case 'FETCH_ANALYSIS_START':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          isLoading: true,
          error: null,
        },
      };

    case 'FETCH_ANALYSIS_SUCCESS':
      return {
        ...state,
        analysis: {
          data: action.payload,
          isLoading: false,
          error: null,
        },
      };

    case 'FETCH_ANALYSIS_ERROR':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          isLoading: false,
          error: action.payload.error,
        },
      };

    // 탭 전환
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        ui: {
          ...state.ui,
          activeTab: action.payload.tab,
        },
      };

    // 재분석 모달
    case 'OPEN_REANALYZE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            reanalyze: { isOpen: true, isProcessing: false },
          },
        },
      };

    case 'CLOSE_REANALYZE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            reanalyze: { isOpen: false, isProcessing: false },
          },
        },
      };

    case 'REANALYZE_START':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            reanalyze: { ...state.ui.modals.reanalyze, isProcessing: true },
          },
        },
      };

    case 'REANALYZE_SUCCESS':
      return state;

    case 'REANALYZE_ERROR':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            reanalyze: { isOpen: true, isProcessing: false },
          },
        },
      };

    // 삭제 모달
    case 'OPEN_DELETE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            delete: { isOpen: true, isProcessing: false },
          },
        },
      };

    case 'CLOSE_DELETE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            delete: { isOpen: false, isProcessing: false },
          },
        },
      };

    case 'DELETE_START':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            delete: { ...state.ui.modals.delete, isProcessing: true },
          },
        },
      };

    case 'DELETE_SUCCESS':
      return state;

    case 'DELETE_ERROR':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            delete: { isOpen: true, isProcessing: false },
          },
        },
      };

    // 공유 모달
    case 'OPEN_SHARE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            share: { isOpen: true, shareUrl: null },
          },
        },
      };

    case 'CLOSE_SHARE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            share: { isOpen: false, shareUrl: null },
          },
        },
      };

    case 'GENERATE_SHARE_URL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            share: { ...state.ui.modals.share, shareUrl: action.payload.url },
          },
        },
      };

    // 차트 로딩
    case 'SET_CHART_LOADING':
      return {
        ...state,
        ui: {
          ...state.ui,
          chartLoading: {
            ...state.ui.chartLoading,
            fiveElements: action.payload.loading,
          },
        },
      };

    default:
      return state;
  }
}
