/**
 * 구독 Context Actions 정의
 */

import type { SubscriptionState, PaymentError } from '../lib/types';

// 구독 정보 조회 Actions
export type FetchSubscriptionStartAction = {
  type: 'FETCH_SUBSCRIPTION_START';
};

export type FetchSubscriptionSuccessAction = {
  type: 'FETCH_SUBSCRIPTION_SUCCESS';
  payload: SubscriptionState;
};

export type FetchSubscriptionFailureAction = {
  type: 'FETCH_SUBSCRIPTION_FAILURE';
  payload: { error: string };
};

// 결제 프로세스 Actions
export type InitiateSubscriptionAction = {
  type: 'INITIATE_SUBSCRIPTION';
};

export type UpdateTermsAction = {
  type: 'UPDATE_TERMS';
  payload: {
    termsAccepted?: boolean;
    privacyAccepted?: boolean;
    autoPaymentAccepted?: boolean;
  };
};

export type LoadSDKStartAction = {
  type: 'LOAD_SDK_START';
};

export type LoadSDKSuccessAction = {
  type: 'LOAD_SDK_SUCCESS';
  payload: {
    instance: any;
    payment: any;
  };
};

export type LoadSDKFailureAction = {
  type: 'LOAD_SDK_FAILURE';
  payload: { error: string };
};

export type RequestBillingAuthStartAction = {
  type: 'REQUEST_BILLING_AUTH_START';
};

export type ProcessPaymentStartAction = {
  type: 'PROCESS_PAYMENT_START';
  payload: {
    authKey: string;
    customerKey: string;
  };
};

export type ProcessPaymentSuccessAction = {
  type: 'PROCESS_PAYMENT_SUCCESS';
  payload: SubscriptionState;
};

export type ProcessPaymentFailureAction = {
  type: 'PROCESS_PAYMENT_FAILURE';
  payload: PaymentError;
};

export type ResetPaymentProcessAction = {
  type: 'RESET_PAYMENT_PROCESS';
};

// 구독 해지 Actions
export type OpenCancellationModalAction = {
  type: 'OPEN_CANCELLATION_MODAL';
};

export type CloseCancellationModalAction = {
  type: 'CLOSE_CANCELLATION_MODAL';
};

export type SelectCancellationReasonAction = {
  type: 'SELECT_CANCELLATION_REASON';
  payload: {
    reason: string;
    feedback?: string;
  };
};

export type ConfirmCancellationAction = {
  type: 'CONFIRM_CANCELLATION';
};

export type CancelSubscriptionStartAction = {
  type: 'CANCEL_SUBSCRIPTION_START';
};

export type CancelSubscriptionSuccessAction = {
  type: 'CANCEL_SUBSCRIPTION_SUCCESS';
  payload: SubscriptionState;
};

export type CancelSubscriptionFailureAction = {
  type: 'CANCEL_SUBSCRIPTION_FAILURE';
  payload: { error: string };
};

// 구독 재활성화 Actions
export type OpenReactivationModalAction = {
  type: 'OPEN_REACTIVATION_MODAL';
};

export type CloseReactivationModalAction = {
  type: 'CLOSE_REACTIVATION_MODAL';
};

export type SelectReactivationOptionAction = {
  type: 'SELECT_REACTIVATION_OPTION';
  payload: { option: 'existing_card' | 'new_card' };
};

export type ReactivateSubscriptionStartAction = {
  type: 'REACTIVATE_SUBSCRIPTION_START';
};

export type ReactivateSubscriptionSuccessAction = {
  type: 'REACTIVATE_SUBSCRIPTION_SUCCESS';
  payload: SubscriptionState;
};

export type ReactivateSubscriptionFailureAction = {
  type: 'REACTIVATE_SUBSCRIPTION_FAILURE';
  payload: { error: string };
};

// 결제 정보 변경 Actions
export type ChangeCardStartAction = {
  type: 'CHANGE_CARD_START';
};

export type ChangeCardSuccessAction = {
  type: 'CHANGE_CARD_SUCCESS';
  payload: {
    card_last_4digits: string;
    card_type: string;
  };
};

export type ChangeCardFailureAction = {
  type: 'CHANGE_CARD_FAILURE';
  payload: { error: string };
};

// 전체 Action Union Type
export type SubscriptionAction =
  | FetchSubscriptionStartAction
  | FetchSubscriptionSuccessAction
  | FetchSubscriptionFailureAction
  | InitiateSubscriptionAction
  | UpdateTermsAction
  | LoadSDKStartAction
  | LoadSDKSuccessAction
  | LoadSDKFailureAction
  | RequestBillingAuthStartAction
  | ProcessPaymentStartAction
  | ProcessPaymentSuccessAction
  | ProcessPaymentFailureAction
  | ResetPaymentProcessAction
  | OpenCancellationModalAction
  | CloseCancellationModalAction
  | SelectCancellationReasonAction
  | ConfirmCancellationAction
  | CancelSubscriptionStartAction
  | CancelSubscriptionSuccessAction
  | CancelSubscriptionFailureAction
  | OpenReactivationModalAction
  | CloseReactivationModalAction
  | SelectReactivationOptionAction
  | ReactivateSubscriptionStartAction
  | ReactivateSubscriptionSuccessAction
  | ReactivateSubscriptionFailureAction
  | ChangeCardStartAction
  | ChangeCardSuccessAction
  | ChangeCardFailureAction;
