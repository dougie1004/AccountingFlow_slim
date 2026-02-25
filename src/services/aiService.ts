import { safeInvoke } from "../lib/tauri-bridge";

export interface AiResponse {
  response: string;
  meta?: {
    model_version: string;
    provider: string;
  };
  error?: string;
}

export const callAiService = async (
  action: string,
  payload: any,
  options: { speed?: 'fast' | 'pro' } = {}
): Promise<AiResponse> => {
  // EMERGENCY KILL SWITCH: Do not burn API credits during E2E tests
  if ((window as any).__TEST_MODE__ || (window as any).isTestMode) {
    console.warn('[AI_SERVICE_MOCK] Test mode detected. Returning deterministic mock response.');
    return {
      response: "AI 분석 결과: 모든 지표가 시나리오 범위 내에 있습니다. (MOCK_RESPONSE)",
      meta: { model_version: 'mock-engine', provider: 'internal' }
    };
  }

  try {
    // 1. Prepare global prompt based on action type
    let prompt = '';
    let systemContext = payload.systemContext || '';

    if (action === 'chat') {
      prompt = payload.messages.map((m: any) => `${m.role === 'assistant' ? 'AI' : 'User'}: ${m.content}`).join('\n');
    } else {
      // For classification, analysis, policy checks etc in Intelligence Center
      prompt = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
    }

    // 2. Call the Secure Rust Backend with optional User API Key
    const customApiKey = localStorage.getItem('user_gemini_api_key');
    const response = await safeInvoke<string>('generic_ai_chat', {
      prompt,
      systemContext: (systemContext && systemContext.trim().length > 0) ? systemContext : '당신은 최고의 회계 비서 AI입니다. 모든 답변은 한국어로 핵심만 답하세요.',
      customApiKey: customApiKey || import.meta.env.VITE_GEMINI_API_KEY || null
    });

    return {
      response,
      meta: { model_version: 'rust-backend-v2-robust', provider: 'google' }
    };
  } catch (error: any) {
    console.error('AI_SERVICE_CALL_FAILED:', error);
    const rawError = typeof error === 'string' ? error : (error.message || 'Back-end communication failure');

    // Human-friendly translation for common AI errors
    let userFriendlyMsg = rawError;

    if (rawError.includes('429') || rawError.includes('RESOURCE_EXHAUSTED')) {
      userFriendlyMsg = "현재 AI 서버의 요청이 많아 잠시 숨 고르기가 필요합니다. 1~2분만 기다려 주시면 다시 날카로운 분석을 도와드리겠습니다. (지속될 경우 Google Cloud 빌딩/한도를 확인해 주세요)";
    } else if (rawError.includes('API_KEY_INVALID') || rawError.includes('KEY_REJECTED')) {
      userFriendlyMsg = "AI API 키가 올바르지 않거나 거부되었습니다. [설정 > AI 설정]에서 키를 다시 확인해 주세요.";
    } else if (rawError.includes('SAFETY')) {
      userFriendlyMsg = "요청하신 내용이 AI 안전 정책에 의해 보류되었습니다. 질문을 조금 더 비즈니스 관점으로 구체화해 보세요.";
    } else if (rawError.includes('RETRY_EXHAUSTED')) {
      userFriendlyMsg = "서버 연결 시도가 여러 번 실패했습니다. 인터넷 연결을 확인하거나 잠시 후 다시 시도해 주세요.";
    }

    return { response: '', error: userFriendlyMsg };
  }
};

/**
 * CFO CHAT INTERFACE: Specific adapter for human-like interaction.
 */
export const chatWithCfo = async (messages: any[], systemContext: string) => {
  return callAiService('chat', { messages, systemContext });
};

/**
 * LEDGER ANALYZER: Specific adapter for data-heavy financial analysis.
 */
export const analyzeLedger = async (entries: any[], context: string) => {
  return callAiService('analyze_ledger', { entries, context }, { speed: 'pro' });
};
