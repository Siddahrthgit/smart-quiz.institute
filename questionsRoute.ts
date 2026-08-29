import { Router, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";

const router = Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface GeneratedQuestion {
  id: string;
  prompt: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
}

const TYPE_INSTRUCTIONS: Record<string, string> = {
  mcq: "multiple choice questions, each with exactly 4 options and one correct answer",
  true_false: 'true/false questions, each with options ["True", "False"] and one correct answer',
  short: "short-answer questions with a concise correct answer (no options array)",
  long: "long-answer / descriptive questions with a model correct answer (no options array)",
};

function buildPrompt(topic: string, difficulty: string, questionType: string, count: number) {
  const typeInstruction = TYPE_INSTRUCTIONS[questionType] || TYPE_INSTRUCTIONS.mcq;
  return `Generate exactly ${count} ${difficulty}-difficulty ${typeInstruction} on the topic: "${topic}".

Respond with ONLY valid JSON (no markdown fences, no commentary) matching this exact shape:
{
  "questions": [
    {
      "prompt": "question text",
      "options": ["opt1", "opt2", "opt3", "opt4"],
      "correctIndex": 0
    }
  ]
}

For short/long answer types, omit "options" and "correctIndex" and instead include a "correctAnswer" string field with the model answer.`;
}

router.post("/generate", async (req: Request, res: Response) => {
  try {
    const { topic, difficulty = "medium", questionType = "mcq", count = 10 } = req.body;

    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "topic is required" });
    }
    const safeCount = Math.min(Math.max(Number(count) || 10, 1), 100);

    const prompt = buildPrompt(topic, difficulty, questionType, safeCount);

    const result = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });
    const rawText = (result.text || "").trim();

    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    let parsed: { questions: Omit<GeneratedQuestion, "id">[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse Gemini response as JSON:", rawText);
      return res.status(502).json({ error: "AI returned malformed data, please retry" });
    }

    const questions: GeneratedQuestion[] = (parsed.questions || []).map((q, i) => ({
      id: `${Date.now()}-${i}`,
      ...q,
    }));

    return res.json({ questions });
  } catch (err) {
    console.error("Question generation failed:", err);
    return res.status(500).json({ error: "Failed to generate questions" });
  }
});

export default router;

