/**
 * 토스페이먼츠 API 클라이언트
 * 빌링키 발급, 자동결제, 결제 취소 등의 기능을 제공
 */

interface TossPaymentsConfig {
  secretKey: string;
  clientKey?: string;
  baseUrl?: string;
  maxRetries?: number;
  timeout?: number;
}

interface BillingKeyIssueRequest {
  authKey: string;
  customerKey: string;
  customerEmail?: string;
  customerName?: string;
  customerMobilePhone?: string;
}

interface BillingKeyIssueResponse {
  mId: string;
  customerKey: string;
  authenticatedAt: string;
  method: string;
  billingKey: string;
  cardCompany: string;
  cardNumber: string;
  card?: {
    company: string;
    number: string;
    cardType: string;
    ownerType: string;
  };
}

interface PaymentExecuteRequest {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
  taxFreeAmount?: number;
}

interface PaymentExecuteResponse {
  mId: string;
  lastTransactionKey: string;
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string;
  requestedAt: string;
  approvedAt: string;
  useEscrow: boolean;
  cultureExpense: boolean;
  card: {
    company: string;
    number: string;
    installmentPlanMonths: number;
    isInterestFree: boolean;
    approveNo: string;
    useCardPoint: boolean;
    cardType: string;
    ownerType: string;
    acquireStatus: string;
    receiptUrl: string;
    amount: number;
  };
  virtualAccount: null;
  transfer: null;
  mobilePhone: null;
  giftCertificate: null;
  cashReceipt: null;
  cashReceipts: null;
  discount: null;
  cancels: null;
  secret: string;
  type: string;
  easyPay: null;
  country: string;
  failure: null;
  isPartialCancelable: boolean;
  receipt: {
    url: string;
  };
  checkout: {
    url: string;
  };
  currency: string;
  totalAmount: number;
  balanceAmount: number;
  suppliedAmount: number;
  vat: number;
  taxFreeAmount: number;
  method: string;
  version: string;
}

interface PaymentCancelRequest {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number;
  taxFreeAmount?: number;
  refundReceiveAccount?: {
    bank: string;
    accountNumber: string;
    holderName: string;
  };
}

interface PaymentCancelResponse {
  mId: string;
  lastTransactionKey: string;
  paymentKey: string;
  orderId: string;
  orderName: string;
  status: string;
  requestedAt: string;
  approvedAt: string;
  useEscrow: boolean;
  cultureExpense: boolean;
  cancels: Array<{
    cancelAmount: number;
    cancelReason: string;
    taxFreeAmount: number;
    taxExemptionAmount: number;
    refundableAmount: number;
    easyPayDiscountAmount: number;
    canceledAt: string;
    transactionKey: string;
    receiptKey: string | null;
    cancelStatus: string;
    cancelRequestId: string | null;
  }>;
  totalAmount: number;
  balanceAmount: number;
  suppliedAmount: number;
  vat: number;
  taxFreeAmount: number;
  method: string;
  version: string;
}

export class TossPaymentsError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public responseBody?: any,
  ) {
    super(message);
    this.name = 'TossPaymentsError';
  }
}

/**
 * 토스페이먼츠 API 클라이언트 클래스
 */
export class TossPaymentsClient {
  private secretKey: string;
  private clientKey?: string;
  private baseUrl: string;
  private maxRetries: number;
  private timeout: number;
  private authHeader: string;

  constructor(config: TossPaymentsConfig) {
    this.secretKey = config.secretKey;
    this.clientKey = config.clientKey;
    this.baseUrl = config.baseUrl || 'https://api.tosspayments.com/v1';
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 10000; // 10초

    // Base64 인코딩된 인증 헤더 생성
    this.authHeader = `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`;
  }

  /**
   * HTTP 요청에 타임아웃 적용
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Exponential backoff를 적용한 재시도 로직
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // 재시도 불가능한 에러는 즉시 throw
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }

        if (i < retries - 1) {
          const waitTime = Math.min(1000 * Math.pow(2, i), 10000);
          console.warn(`Retry ${i + 1}/${retries} after ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * API 요청 헬퍼 메서드
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await this.fetchWithTimeout(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const responseText = await response.text();
    let responseData: any;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (!response.ok) {
      const errorMessage = responseData?.message || `Request failed with status ${response.status}`;
      const errorCode = responseData?.code || 'UNKNOWN_ERROR';

      throw new TossPaymentsError(
        errorMessage,
        errorCode,
        response.status,
        responseData,
      );
    }

    return responseData;
  }

  /**
   * 빌링키 발급
   * authKey는 프론트엔드에서 토스페이먼츠 SDK를 통해 받은 값
   */
  async issueBillingKey(params: BillingKeyIssueRequest): Promise<BillingKeyIssueResponse> {
    return this.retryWithBackoff(() =>
      this.request<BillingKeyIssueResponse>('/billing/authorizations/issue', {
        method: 'POST',
        body: JSON.stringify(params),
      })
    );
  }

