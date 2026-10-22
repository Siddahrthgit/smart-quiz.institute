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

function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw
    .replace(/^\x60{3}(?:json)?\s*/i, '')
    .replace(/\x60{3}\s*$/i, '')
    .trim();

  if (!cleaned) throw new Error('Gemini returned an empty response.');
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const candidates = [cleaned.indexOf('{'), cleaned.indexOf('[')].filter(index => index >= 0);
    if (!candidates.length) throw new Error('Gemini did not return a JSON object or array.');
    const start = Math.min(...candidates);
    const opening = cleaned[start];
    const closing = opening === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;

    for (let i = start; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === opening) depth++;
      else if (char === closing) {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    if (end < 0) throw new Error('Gemini returned incomplete JSON.');
    const candidate = cleaned.slice(start, end).replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(candidate) as T;
  }
}

// Parse structured responses safely and retry transient provider failures.
export async function generateJson<T>(prompt: string, retries = 2): Promise<T> {
  const ai = getGeminiClient();
  let lastError: any;

  for (const model of QUESTION_MODELS) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        return parseJsonResponse<T>(response.text || '');
      } catch (err: any) {
        lastError = err;
        const status = Number(err?.status ?? err?.response?.status ?? err?.error?.status);
        if (!isRetryableStatus(status)) throw err;
        const message = String(err?.message || err?.error?.message || '');
        if (status === 429 && /quota|resource_exhausted|limit:\s*0/i.test(message)) {
          throw new Error('Gemini API quota is exhausted. Check the Google AI Studio project quota or try again after it resets.');
        }
        if (attempt < retries) {
          const delay = status === 429 ? 1200 : 1000 * Math.pow(2, attempt);
          console.warn('generateJson: ' + model + ' temporarily unavailable; retrying in ' + delay + 'ms');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }
  if (lastError) throw new GeminiTemporarilyBusyError();
  throw new Error('generateJson: exhausted retries');
}
