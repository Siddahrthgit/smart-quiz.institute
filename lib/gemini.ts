import { GoogleGenAI } from '@google/genai';

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export const QUESTION_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash'] as const;

export class GeminiTemporarilyBusyError extends Error {
  code = 'AI_TEMPORARILY_BUSY';
  constructor() {
    super('AI is temporarily busy. Please try again in a moment.');
    this.name = 'GeminiTemporarilyBusyError';
  }
}

// Ask Gemini for JSON only, strip stray markdown fences, retry transient failures,
// and fail cleanly instead of returning malformed JSON.
function isRetryableStatus(status: number) {
  return [429, 500, 502, 503, 504].includes(status);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateJson<T>(prompt: string): Promise<T> {
  const ai = getGeminiClient();
  let lastError: any;

  for (const model of QUESTION_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({ model, contents: prompt });
        const raw = (response.text || '').trim();
        const cleaned = raw
          .replace(/^\`\`\`json\s*/i, '')
          .replace(/^\`\`\`\s*/i, '')
          .replace(/\`\`\`\s*$/i, '')
          .trim();
        return JSON.parse(cleaned) as T;
      } catch (err: any) {
        lastError = err;
        const status = Number(err?.status ?? err?.response?.status ?? err?.error?.status);
        if (!isRetryableStatus(status)) throw err;
        if (attempt === 0) await sleep(status === 429 ? 1200 : 700);
      }
    }
  }

  throw new GeminiTemporarilyBusyError();
}
