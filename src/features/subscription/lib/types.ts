/**
 * Frontend 전용 타입 정의
 */

import type { SubscriptionResponse } from './dto';

/**
 * 결제 에러 타입
 */
export interface PaymentError {
  code: string;
  message: string;
}

/**
 * 구독 정보 상태
 */
export type SubscriptionState = SubscriptionResponse;

/**
 * 결제 프로세스 상태
 */
export interface PaymentProcessState {
  step:
    | 'idle'
    | 'terms_agreement'
    | 'loading_sdk'
    | 'requesting_billing'
    | 'processing_payment'
    | 'completed'
    | 'failed';
  authKey: string | null;
  customerKey: string | null;
  isProcessing: boolean;
  error: PaymentError | null;
}

/**
 * 약관 동의 상태
 */
export interface TermsAgreementState {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  autoPaymentAccepted: boolean;
  allAccepted: boolean;
}

/**
 * 해지 모달 상태
 */
export interface CancellationModalState {
  isOpen: boolean;
  step: 'reason_selection' | 'confirmation' | 'processing' | 'completed';
  cancellation_reason: string | null;
  feedback: string;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * 재활성화 모달 상태
 */
export interface ReactivationModalState {
  isOpen: boolean;
  selectedOption: 'existing_card' | 'new_card' | null;
  isProcessing: boolean;
  error: string | null;
}

/**
 * 토스페이먼츠 SDK 상태
 */
export interface TossPaymentsSDKState {
  isLoaded: boolean;
  isReady: boolean;
  instance: any | null; // TossPayments 타입
  payment: any | null; // Payment 타입
  loadError: string | null;
}

/**
 * 로딩 상태
 */
export interface LoadingState {
  fetchingSubscription: boolean;
  processingPayment: boolean;
  cancellingSubscription: boolean;
  reactivatingSubscription: boolean;
  changingCard: boolean;
}

/**
 * 에러 상태
 */
export interface ErrorState {
  fetchError: string | null;
  paymentError: PaymentError | null;
  cancellationError: string | null;
  reactivationError: string | null;
  sdkError: string | null;
}

/**
 * 해지 사유 옵션
 */
export const CANCELLATION_REASON_OPTIONS = [
  { value: '가격이 비싸요', label: '가격이 비싸요' },
  { value: '사용 빈도가 낮아요', label: '사용 빈도가 낮아요' },
  { value: '서비스가 만족스럽지 않아요', label: '서비스가 만족스럽지 않아요' },
  { value: '다른 서비스를 이용해요', label: '다른 서비스를 이용해요' },
  { value: '기타', label: '기타' },
] as const;
