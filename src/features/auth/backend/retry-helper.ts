/**
 * 재시도 설정
 */
export interface RetryConfig {
  maxAttempts: number;
  delay: number;
  backoffMultiplier?: number;
  maxDelay?: number;
}

/**
 * 기본 재시도 설정
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delay: 1000, // 1초
  backoffMultiplier: 2,
  maxDelay: 10000, // 10초
};

/**
 * 재시도 가능한 에러인지 확인
 */
export function isRetryableError(error: any): boolean {
  // 네트워크 에러
  if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
    return true;
  }

  // HTTP 5xx 에러 (서버 에러)
  if (error?.status >= 500 && error?.status < 600) {
    return true;
  }

  // 일시적인 DB 에러
  if (error?.code === 'PGRST301' || // 연결 풀 고갈
      error?.code === 'PGRST503' || // 서비스 일시 중단
      error?.code === '57P03') {     // 서버 종료 중
    return true;
  }

  return false;
}

/**
 * 지수 백오프로 재시도 실행
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: any;
  let delay = config.delay;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 재시도 불가능한 에러면 즉시 실패
      if (!isRetryableError(error)) {
        throw error;
      }

      // 마지막 시도였으면 실패
      if (attempt === config.maxAttempts) {
        break;
      }

      // 대기
      console.log(`재시도 ${attempt}/${config.maxAttempts}, ${delay}ms 대기...`);
      await new Promise(resolve => setTimeout(resolve, delay));

      // 다음 대기 시간 계산 (지수 백오프)
      if (config.backoffMultiplier) {
        delay = Math.min(
          delay * config.backoffMultiplier,
          config.maxDelay || Infinity
        );
      }
    }
  }

  throw lastError;
}