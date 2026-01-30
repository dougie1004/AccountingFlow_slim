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

    // 2. Call the Secure Rust Backend
    const response = await safeInvoke<string>('generic_ai_chat', {
      prompt,
      systemContext: systemContext || '당신은 최고의 회계 비서 AI입니다. 모든 답변은 한국어로 핵심만 답하세요.'
    });

    return {
      response,
      meta: { model_version: 'rust-backend-v1', provider: 'google' }
    };
  } catch (error: any) {
    console.error('AI_SERVICE_CALL_FAILED:', error);
    // Extract the real error message from the backend if available
    const errorMsg = typeof error === 'string' ? error : (error.message || 'Back-end communication failure');
    return { response: '', error: errorMsg };
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
