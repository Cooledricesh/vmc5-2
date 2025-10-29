import type { DashboardState, DashboardAction } from './types';
import { DEFAULT_PAGE_SIZE } from '../lib/constants';
import { ensureArray } from './helpers';

export const initialState: DashboardState = {
  userSummary: {
    user: null,
    subscription: null,
    isLoading: true,
    error: null,
  },
  stats: {
    total_count: 0,
    monthly_count: 0,
    this_week_count: 0,
    isLoading: true,
    error: null,
  },
  analyses: {
    analyses: [],
    pagination: {
      current_page: 1,
      total_pages: 0,
      total_count: 0,
      per_page: DEFAULT_PAGE_SIZE,
    },
    isLoading: true,
    error: null,
  },
  filters: {
    period: 'all',
    sort: 'latest',
  },
  pagination: {
    current_page: 1,
    per_page: DEFAULT_PAGE_SIZE,
  },
  polling: {
    isPolling: false,
    pollingCount: 0,
  },
};

export function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    // 사용자 정보
    case 'FETCH_SUMMARY_START':
      return {
        ...state,
        userSummary: {
          ...state.userSummary,
          isLoading: true,
          error: null,
        },
      };

    case 'FETCH_SUMMARY_SUCCESS':
      return {
        ...state,
        userSummary: {
          user: action.payload.user,
          subscription: action.payload.subscription,
          isLoading: false,
          error: null,
        },
      };

    case 'FETCH_SUMMARY_ERROR':
      return {
        ...state,
        userSummary: {
          ...state.userSummary,
          isLoading: false,
          error: action.payload.error,
        },
      };

    // 통계
    case 'FETCH_STATS_START':
      return {
        ...state,
        stats: {
          ...state.stats,
          isLoading: true,
          error: null,
        },
      };

    case 'FETCH_STATS_SUCCESS':
      return {
        ...state,
        stats: {
          total_count: action.payload.total_count || 0,
          monthly_count: action.payload.monthly_count || 0,
          this_week_count: action.payload.this_week_count || 0,
          isLoading: false,
          error: null,
        },
      };

    case 'FETCH_STATS_ERROR':
      return {
        ...state,
        stats: {
          ...state.stats,
          isLoading: false,
          error: action.payload.error,
        },
      };

    // 분석 목록
    case 'FETCH_ANALYSES_START':
      return {
        ...state,
        analyses: {
          ...state.analyses,
          isLoading: true,
          error: null,
        },
      };

    case 'FETCH_ANALYSES_SUCCESS':
      return {
        ...state,
        analyses: {
          analyses: action.payload.analyses,
          pagination: action.payload.pagination,
          isLoading: false,
          error: null,
        },
      };

    case 'FETCH_ANALYSES_ERROR':
      return {
        ...state,
        analyses: {
          ...state.analyses,
          analyses: ensureArray(state.analyses.analyses), // 헬퍼 함수 사용
          isLoading: false,
          error: action.payload.error,
        },
      };

    // 필터
    case 'SET_PERIOD':
      return {
        ...state,
        filters: {
          ...state.filters,
          period: action.payload.period,
        },
        pagination: {
          ...state.pagination,
          current_page: 1, // 필터 변경 시 페이지 초기화
        },
      };

    case 'SET_SORT':
      return {
        ...state,
        filters: {
          ...state.filters,
          sort: action.payload.sort,
        },
        pagination: {
          ...state.pagination,
          current_page: 1, // 정렬 변경 시 페이지 초기화
        },
      };

    case 'RESET_FILTERS':
      return {
        ...state,
        filters: {
          period: 'all',
          sort: 'latest',
        },
        pagination: {
          ...state.pagination,
          current_page: 1,
        },
      };

    // 페이지네이션
    case 'SET_PAGE':
      return {
        ...state,
        pagination: {
          ...state.pagination,
          current_page: action.payload.page,
        },
      };

    case 'RESET_PAGE':
      return {
        ...state,
        pagination: {
          ...state.pagination,
          current_page: 1,
        },
      };

    // 폴링
    case 'START_POLLING':
      return {
        ...state,
        polling: {
          isPolling: true,
          pollingCount: 0,
        },
      };

    case 'STOP_POLLING':
      return {
        ...state,
        polling: {
          isPolling: false,
          pollingCount: 0,
        },
      };

    case 'INCREMENT_POLLING_COUNT':
      return {
        ...state,
        polling: {
          ...state.polling,
          pollingCount: state.polling.pollingCount + 1,
        },
      };

    case 'UPDATE_ANALYSIS_STATUS':
      return {
        ...state,
        analyses: {
          ...state.analyses,
          analyses: ensureArray(state.analyses.analyses).map((analysis) =>
            analysis.id === action.payload.id
              ? { ...analysis, status: action.payload.status }
              : analysis
          ),
        },
      };

    default:
      return state;
  }
}
