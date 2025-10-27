/**
 * 구독 Context Reducer
 */

import type { SubscriptionAction } from './actions';
import type {
  SubscriptionState,
  PaymentProcessState,
  TermsAgreementState,
  CancellationModalState,
  ReactivationModalState,
  TossPaymentsSDKState,
  LoadingState,
  ErrorState,
} from '../lib/types';
import { SUBSCRIPTION_PRICE, SUBSCRIPTION_TIERS } from '../lib/dto';

/**
 * Context 전체 상태
 */
export interface SubscriptionContextState {
  subscription: SubscriptionState;
  paymentProcess: PaymentProcessState;
  termsAgreement: TermsAgreementState;
  cancellationModal: CancellationModalState;
  reactivationModal: ReactivationModalState;
  tossSDK: TossPaymentsSDKState;
  loading: LoadingState;
  errors: ErrorState;
}

/**
 * 초기 상태
 */
export const initialState: SubscriptionContextState = {
  subscription: {
    subscription_id: null,
    subscription_tier: SUBSCRIPTION_TIERS.FREE as 'free',
    subscription_status: null,
    next_payment_date: null,
    effective_until: null,
    card_last_4digits: null,
    card_type: null,
    price: SUBSCRIPTION_PRICE,
    auto_renewal: false,
    monthly_analysis_count: 0,
    remaining_days: null,
  },
  paymentProcess: {
    step: 'idle',
    authKey: null,
    customerKey: null,
    isProcessing: false,
    error: null,
  },
  termsAgreement: {
    termsAccepted: false,
    privacyAccepted: false,
    autoPaymentAccepted: false,
    allAccepted: false,
  },
  cancellationModal: {
    isOpen: false,
    step: 'reason_selection',
    cancellation_reason: null,
    feedback: '',
    isSubmitting: false,
    error: null,
  },
  reactivationModal: {
    isOpen: false,
    selectedOption: null,
    isProcessing: false,
    error: null,
  },
  tossSDK: {
    isLoaded: false,
    isReady: false,
    instance: null,
    payment: null,
    loadError: null,
  },
  loading: {
    fetchingSubscription: false,
    processingPayment: false,
    cancellingSubscription: false,
    reactivatingSubscription: false,
    changingCard: false,
  },
  errors: {
    fetchError: null,
    paymentError: null,
    cancellationError: null,
    reactivationError: null,
    sdkError: null,
  },
};

/**
 * Reducer 함수
 */
