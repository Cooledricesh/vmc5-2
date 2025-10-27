/**
 * Frontend 전용 타입 정의
 */

import type { AnalysisDetailResponse } from './dto';

// 분석 상태
export type AnalysisState = {
  data: AnalysisDetailResponse | null;
  isLoading: boolean;
  error: string | null;
};

// UI 상태
export type UIState = {
  activeTab: 'personality' | 'wealth' | 'health' | 'love';
  modals: {
    reanalyze: {
      isOpen: boolean;
      isProcessing: boolean;
    };
    delete: {
      isOpen: boolean;
      isProcessing: boolean;
    };
    share: {
      isOpen: boolean;
      shareUrl: string | null;
    };
  };
  chartLoading: {
    fiveElements: boolean;
  };
};

// 사용자 상태
export type UserState = {
  subscription_tier: 'free' | 'pro';
  remaining_count: number;
};

// 전체 상태
export type AnalysisDetailState = {
  analysis: AnalysisState;
  ui: UIState;
  user: UserState;
};

// Action 타입
export type AnalysisDetailAction =
  // 분석 조회
  | { type: 'FETCH_ANALYSIS_START' }
  | { type: 'FETCH_ANALYSIS_SUCCESS'; payload: AnalysisDetailResponse }
  | { type: 'FETCH_ANALYSIS_ERROR'; payload: { error: string } }
  // 탭 전환
  | { type: 'SET_ACTIVE_TAB'; payload: { tab: UIState['activeTab'] } }
  // 재분석 모달
  | { type: 'OPEN_REANALYZE_MODAL' }
  | { type: 'CLOSE_REANALYZE_MODAL' }
  | { type: 'REANALYZE_START' }
  | { type: 'REANALYZE_SUCCESS'; payload: { new_analysis_id: string } }
  | { type: 'REANALYZE_ERROR'; payload: { error: string } }
  // 삭제 모달
  | { type: 'OPEN_DELETE_MODAL' }
  | { type: 'CLOSE_DELETE_MODAL' }
  | { type: 'DELETE_START' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR'; payload: { error: string } }
  // 공유 모달
  | { type: 'OPEN_SHARE_MODAL' }
  | { type: 'CLOSE_SHARE_MODAL' }
  | { type: 'GENERATE_SHARE_URL'; payload: { url: string } }
  // 차트 로딩
  | { type: 'SET_CHART_LOADING'; payload: { loading: boolean } };