  /**
   * 빌링키로 자동 결제 실행
   */
  async executePayment(params: PaymentExecuteRequest): Promise<PaymentExecuteResponse> {
    const { billingKey, ...requestBody } = params;

    return this.retryWithBackoff(() =>
      this.request<PaymentExecuteResponse>(`/billing/${billingKey}`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })
    );
  }

  /**
   * 빌링키 삭제
   */
  async deleteBillingKey(billingKey: string): Promise<void> {
    return this.retryWithBackoff(() =>
      this.request<void>(`/billing/authorizations/${billingKey}`, {
        method: 'DELETE',
      })
    );
  }

  /**
   * 결제 취소
   */
  async cancelPayment(params: PaymentCancelRequest): Promise<PaymentCancelResponse> {
    const { paymentKey, ...requestBody } = params;

    return this.retryWithBackoff(() =>
      this.request<PaymentCancelResponse>(`/payments/${paymentKey}/cancel`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })
    );
  }

  /**
   * 결제 조회
   */
  async getPayment(paymentKey: string): Promise<PaymentExecuteResponse> {
    return this.retryWithBackoff(() =>
      this.request<PaymentExecuteResponse>(`/payments/${paymentKey}`, {
        method: 'GET',
      })
    );
  }

  /**
   * 빌링키 정보 조회
   */
  async getBillingKey(billingKey: string): Promise<BillingKeyIssueResponse> {
    return this.retryWithBackoff(() =>
      this.request<BillingKeyIssueResponse>(`/billing/authorizations/${billingKey}`, {
        method: 'GET',
      })
    );
  }
}

/**
 * 싱글톤 인스턴스 생성 함수 (서버 전용)
 */
let tossPaymentsClient: TossPaymentsClient | null = null;

export function getTossPaymentsClient(secretKey?: string): TossPaymentsClient {
  if (!tossPaymentsClient) {
    const key = secretKey || process.env.TOSS_SECRET_KEY;
    if (!key) {
      throw new TossPaymentsError('TOSS_SECRET_KEY is not configured');
    }

    tossPaymentsClient = new TossPaymentsClient({
      secretKey: key,
      clientKey: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY,
      maxRetries: 3,
      timeout: 10000,
    });
  }
  return tossPaymentsClient;
}

/**
 * 결제 금액 유틸리티 함수
 */
export const PaymentUtils = {
  /**
   * 부가세 계산 (VAT)
   */
  calculateVAT(amount: number): number {
    return Math.floor(amount / 11); // 부가세 10%
  },

  /**
   * 공급가액 계산
   */
  calculateSupplyAmount(amount: number): number {
    return amount - PaymentUtils.calculateVAT(amount);
  },

  /**
   * 주문 ID 생성 (UUID v4 기반)
   */
  generateOrderId(prefix: string = 'ORDER'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}_${timestamp}_${random}`.toUpperCase();
  },

  /**
   * 카드 번호 마스킹
   */
  maskCardNumber(cardNumber: string): string {
    if (cardNumber.length < 8) return cardNumber;
    const first4 = cardNumber.slice(0, 4);
    const last4 = cardNumber.slice(-4);
    return `${first4}****${last4}`;
  },

  /**
   * 결제 상태 한글 변환
   */
  getPaymentStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      READY: '준비',
      IN_PROGRESS: '진행중',
      WAITING_FOR_DEPOSIT: '입금대기',
      DONE: '완료',
      CANCELED: '취소',
      PARTIAL_CANCELED: '부분취소',
      ABORTED: '중단',
      EXPIRED: '만료',
    };
    return statusMap[status] || status;
  },
};

/**
 * 토스페이먼츠 에러 코드 매핑
 */
export const TossPaymentsErrorCodes = {
  // 공통 에러
  ALREADY_PROCESSED_PAYMENT: '이미 처리된 결제입니다',
  PROVIDER_ERROR: 'PG사에서 에러가 발생했습니다',
  EXCEED_MAX_AUTH_COUNT: '최대 인증 횟수를 초과했습니다',
  EXCEED_MAX_ONE_DAY_AMOUNT: '일일 한도를 초과했습니다',
  EXCEED_MAX_ONE_DAY_COUNT: '일일 횟수를 초과했습니다',
  EXCEED_MAX_CARD_INSTALLMENT_PLAN: '카드 할부 개월 수가 올바르지 않습니다',
  INVALID_REQUEST: '잘못된 요청입니다',
  INVALID_API_KEY: 'API 키가 올바르지 않습니다',
  INVALID_AUTHORIZE_AUTH: '인증 정보가 올바르지 않습니다',
  INVALID_CARD_EXPIRATION: '카드 유효기간이 올바르지 않습니다',
  INVALID_STOPPED_CARD: '정지된 카드입니다',
  INVALID_CARD_INSTALLMENT_PLAN: '할부가 지원되지 않는 카드입니다',
  NOT_FOUND_PAYMENT: '존재하지 않는 결제입니다',
  NOT_FOUND_PAYMENT_SESSION: '결제 시간이 만료되었습니다',

  // 빌링 관련 에러
  INVALID_BILLING_KEY: '빌링키가 올바르지 않습니다',
  NOT_FOUND_BILLING_KEY: '존재하지 않는 빌링키입니다',
  ALREADY_DELETED_BILLING_KEY: '이미 삭제된 빌링키입니다',
  EXCEED_MAX_BILLING_PAYMENT_AMOUNT: '빌링 결제 최대 금액을 초과했습니다',

  // 취소 관련 에러
  ALREADY_CANCELED_PAYMENT: '이미 취소된 결제입니다',
  CANNOT_CANCEL_PAYMENT: '취소할 수 없는 결제입니다',
  EXCEED_CANCEL_AMOUNT_DISCOUNT: '할인 금액을 초과하여 취소할 수 없습니다',
  INVALID_REFUND_ACCOUNT: '환불 계좌 정보가 올바르지 않습니다',
} as const;