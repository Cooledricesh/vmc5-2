import axios, { isAxiosError, type InternalAxiosRequestConfig } from "axios";

/**
 * API 클라이언트 인스턴스
 * 모든 HTTP 요청은 이 클라이언트를 통해 이루어집니다.
 */
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 인증 토큰을 가져오는 함수의 타입
 * @returns Promise<string | null> - 토큰이 있으면 문자열, 없으면 null
 */
type AuthTokenGetter = () => Promise<string | null>;

/**
 * 글로벌 토큰 getter 함수를 저장하는 변수
 * 클라이언트 컴포넌트에서 Clerk의 useAuth().getToken을 등록합니다.
 */
let getTokenFn: AuthTokenGetter | null = null;

/**
 * Clerk의 getToken 함수를 등록합니다.
 *
 * @example
 * ```tsx
 * // AuthTokenSetter.tsx 컴포넌트에서 사용
 * const { getToken } = useAuth();
 * useEffect(() => {
 *   setAuthTokenGetter(() => getToken());
 * }, [getToken]);
 * ```
 *
 * @param getter - Clerk의 getToken 함수
 */
export const setAuthTokenGetter = (getter: AuthTokenGetter): void => {
  getTokenFn = getter;
};

/**
 * 등록된 토큰 getter를 제거합니다.
 * 주로 테스트 환경에서 cleanup 용도로 사용됩니다.
 */
export const clearAuthTokenGetter = (): void => {
  getTokenFn = null;
};

/**
 * Request interceptor: Authorization 헤더에 Clerk 토큰을 자동으로 추가합니다.
 *
 * 동작 순서:
 * 1. 등록된 getTokenFn이 있으면 호출하여 토큰을 가져옵니다.
 * 2. 토큰이 있으면 Authorization 헤더에 Bearer 토큰으로 추가합니다.
 * 3. 토큰 가져오기 실패 시에도 요청은 계속 진행됩니다 (인증 없이).
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    console.log('[apiClient] Interceptor executing for:', config.url);
    console.log('[apiClient] getTokenFn exists:', !!getTokenFn);

    try {
      if (getTokenFn) {
        console.log('[apiClient] Calling getTokenFn...');
        const token = await getTokenFn();
        console.log('[apiClient] Token received:', token ? `${token.substring(0, 20)}...` : 'null');

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('[apiClient] Authorization header added');
        } else {
          console.warn('[apiClient] Token is null - no Authorization header added');
        }
      } else {
        console.warn('[apiClient] getTokenFn not registered - no Authorization header added');
      }
    } catch (error) {
      // 토큰 가져오기 실패 시 경고만 출력하고 요청은 계속 진행
      // 서버에서 401 에러를 반환하면 클라이언트가 처리합니다
      console.warn("[apiClient] Failed to get auth token:", error);
    }

    console.log('[apiClient] Final headers:', config.headers);
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

/**
 * API 에러 응답의 페이로드 타입
 * 서버에서 반환하는 에러 구조를 정의합니다.
 */
type ErrorPayload = {
  error?: {
    message?: string;
  };
  message?: string;
};

/**
 * API 에러에서 사용자에게 표시할 에러 메시지를 추출합니다.
 *
 * 우선순위:
 * 1. error.response.data.error.message (표준 에러 응답)
 * 2. error.response.data.message (단순 에러 응답)
 * 3. error.message (JavaScript Error 객체)
 * 4. fallbackMessage (기본 메시지)
 *
 * @param error - 발생한 에러 객체
 * @param fallbackMessage - 에러 메시지를 추출할 수 없을 때 사용할 기본 메시지
 * @returns 사용자에게 표시할 에러 메시지
 *
 * @example
 * ```ts
 * try {
 *   await apiClient.get('/api/data');
 * } catch (error) {
 *   const message = extractApiErrorMessage(error, '데이터를 불러오는데 실패했습니다');
 *   console.error(message);
 * }
 * ```
 */
export const extractApiErrorMessage = (
  error: unknown,
  fallbackMessage = "API request failed."
): string => {
  // Axios 에러인 경우 응답 데이터에서 메시지 추출
  if (isAxiosError(error)) {
    const payload = error.response?.data as ErrorPayload | undefined;

    if (typeof payload?.error?.message === "string") {
      return payload.error.message;
    }

    if (typeof payload?.message === "string") {
      return payload.message;
    }
  }

  // 일반 Error 객체인 경우 message 속성 사용
  if (error instanceof Error && error.message) {
    return error.message;
  }

  // 메시지를 추출할 수 없는 경우 기본 메시지 반환
  return fallbackMessage;
};

export { apiClient, isAxiosError };
