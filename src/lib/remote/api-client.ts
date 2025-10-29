import axios, { isAxiosError } from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  headers: {
    "Content-Type": "application/json",
  },
});

// 글로벌 토큰 getter 함수를 저장하는 변수
let getTokenFn: (() => Promise<string | null>) | null = null;

/**
 * Clerk의 getToken 함수를 등록합니다.
 * 클라이언트 컴포넌트에서 useAuth()의 getToken을 등록해야 합니다.
 */
export const setAuthTokenGetter = (getter: () => Promise<string | null>) => {
  getTokenFn = getter;
};

/**
 * 등록된 토큰 getter를 제거합니다.
 */
export const clearAuthTokenGetter = () => {
  getTokenFn = null;
};

// Request interceptor: Authorization 헤더에 Clerk 토큰 자동 추가
apiClient.interceptors.request.use(
  async (config) => {
    try {
      if (getTokenFn) {
        const token = await getTokenFn();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      // 토큰 가져오기 실패 시 그냥 진행 (인증 없이)
      console.warn("Failed to get auth token:", error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

type ErrorPayload = {
  error?: {
    message?: string;
  };
  message?: string;
};

export const extractApiErrorMessage = (
  error: unknown,
  fallbackMessage = "API request failed."
) => {
  if (isAxiosError(error)) {
    const payload = error.response?.data as ErrorPayload | undefined;

    if (typeof payload?.error?.message === "string") {
      return payload.error.message;
    }

    if (typeof payload?.message === "string") {
      return payload.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

export { apiClient, isAxiosError };
