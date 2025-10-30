import type {
  DashboardSummaryResponse,
  DashboardStatsResponse,
  AnalysisItem,
  Pagination,
  AnalysesListResponse,
} from '../lib/dto';

// 사용자 정보 상태
export type UserSummaryState = {
  user: DashboardSummaryResponse['user'] | null;
  subscription: DashboardSummaryResponse['subscription'] | null;
  isLoading: boolean;
  error: string | null;
};

// 통계 상태
export type StatsState = {
  total_count: number;
  monthly_count: number;
  this_week_count: number;
  isLoading: boolean;
  error: string | null;
};

// 분석 목록 상태
export type AnalysesState = {
  analyses: AnalysisItem[];
  pagination: Pagination;
  isLoading: boolean;
  error: string | null;
};

// 필터 상태
export type FilterState = {
  period: 'all' | '7days' | '30days' | '90days';
  sort: 'latest' | 'oldest';
};

// 페이지네이션 상태
export type PaginationState = {
  current_page: number;
  per_page: number;
};

// 폴링 상태
export type PollingState = {
  isPolling: boolean;
  pollingCount: number;
};

// 전체 상태
export type DashboardState = {
  userSummary: UserSummaryState;
  stats: StatsState;
  analyses: AnalysesState;
  filters: FilterState;
  pagination: PaginationState;
  polling: PollingState;
};

// 액션 타입
export type DashboardAction =
  // 사용자 정보
  | { type: 'FETCH_SUMMARY_START' }
  | { type: 'FETCH_SUMMARY_SUCCESS'; payload: DashboardSummaryResponse }
  | { type: 'FETCH_SUMMARY_ERROR'; payload: { error: string } }

  // 통계
  | { type: 'FETCH_STATS_START' }
  | { type: 'FETCH_STATS_SUCCESS'; payload: DashboardStatsResponse }
  | { type: 'FETCH_STATS_ERROR'; payload: { error: string } }

  // 분석 목록
  | { type: 'FETCH_ANALYSES_START' }
  | { type: 'FETCH_ANALYSES_SUCCESS'; payload: AnalysesListResponse }
  | { type: 'FETCH_ANALYSES_ERROR'; payload: { error: string } }

  // 필터
  | { type: 'SET_PERIOD'; payload: { period: FilterState['period'] } }
  | { type: 'SET_SORT'; payload: { sort: FilterState['sort'] } }
  | { type: 'RESET_FILTERS' }

  // 페이지네이션
  | { type: 'SET_PAGE'; payload: { page: number } }
  | { type: 'RESET_PAGE' }

  // 폴링
  | { type: 'START_POLLING' }
  | { type: 'STOP_POLLING' }
  | { type: 'INCREMENT_POLLING_COUNT' }
  | { type: 'UPDATE_ANALYSIS_STATUS'; payload: { id: string; status: 'completed' | 'failed' } };
