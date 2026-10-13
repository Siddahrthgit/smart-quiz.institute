import express from 'express';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();

const APP_FEATURES_CONTEXT = `
Smart Exam Preparation is an AI-powered study platform. Key features:
- Upload PDF or text study materials and instantly generate AI quizzes from them
- AI-generated flashcards and study notes from uploaded documents
- Practice room with wrong-answer review, so mistakes get retested
- AI tutor chat that answers questions about your uploaded study material
- Daily study planner and progress dashboard
- Friends feature to compare progress (privacy-controlled, no public leaderboards)
- Free tier covers uploads, quizzes, and your own dashboard; premium unlocks friends/progress comparison, advanced analytics, and unlimited AI generation
`;

router.post('/', async (req, res) => {
  try {
    const { message } = req.body as { message: string };
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'AI is not configured' });

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a friendly assistant on the login page of "Smart Exam Preparation", an AI study app. Answer visitor questions about what the app does, using only the feature list below. Keep answers short (2-4 sentences), welcoming, and focused on helping them decide to sign up. If asked something unrelated to the app, politely redirect to app features.

App features:
${APP_FEATURES_CONTEXT}

Visitor question: "${message.trim().slice(0, 4000)}"`;

    const models = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
    let lastError: any;
    for (const model of models) {
      try {
        const aiResponse = await ai.models.generateContent({ model, contents: prompt });
        const reply = aiResponse.text?.trim();
        if (!reply) throw new Error(`Gemini model ${model} returned an empty response.`);
        return res.json({ success: true, reply, model, provider: 'google-gemini' });
      } catch (err: any) {
        lastError = err;
        const status = Number(err?.status ?? err?.response?.status ?? err?.error?.status);
        console.error('Features Q&A Gemini attempt failed', {
          model,
          status: Number.isFinite(status) ? status : 'unknown',
          message: String(err?.message || 'Unknown provider error').slice(0, 300),
        });
        // Retry other models only for quota, transient provider, or network failures.
        if (status && ![429, 500, 502, 503, 504].includes(status)) break;
      }
    }
    const status = Number(lastError?.status ?? lastError?.response?.status ?? lastError?.error?.status);
    if (status === 429) return res.status(429).json({ error: 'AI is temporarily busy because the Gemini quota is currently limited. Please try again later.' });
    if (status === 401 || status === 403) return res.status(502).json({ error: 'Gemini authentication failed. Check the server API key and permissions.' });
    return res.status(503).json({ error: 'AI is temporarily busy. Please try again in a moment.' });
  } catch (err: any) {
    console.error('Features Q&A error:', err);
    res.status(500).json({ error: 'Failed to answer right now' });
  }
});

export default router;
