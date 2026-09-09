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

Visitor question: "${message}"`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    res.json({ success: true, reply: aiResponse.text || "I'm not sure — feel free to sign up and explore!" });
  } catch (err: any) {
    console.error('Features Q&A error:', err);
    res.status(500).json({ error: 'Failed to answer right now' });
  }
});

export default router;
