import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * AI CORE SERVICE (Agnostic Interface)
 * Strictly using Pinned Versions to ensure stability as requested by the representative.
 */
const AI_CONFIG = {
  PRIMARY_MODEL: 'gemini-2.0-flash',
  FAST_MODEL: 'gemini-2.0-flash',
  PROVIDER_URL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Guard Rails
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI_API_KEY_MISSING' });

  try {
    const { action, payload, options = {} } = req.body;
    const model = options.speed === 'fast' ? AI_CONFIG.FAST_MODEL : AI_CONFIG.PRIMARY_MODEL;

    let contents = [];
    let systemInstruction = '';

    if (action === 'chat') {
      const { messages, systemContext } = payload;
      systemInstruction = systemContext || '당신은 경영진을 서포트하는 AI CFO입니다.';
      contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: [{ text: m.content }]
      }));
    } else if (action === 'analyze_ledger') {
      const { entries, context } = payload;
      systemInstruction = '당신은 숙련된 CFO이자 재무 전략가입니다. 전표 데이터를 분석하여 통찰을 제공하세요.';
      contents = [{
        role: 'user',
        parts: [{ text: `[Context]: ${context}\n[Data]: ${JSON.stringify(entries)}` }]
      }];
    } else {
      // Default/Fallback
      contents = [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }];
    }

    // 2. Perform External API Call
    const url = `${AI_CONFIG.PROVIDER_URL}/${model}:generateContent?key=${apiKey}`;
    const fetchPayload: any = { contents };
    if (systemInstruction) {
      fetchPayload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fetchPayload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('AI_PROVIDER_ERROR:', errorBody);
      return res.status(response.status).json({ error: 'AI_PROVIDER_FAILURE', detail: errorBody });
    }

    const data: any = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 3. Success Response
    return res.status(200).json({
      response: resultText,
      meta: { model, provider: 'google' }
    });

  } catch (error: any) {
    console.error('API_HANDLER_CRASH:', error);
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', detail: error.message });
  }
}
