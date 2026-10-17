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

export const QUESTION_MODEL = 'gemini-3.8-flash';
export const QUESTION_MODELS = [QUESTION_MODEL, 'gemini-3.7-flash'] as const;

export class GeminiTemporarilyBusyError extends Error {
  code = 'AI_TEMPORARILY_BUSY';
  constructor() {
    super('AI is temporarily busy. Please try again in a moment.');
    this.name = 'GeminiTemporarilyBusyError';
  }
}

function isRetryableStatus(status: number) {
  return [429, 500, 502, 503, 504].includes(status);
}

// Parse JSON responses safely and retry transient failures. If the primary
// Gemini model remains overloaded, try the fallback model before failing.
export async function generateJson<T>(prompt: string, retries = 2): Promise<T> {
  const ai = getGeminiClient();
  let lastError: any;

  for (const model of QUESTION_MODELS) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        const raw = (response.text || '').trim();
        const cleaned = raw
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();
        return JSON.parse(cleaned) as T;
      } catch (err: any) {
        lastError = err;
        const status = Number(err?.status ?? err?.response?.status ?? err?.error?.status);
        if (!isRetryableStatus(status)) throw err;
        if (attempt < retries) {
          const delay = status === 429 ? 1200 : 1000 * Math.pow(2, attempt);
          console.warn(`generateJson: ${model} temporarily unavailable; retrying in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  if (lastError) {
    throw new GeminiTemporarilyBusyError();
  }
  throw new Error('generateJson: exhausted retries');
}
