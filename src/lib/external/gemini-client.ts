/**
 * Gemini API 클라이언트
 * Google AI Studio의 Gemini API와 통신하는 클라이언트 모듈
 */

import { generateSajuPrompt, parseGeminiResponse } from '@/lib/prompts/saju-prompt';

interface GeminiConfig {
  apiKey: string;
  model?: string;
  maxRetries?: number;
  timeout?: number;
}

interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

class GeminiAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: any,
  ) {
    super(message);
    this.name = 'GeminiAPIError';
  }
}

/**
 * Gemini API 클라이언트 클래스
 */
export class GeminiClient {
  private apiKey: string;
  private model: string;
  private maxRetries: number;
  private timeout: number;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-2.0-flash';
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 30000; // 30초
  }

  /**
   * API 키 유효성 검증
   */
  private validateApiKey(): void {
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new GeminiAPIError('Gemini API key is not configured');
    }
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

        // Rate limit 에러인 경우 더 긴 대기 시간 적용
        if (error.statusCode === 429) {
          const waitTime = Math.min(1000 * Math.pow(2, i + 2), 60000); // 최대 60초
          console.warn(`Rate limited. Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else if (i < retries - 1) {
          // 일반 재시도 대기 시간
          const waitTime = Math.min(1000 * Math.pow(2, i), 10000); // 최대 10초
          console.warn(`Retry ${i + 1}/${retries} after ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Gemini API 호출
   */
  private async callAPI(prompt: string): Promise<GeminiResponse> {
    this.validateApiKey();

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody: GeminiRequest = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE',
        },
      ],
    };

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `Gemini API error: ${response.status}`;

      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        errorMessage = errorBody || errorMessage;
      }

      throw new GeminiAPIError(errorMessage, response.status, errorBody);
    }

    const data: GeminiResponse = await response.json();

    // 응답 검증
    if (!data.candidates || data.candidates.length === 0) {
      throw new GeminiAPIError('No response generated from Gemini');
    }

    // 안전성 검사로 차단된 경우
    const candidate = data.candidates[0];
    if (candidate.finishReason === 'SAFETY') {
      throw new GeminiAPIError('Response blocked due to safety filters');
    }

    return data;
  }

  /**
   * 사주 분석 수행
   */
  async generateSajuAnalysis(input: {
    subjectName: string;
    birthDate: string;
    birthTime?: string;
    gender: 'male' | 'female';
  }): Promise<any> {
    try {
      // 프롬프트 생성
      const prompt = generateSajuPrompt(input);

      // API 호출 (재시도 로직 포함)
      const response = await this.retryWithBackoff(() => this.callAPI(prompt));

      // 응답 텍스트 추출
      const responseText = response.candidates[0]?.content?.parts[0]?.text;
      if (!responseText) {
        throw new GeminiAPIError('Empty response from Gemini');
      }

      // JSON 파싱
      const analysisResult = parseGeminiResponse(responseText);
      if (!analysisResult) {
        throw new GeminiAPIError('Failed to parse Gemini response as JSON');
      }

      // 토큰 사용량 로깅 (옵션)
      if (response.usageMetadata) {
        console.log('Token usage:', {
          prompt: response.usageMetadata.promptTokenCount,
          response: response.usageMetadata.candidatesTokenCount,
          total: response.usageMetadata.totalTokenCount,
        });
      }

      return analysisResult;
    } catch (error: any) {
      console.error('Gemini API error:', error);

      // 에러 타입에 따른 처리
      if (error instanceof GeminiAPIError) {
        throw error;
      }

      // AbortError는 타임아웃
      if (error.name === 'AbortError') {
        throw new GeminiAPIError('Request timeout', 408);
      }

      // 기타 에러
      throw new GeminiAPIError(
        error.message || 'Unknown error occurred',
        500,
      );
    }
  }

  /**
   * 일반 텍스트 생성 (확장성을 위해)
   */
  async generateText(prompt: string): Promise<string> {
    try {
      const response = await this.retryWithBackoff(() => this.callAPI(prompt));
      return response.candidates[0]?.content?.parts[0]?.text || '';
    } catch (error: any) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  /**
   * 모델 변경
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * API 상태 확인
   */
  async checkAPIStatus(): Promise<boolean> {
    try {
      const testPrompt = 'Hello, please respond with "OK"';
      const response = await this.generateText(testPrompt);
      return response.toLowerCase().includes('ok');
    } catch (error) {
      console.error('API status check failed:', error);
      return false;
    }
  }
}

/**
 * 싱글톤 인스턴스 생성 함수 (서버 전용)
 */
let geminiClient: GeminiClient | null = null;

export function getGeminiClient(apiKey?: string): GeminiClient {
  if (!geminiClient) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new GeminiAPIError('GEMINI_API_KEY is not configured');
    }

    geminiClient = new GeminiClient({
      apiKey: key,
      model: 'gemini-2.0-flash', // 기본 모델
      maxRetries: 3,
      timeout: 30000,
    });
  }
  return geminiClient;
}

/**
 * Pro 모델용 클라이언트 생성 (필요시)
 */
export function getGeminiProClient(apiKey?: string): GeminiClient {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new GeminiAPIError('GEMINI_API_KEY is not configured');
  }

  return new GeminiClient({
    apiKey: key,
    model: 'gemini-2.0-pro', // Pro 모델
    maxRetries: 3,
    timeout: 45000, // Pro 모델은 더 긴 타임아웃
  });
}