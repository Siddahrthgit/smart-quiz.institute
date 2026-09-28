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

// Ask Gemini for JSON only, strip stray markdown fences, and parse safely.
// Retries on transient 503 (model overloaded) with exponential backoff -
// this is exactly the error that killed generate-from-material earlier.
export async function generateJson<T>(prompt: string, retries = 2): Promise<T> {
  const ai = getGeminiClient();
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: QUESTION_MODEL,
        contents: prompt,
      });
      const raw = (response.text || '').trim();
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(cleaned) as T;
    } catch (err: any) {
      const isOverloaded = err?.status === 503;
      if (isOverloaded && attempt < retries) {
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(`generateJson: Gemini overloaded, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('generateJson: exhausted retries');
}