export function subscriptionReducer(
  state: SubscriptionContextState,
  action: SubscriptionAction,
): SubscriptionContextState {
  switch (action.type) {
    // 구독 정보 조회
    case 'FETCH_SUBSCRIPTION_START':
      return {
        ...state,
        loading: { ...state.loading, fetchingSubscription: true },
        errors: { ...state.errors, fetchError: null },
      };

    case 'FETCH_SUBSCRIPTION_SUCCESS':
      return {
        ...state,
        subscription: action.payload,
        loading: { ...state.loading, fetchingSubscription: false },
      };

    case 'FETCH_SUBSCRIPTION_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, fetchingSubscription: false },
        errors: { ...state.errors, fetchError: action.payload.error },
      };

    // 결제 프로세스
    case 'INITIATE_SUBSCRIPTION':
      return {
        ...state,
        paymentProcess: { ...state.paymentProcess, step: 'terms_agreement' },
      };

    case 'UPDATE_TERMS': {
      const newTerms = {
        ...state.termsAgreement,
        ...action.payload,
      };
      const allAccepted =
        newTerms.termsAccepted && newTerms.privacyAccepted && newTerms.autoPaymentAccepted;
      return {
        ...state,
        termsAgreement: { ...newTerms, allAccepted },
      };
    }

    case 'LOAD_SDK_START':
      return {
        ...state,
        paymentProcess: { ...state.paymentProcess, step: 'loading_sdk' },
        tossSDK: { ...state.tossSDK, isLoaded: false, loadError: null },
      };

    case 'LOAD_SDK_SUCCESS':
      return {
        ...state,
        tossSDK: {
          ...state.tossSDK,
          isLoaded: true,
          isReady: true,
          instance: action.payload.instance,
          payment: action.payload.payment,
        },
      };

    case 'LOAD_SDK_FAILURE':
      return {
        ...state,
        paymentProcess: { ...state.paymentProcess, step: 'failed' },
        tossSDK: { ...state.tossSDK, loadError: action.payload.error },
        errors: { ...state.errors, sdkError: action.payload.error },
      };

    case 'REQUEST_BILLING_AUTH_START':
      return {
        ...state,
        paymentProcess: { ...state.paymentProcess, step: 'requesting_billing' },
      };

    case 'PROCESS_PAYMENT_START':
      return {
        ...state,
        paymentProcess: {
          ...state.paymentProcess,
          step: 'processing_payment',
          authKey: action.payload.authKey,
          customerKey: action.payload.customerKey,
          isProcessing: true,
        },
        loading: { ...state.loading, processingPayment: true },
      };

    case 'PROCESS_PAYMENT_SUCCESS':
      return {
        ...state,
        subscription: action.payload,
        paymentProcess: {
          ...state.paymentProcess,
          step: 'completed',
          isProcessing: false,
        },
        loading: { ...state.loading, processingPayment: false },
        termsAgreement: initialState.termsAgreement,
      };

    case 'PROCESS_PAYMENT_FAILURE':
      return {
        ...state,
        paymentProcess: {
          ...state.paymentProcess,
          step: 'failed',
          isProcessing: false,
          error: action.payload,
        },
        loading: { ...state.loading, processingPayment: false },
        errors: { ...state.errors, paymentError: action.payload },
      };

    case 'RESET_PAYMENT_PROCESS':
      return {
        ...state,
        paymentProcess: initialState.paymentProcess,
        termsAgreement: initialState.termsAgreement,
        errors: { ...state.errors, paymentError: null, sdkError: null },
      };

    // 구독 해지
    case 'OPEN_CANCELLATION_MODAL':
      return {
        ...state,
        cancellationModal: {
          ...initialState.cancellationModal,
          isOpen: true,
        },
      };

    case 'CLOSE_CANCELLATION_MODAL':
      return {
        ...state,
        cancellationModal: initialState.cancellationModal,
      };

    case 'SELECT_CANCELLATION_REASON':
      return {
        ...state,
        cancellationModal: {
          ...state.cancellationModal,
          cancellation_reason: action.payload.reason,
          feedback: action.payload.feedback || '',
        },
      };

    case 'CONFIRM_CANCELLATION':
      return {
        ...state,
        cancellationModal: {
          ...state.cancellationModal,
          step: 'confirmation',
        },
      };

    case 'CANCEL_SUBSCRIPTION_START':
      return {
        ...state,
        cancellationModal: {
          ...state.cancellationModal,
          step: 'processing',
          isSubmitting: true,
        },
        loading: { ...state.loading, cancellingSubscription: true },
      };

    case 'CANCEL_SUBSCRIPTION_SUCCESS':
      return {
        ...state,
        subscription: action.payload,
        cancellationModal: {
          ...state.cancellationModal,
          step: 'completed',
          isSubmitting: false,
          isOpen: false,
        },
        loading: { ...state.loading, cancellingSubscription: false },
      };

    case 'CANCEL_SUBSCRIPTION_FAILURE':
      return {
        ...state,
        cancellationModal: {
          ...state.cancellationModal,
          step: 'reason_selection',
          isSubmitting: false,
          error: action.payload.error,
        },
        loading: { ...state.loading, cancellingSubscription: false },
        errors: { ...state.errors, cancellationError: action.payload.error },
      };

    // 구독 재활성화
    case 'OPEN_REACTIVATION_MODAL':
      return {
        ...state,
        reactivationModal: {
          ...initialState.reactivationModal,
          isOpen: true,
        },
      };

    case 'CLOSE_REACTIVATION_MODAL':
      return {
        ...state,
        reactivationModal: initialState.reactivationModal,
      };

    case 'SELECT_REACTIVATION_OPTION':
      return {
        ...state,
        reactivationModal: {
          ...state.reactivationModal,
          selectedOption: action.payload.option,
        },
      };

    case 'REACTIVATE_SUBSCRIPTION_START':
      return {
        ...state,
        reactivationModal: {
          ...state.reactivationModal,
          isProcessing: true,
          error: null,
        },
        loading: { ...state.loading, reactivatingSubscription: true },
      };

    case 'REACTIVATE_SUBSCRIPTION_SUCCESS':
      return {
        ...state,
        subscription: action.payload,
        reactivationModal: initialState.reactivationModal,
        loading: { ...state.loading, reactivatingSubscription: false },
      };

    case 'REACTIVATE_SUBSCRIPTION_FAILURE':
      return {
        ...state,
        reactivationModal: {
          ...state.reactivationModal,
          isProcessing: false,
          error: action.payload.error,
        },
        loading: { ...state.loading, reactivatingSubscription: false },
        errors: { ...state.errors, reactivationError: action.payload.error },
      };

    // 결제 정보 변경
    case 'CHANGE_CARD_START':
      return {
        ...state,
        loading: { ...state.loading, changingCard: true },
      };

    case 'CHANGE_CARD_SUCCESS':
      return {
        ...state,
        subscription: {
          ...state.subscription,
          card_last_4digits: action.payload.card_last_4digits,
          card_type: action.payload.card_type,
        },
        loading: { ...state.loading, changingCard: false },
      };

    case 'CHANGE_CARD_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, changingCard: false },
        errors: {
          ...state.errors,
          paymentError: { code: 'CHANGE_CARD_FAILED', message: action.payload.error },
        },
      };

    default:
      return state;
  }
}
