/**
 * 구독 관련 에러 코드
 */
export const subscriptionErrorCodes = {
  // 구독 상태 관련
  alreadySubscribed: 'ALREADY_SUBSCRIBED',
  subscriptionNotFound: 'SUBSCRIPTION_NOT_FOUND',
  alreadyCancelled: 'ALREADY_CANCELLED',
  cannotReactivate: 'CANNOT_REACTIVATE',

  // 빌링키 및 결제 관련
  billingKeyIssueFailed: 'BILLING_KEY_ISSUE_FAILED',
  initialPaymentFailed: 'INITIAL_PAYMENT_FAILED',
  paymentServiceError: 'PAYMENT_SERVICE_ERROR',
  billingKeyNotFound: 'BILLING_KEY_NOT_FOUND',
  billingKeyDeleteFailed: 'BILLING_KEY_DELETE_FAILED',

  // 인증 관련
  unauthorized: 'UNAUTHORIZED',
  invalidCustomerKey: 'INVALID_CUSTOMER_KEY',

  // 검증 관련
  validationError: 'VALIDATION_ERROR',
  invalidAuthKey: 'INVALID_AUTH_KEY',

  // 데이터베이스 관련
  databaseError: 'DATABASE_ERROR',
  transactionFailed: 'TRANSACTION_FAILED',

  // 기타
  internalError: 'INTERNAL_ERROR',
  tossPaymentsError: 'TOSS_PAYMENTS_ERROR',
} as const;

export type SubscriptionErrorCode = typeof subscriptionErrorCodes[keyof typeof subscriptionErrorCodes];

/**
 * 에러 코드에 대한 사용자 친화적 메시지 매핑
 */
export const errorMessages: Record<SubscriptionErrorCode, string> = {
  ALREADY_SUBSCRIBED: '이미 Pro 구독 중입니다',
  SUBSCRIPTION_NOT_FOUND: '구독 정보를 찾을 수 없습니다',
  ALREADY_CANCELLED: '이미 해지된 구독입니다',
  CANNOT_REACTIVATE: '재활성화할 수 없는 구독입니다',

  BILLING_KEY_ISSUE_FAILED: '빌링키 발급에 실패했습니다',
  INITIAL_PAYMENT_FAILED: '초회 결제에 실패했습니다',
  PAYMENT_SERVICE_ERROR: '결제 서비스 오류가 발생했습니다',
  BILLING_KEY_NOT_FOUND: '빌링키를 찾을 수 없습니다',
  BILLING_KEY_DELETE_FAILED: '빌링키 삭제에 실패했습니다',

  UNAUTHORIZED: '인증이 필요합니다',
  INVALID_CUSTOMER_KEY: '유효하지 않은 고객 정보입니다',

  VALIDATION_ERROR: '입력 정보가 올바르지 않습니다',
  INVALID_AUTH_KEY: '유효하지 않은 인증키입니다',

  DATABASE_ERROR: '데이터베이스 오류가 발생했습니다',
  TRANSACTION_FAILED: '트랜잭션 처리 중 오류가 발생했습니다',

  INTERNAL_ERROR: '내부 서버 오류가 발생했습니다',
  TOSS_PAYMENTS_ERROR: '토스페이먼츠 오류가 발생했습니다',
};

/**
 * 에러 코드로 사용자 친화적 메시지 가져오기
 */
export function getErrorMessage(code: SubscriptionErrorCode): string {
  return errorMessages[code] || '알 수 없는 오류가 발생했습니다';
}
