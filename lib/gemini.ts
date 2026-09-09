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

export const QUESTION_MODEL = 'gemini-3.6-flash';

// Ask Gemini for JSON only, strip stray markdown fences, and parse safely.
export async function generateJson<T>(prompt: string): Promise<T> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: QUESTION_MODEL,
    contents: prompt,
  });
  const raw = (response.text || '').trim();
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned) as T;
}
