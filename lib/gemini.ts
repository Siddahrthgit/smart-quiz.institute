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

// Ask Gemini for JSON only, strip stray markdown fences, and parse safely.
export async function generateJson<T>(prompt: string): Promise<T> {
  const ai = getGeminiClient();
  let lastError: any;

  for (const model of QUESTION_MODELS) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      const raw = (response.text || '').trim();
      const cleaned = raw.replace(/^\\`\\`\\`json\\s*/i, '').replace(/^\\`\\`\\`\\s*/i, '').replace(/\\`\\`\\`\\s*$/i, '').trim();
      return JSON.parse(cleaned) as T;
    } catch (err: any) {
      lastError = err;
      const status = Number(err?.status ?? err?.response?.status ?? err?.error?.status);
      if (status === 503) continue;
      throw err;
    }
  }

  throw new GeminiTemporarilyBusyError();
}
