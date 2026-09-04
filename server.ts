import 'dotenv/config';
import express from 'express';
import path from 'path';
import multer from 'multer';
import * as pdfParseModule from 'pdf-parse';
import questionsRoute from "./questionsRoute";

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const PDFParseClass = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default?.PDFParse;
    if (typeof PDFParseClass === 'function') {
      const parser = new PDFParseClass({ data: buffer });
      const res = await parser.getText();
      return res?.text || '';
    }
    const parseFn = (pdfParseModule as any).default || pdfParseModule;
    if (typeof parseFn === 'function') {
      const res = await parseFn(buffer);
      return res?.text || '';
    }
  } catch (err: any) {
    console.error('PDF parsing error in parsePdfBuffer:', err);
  }
  return buffer.toString('utf-8');
}

import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { connectDB } from './db/connect';
import Material from './db/Material';
import { User } from './db/User';
import authRoutes from './routes/auth';
import { authLimiter, paymentLimiter } from './middleware/rateLimit';
import paymentRoutes from './routes/payment';
import featuresQaRoutes from './routes/features-qa';
import materialsRoutes from './routes/materials';
import questionsRoute from './questionsRoute';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api/auth', authLimiter, authRoutes);

// Public stats: active user counts, shown on the landing page (no auth required)
app.get('/api/stats/active-users', async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalUsers, activeToday] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ lastActiveAt: { $gte: oneDayAgo } }),
    ]);
    return res.json({ totalUsers, activeToday });
  } catch (err) {
    console.error('Failed to fetch active user stats:', err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
app.use('/api/payment', paymentLimiter, paymentRoutes);
app.use('/api/features-qa', featuresQaRoutes);
app.use('/api/questions', questionsRoute);
app.use('/api/materials', materialsRoutes);

// Setup multer memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 }, // 40 MB max file size
});

// Lazy load Gemini API client
let genAiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!genAiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY environment variable is missing.');
      throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
    }
    genAiClient = new GoogleGenAI({ apiKey });
  }
  return genAiClient;
}

// Helper to safely parse AI JSON output even with raw backslashes or invalid escapes
function safeJsonParse<T = any>(rawText: string, fallback: T = {} as T): T {
  if (!rawText) return fallback;

  let cleaned = rawText.trim();

  // Strip markdown code block wrapping if present (e.g., ```json ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // Attempt 1: Direct JSON.parse
  try {
    return JSON.parse(cleaned);
  } catch (err1) {
    // Attempt 2: Fix unescaped backslashes (e.g. LaTeX formulas \frac, \alpha, \sum, \textbf, etc.)
    // Replace backslashes that are NOT followed by valid JSON escape chars (", \, /, b, f, n, r, t, or uXXXX)
    try {
      const fixedEscapes = cleaned.replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');
      return JSON.parse(fixedEscapes);
    } catch (err2) {
      // Attempt 3: Replace control characters and unescaped newlines in strings
      try {
        const sanitizeControl = cleaned
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
            if (c === '\n') return '\\n';
            if (c === '\r') return '\\r';
            if (c === '\t') return '\\t';
            return '';
          })
          .replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');
        return JSON.parse(sanitizeControl);
      } catch (err3) {
        // Attempt 4: Extract JSON object or array substring
        try {
          const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
          if (match) {
            const extracted = match[1]
              .replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => (c === '\n' ? '\\n' : c === '\r' ? '\\r' : c === '\t' ? '\\t' : ''))
              .replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');
            return JSON.parse(extracted);
          }
        } catch (err4) {
          console.error('safeJsonParse failed completely. Raw snippet:', rawText.slice(0, 300));
        }
      }
    }
  }

  return fallback;
}

// In-Memory Documents and Quiz store
interface StoredDoc {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  sizeFormatted: string;
  content: string;
  summary?: string;
  wordCount: number;
}

const documentStore: Map<string, StoredDoc> = new Map();

// Persist a document to MongoDB so it survives server restarts.
// userId is optional since the app supports guest (no-login) usage.
async function persistDocument(doc: StoredDoc, userId?: string) {
  try {
    await Material.findOneAndUpdate(
      { docId: doc.id },
      {
        docId: doc.id,
        userId: userId || undefined,
        title: doc.name,
        extractedText: doc.content,
        fileType: doc.type,
        sizeFormatted: doc.sizeFormatted,
        wordCount: doc.wordCount,
        summary: doc.summary,
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Failed to persist document to MongoDB:', err);
  }
}

// Load all previously saved documents from MongoDB back into the
// in-memory documentStore cache on server startup.
async function hydrateDocumentStore() {
  try {
    const materials = await Material.find({});
    for (const m of materials) {
      documentStore.set(m.docId, {
        id: m.docId,
        name: m.title,
        type: m.fileType || 'txt',
        uploadDate: m.createdAt.toISOString().split('T')[0],
        sizeFormatted: m.sizeFormatted || '',
        content: m.extractedText,
        summary: m.summary,
        wordCount: m.wordCount || 0,
      });
    }
    console.log(`Hydrated ${materials.length} document(s) from MongoDB`);
  } catch (err) {
    console.error('Failed to hydrate documents from MongoDB:', err);
  }
}

// Helper to calculate word count and format size
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// API Routes

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// File Upload endpoint (PDF / TXT / Markdown)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { originalname, buffer, size, mimetype } = req.file;
    let extractedText = '';
    let fileType = 'txt';

    if (mimetype.includes('pdf') || originalname.endsWith('.pdf')) {
      fileType = 'pdf';
      try {
        extractedText = await parsePdfBuffer(buffer);
      } catch (pdfErr: any) {
        console.error('PDF parsing error:', pdfErr);
        extractedText = buffer.toString('utf-8');
      }
    } else {
      extractedText = buffer.toString('utf-8');
      if (originalname.endsWith('.md')) fileType = 'md';
    }

    if (!extractedText.trim()) {
      extractedText = 'No text could be extracted from this file. Please ensure it contains selectables/readable text.';
    }

    const wordCount = extractedText.trim().split(/\s+/).length;
    const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Optional AI summary of document using Gemini
    let docSummary = '';
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `Summarize the following study material in 2-3 high level sentences:\n\n${extractedText.slice(0, 4000)}`,
      });
      docSummary = response.text || '';
    } catch (aiErr) {
      console.warn('Could not generate automatic doc summary:', aiErr);
    }

    const newDoc: StoredDoc = {
      id: docId,
      name: originalname,
      type: fileType,
      uploadDate: new Date().toISOString().split('T')[0],
      sizeFormatted: formatBytes(size),
      content: extractedText,
      summary: docSummary,
      wordCount,
    };

    documentStore.set(docId, newDoc);
    persistDocument(newDoc);

    return res.json({
      success: true,
      document: newDoc,
    });
  } catch (err: any) {
    console.error('Upload handler error:', err);
    return res.status(500).json({ error: err.message || 'Failed to process file upload' });
  }
  });

app.post('/api/drive/import-link', async (req, res) => {
  try {
    const { url, title: providedTitle } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Please provide a Google Drive share link' });
    }

    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const fileId = match ? match[1] : null;
    if (!fileId) {
      return res.status(400).json({ error: 'Could not find a file ID in that link. Make sure it is a Google Drive share link.' });
    }

    let extractedText = '';

    try {
      const docRes = await fetch(`https://docs.google.com/document/d/${fileId}/export?format=txt`);
      if (docRes.ok) {
        const text = await docRes.text();
        const trimmed = text.trim();
        if (trimmed && !trimmed.startsWith('<!DOCTYPE') && !trimmed.startsWith('<html')) {
          extractedText = text;
        }
      }
    } catch (e) {
      console.warn('Drive doc export attempt failed:', e);
    }

    if (!extractedText) {
      const fileRes = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
      if (!fileRes.ok) {
        return res.status(400).json({ error: 'Could not access this file. Make sure sharing is set to "Anyone with the link".' });
      }
      const contentType = fileRes.headers.get('content-type') || '';
      const buffer = Buffer.from(await fileRes.arrayBuffer());

      if (contentType.includes('pdf') || buffer.slice(0, 4).toString() === '%PDF') {
        try {
          extractedText = await parsePdfBuffer(buffer);
        } catch (pdfErr) {
          console.error('Drive PDF parsing error:', pdfErr);
        }
      } else if (contentType.includes('text') || contentType.includes('plain')) {
        extractedText = buffer.toString('utf-8');
      } else {
        return res.status(400).json({ error: 'Unsupported file type. Only PDF, TXT, and Google Docs are supported.' });
      }
    }

    if (!extractedText || !extractedText.trim()) {
      return res.status(400).json({ error: 'Could not extract any text from this file.' });
    }

    const wordCount = extractedText.trim().split(/\s+/).length;
    const docId = 'drive_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const newDoc: StoredDoc = {
      id: docId,
      name: providedTitle || 'Imported from Google Drive',
      type: 'drive',
      uploadDate: new Date().toISOString().split('T')[0],
      sizeFormatted: formatBytes(Buffer.byteLength(extractedText, 'utf-8')),
      content: extractedText,
      summary: '',
      wordCount,
    };

    documentStore.set(docId, newDoc);
    persistDocument(newDoc);

    return res.json({ success: true, document: newDoc });
  } catch (err: any) {
    console.error('Drive import error:', err);
    return res.status(500).json({ error: err.message || 'Failed to import from Google Drive' });
  }
});

// Import text content directly (e.g., Google Drive or pasted text)
app.post('/api/documents/import-text', (req, res) => {
  try {
    const { title, content, sourceType } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const name = title || 'Imported Material';
    const wordCount = content.trim().split(/\s+/).length;
    const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const newDoc: StoredDoc = {
      id: docId,
      name,
      type: sourceType || 'drive',
      uploadDate: new Date().toISOString().split('T')[0],
      sizeFormatted: formatBytes(Buffer.byteLength(content, 'utf8')),
      content,
      wordCount,
    };

    documentStore.set(docId, newDoc);
    persistDocument(newDoc);
    return res.json({ success: true, document: newDoc });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// List documents
app.get('/api/documents', (_req, res) => {
  const docs = Array.from(documentStore.values());
  res.json({ documents: docs });
});

// Get document by ID
app.get('/api/documents/:id', (req, res) => {
  const doc = documentStore.get(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json({ document: doc });
});

// Delete document by ID
app.delete('/api/documents/:id', (req, res) => {
  const docId = req.params.id;
  if (documentStore.has(docId)) {
    documentStore.delete(docId);
    Material.deleteOne({ docId }).catch((err) => console.error("Failed to delete document from MongoDB:", err));
    return res.json({ success: true, message: 'Document deleted successfully', id: docId });
  }
  return res.json({ success: true, message: 'Document removed from session', id: docId });
});

// Generate Smart Quiz via Gemini AI
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { documentId, topic, numQuestions = 5, difficulty = 'medium', questionTypes = ['mcq'], isExamMode = false } = req.body;

    let studyContext = '';
    let docName = topic || 'General Knowledge';

    if (documentId && documentStore.has(documentId)) {
      const doc = documentStore.get(documentId)!;
      studyContext = doc.content;
      docName = doc.name;
    } else if (topic) {
      studyContext = `Topic: ${topic}`;
    } else {
      return res.status(400).json({ error: 'Please select a document or provide a study topic.' });
    }

    const truncatedContext = studyContext.slice(0, 40000);

    const prompt = `You are Smart Exam Preparation, an expert educational assessment generator.
Generate a high-quality quiz based on the following material:

Material:
"""
${truncatedContext}
"""

Requirements:
1. Generate exactly ${numQuestions} questions.
2. Difficulty requested: ${difficulty} (if adaptive, mix easy, medium, and hard).
3. Question Types to include from this list: ${JSON.stringify(questionTypes)} (e.g. mcq, true_false, fill_blank, match, short_answer, long_answer).
4. For 'mcq', provide 4 options in an array, with 1 unambiguous correct answer.
5. For 'true_false', provide options ['True', 'False'].
6. For 'match', provide 'matchPairs': array of { left: "term", right: "definition" }.
7. Provide a clear, thorough 'explanation' explaining WHY the correct answer is right and why other options are incorrect.
8. Include a 'topic' tag for each question.
9. Include 'sourceSnippet' excerpting a 1-2 sentence reference from the source material if applicable.

Return ONLY a valid JSON object with the following schema:
{
  "title": "Quiz Title",
  "questions": [
    {
      "id": "q1",
      "type": "mcq" | "true_false" | "fill_blank" | "match" | "short_answer" | "long_answer",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Detailed explanation...",
      "difficulty": "easy" | "medium" | "hard",
      "topic": "Topic Name",
      "sourceSnippet": "Excerpt from text...",
      "matchPairs": [ { "left": "...", "right": "..." } ]
    }
  ]
}`;

    const ai = getGeminiClient();
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = aiResponse.text || '{}';
    const parsedJson = safeJsonParse<Record<string, any>>(responseText, {});

    if (!parsedJson.questions || !Array.isArray(parsedJson.questions) || parsedJson.questions.length === 0) {
      console.warn('AI quiz response missing questions array. Raw response:', responseText.slice(0, 200));
    }

    return res.json({
      success: true,
      quizTitle: parsedJson.title || `${docName} Quiz`,
      documentName: docName,
      questions: parsedJson.questions || [],
    });
  } catch (err: any) {
    console.error('Quiz generation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate quiz with AI' });
  }
});

// Generate AI Targeted Mistake Practice Quiz
app.post('/api/generate-mistake-quiz', async (req, res) => {
  try {
    const { wrongQuestions = [], numQuestions = 5 } = req.body;

    if (!Array.isArray(wrongQuestions) || wrongQuestions.length === 0) {
      return res.status(400).json({ error: 'No wrong questions provided to generate mistake practice.' });
    }

    const wrongSummary = wrongQuestions
      .slice(0, 10)
      .map((q: any, i: number) => `Mistake ${i + 1}:
Question: "${q.question}"
Correct Answer: "${q.correctAnswer}"
Student Answer: "${q.userAnswer || 'Wrong / Unanswered'}"
Topic: "${q.topic || 'General'}"`)
      .join('\n\n');

    const prompt = `You are Smart Practice AI, a targeted educational tutor.
The student answered these questions INCORRECTLY in previous quizzes:

${wrongSummary}

Your Goal:
1. Identify the core concepts, misconceptions, and weak spots reflected in these mistakes.
2. Generate ${numQuestions} BRAND NEW variation questions designed to help the student master these exact weak concepts.
3. Provide crystal clear explanations for every question highlighting the student's common pitfall.

Return ONLY a valid JSON object matching this schema:
{
  "title": "AI Mistake Focus & Weak Concept Mastery Quiz",
  "questions": [
    {
      "id": "mq1",
      "type": "mcq",
      "question": "Fresh variation question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Detailed explanation addressing why students commonly get confused...",
      "difficulty": "medium",
      "topic": "Topic Name"
    }
  ]
}`;

    const ai = getGeminiClient();
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = safeJsonParse<Record<string, any>>(aiResponse.text || '{}', {});
    return res.json({
      success: true,
      quizTitle: parsed.title || 'AI Mistake Targeted Practice',
      questions: parsed.questions || [],
    });
  } catch (err: any) {
    console.error('Mistake quiz generation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate mistake practice quiz.' });
  }
});

// Generate Flashcards & Notes directly from Wrong Questions / Quiz Misses
app.post('/api/generate-mistake-notes-flashcards', async (req, res) => {
  try {
    const { wrongQuestions = [], quizTitle = 'Exam Mistakes Review' } = req.body;

    if (!Array.isArray(wrongQuestions) || wrongQuestions.length === 0) {
      return res.status(400).json({ error: 'No wrong questions provided to generate flashcards.' });
    }

    const wrongListText = wrongQuestions.map((q: any, idx: number) => `Item ${idx + 1}:
Question: ${q.question}
Correct Answer: ${q.correctAnswer}
User Answer: ${q.userAnswer || 'Wrong'}
Explanation: ${q.explanation || ''}`).join('\n\n');

    const prompt = `You are an expert Study Coach AI.
The student answered these questions INCORRECTLY in a recent exam or quiz ("${quizTitle}"):

${wrongListText}

Generate:
1. A concise Study Note titled "Targeted Weak Areas: ${quizTitle}" with summary, key takeaways, key terms, and markdown review.
2. High-quality Flashcards (one per misconception) with Front (question / prompt highlighting the trap) and Back (clear, memory-anchored solution).

Return ONLY a valid JSON matching this schema:
{
  "studyNote": {
    "title": "Weak Concepts Review: ${quizTitle}",
    "summary": "Summary of primary misconceptions...",
    "keyTakeaways": ["Takeaway 1", "Takeaway 2"],
    "keyTerms": [{"term": "Term 1", "definition": "Def 1"}],
    "contentMarkdown": "### Targeted Revision Note..."
  },
  "flashcards": [
    {
      "front": "Flashcard front prompt?",
      "back": "Clear answer and explanation",
      "topic": "Topic Name",
      "difficulty": "medium"
    }
  ]
}`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = safeJsonParse<Record<string, any>>(response.text || '{}', {});

    return res.json({
      success: true,
      studyNote: parsed.studyNote || null,
      flashcards: parsed.flashcards || [],
    });
  } catch (err: any) {
    console.error('Mistake flashcards generation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate mistake flashcards.' });
  }
});

// Search & Friends API
const mockUsersDatabase: any[] = [];

app.get('/api/friends', (req, res) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  if (!query) {
    return res.json({ users: mockUsersDatabase });
  }

  const filtered = mockUsersDatabase.filter(
    (u) =>
      u.username.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.name.toLowerCase().includes(query)
  );

  return res.json({ users: filtered });
});

// Generate AI Study Notes & Summary
app.post('/api/generate-notes', async (req, res) => {
  try {
    const { documentId, topic, contentText } = req.body;

    let textToAnalyze = contentText || '';
    let docTitle = topic || 'Study Material';

    if (documentId && documentStore.has(documentId)) {
      const doc = documentStore.get(documentId)!;
      textToAnalyze = doc.content;
      docTitle = doc.name;
    }

    if (!textToAnalyze.trim()) {
      return res.status(400).json({ error: 'No content provided for study notes generation' });
    }

    const truncated = textToAnalyze.slice(0, 12000);

    const prompt = `You are Smart Exam Preparation. Generate structured, high-yield study notes from the following text.
IMPORTANT: Return strict valid JSON. Do NOT output unescaped backslashes in JSON string values. For backslashes or formulas, use proper JSON double backslashes (e.g. \\\\n or \\\\frac).

Material:
"""
${truncated}
"""

Return a JSON object matching this schema:
{
  "title": "Study Notes: ${docTitle}",
  "summary": "2-3 paragraph comprehensive summary...",
  "keyTakeaways": ["Bullet 1", "Bullet 2", "Bullet 3", "Bullet 4", "Bullet 5"],
  "keyTerms": [
    { "term": "Term 1", "definition": "Definition 1" },
    { "term": "Term 2", "definition": "Definition 2" }
  ],
  "contentMarkdown": "# Detailed Analysis\\n\\nMarkdown formatted organized study notes with headers, bullet points, and key formulas or concepts..."
}`;

    const ai = getGeminiClient();
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = safeJsonParse<Record<string, any>>(aiResponse.text || '{}', {});
    return res.json({ success: true, notes: parsed });
  } catch (err: any) {
    console.error('Notes generation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate study notes' });
  }
});

// Generate AI Flashcards
app.post('/api/generate-flashcards', async (req, res) => {
  try {
    const { documentId, topic, count = 6 } = req.body;

    let context = topic || '';
    if (documentId && documentStore.has(documentId)) {
      context = documentStore.get(documentId)!.content;
    }

    if (context.trim().length === 0) { return res.status(400).json({ error: 'Please select or upload a document, or provide a topic, before generating flashcards.' }); }
    const truncated = context.slice(0, 10000);

    const prompt = `Generate ${count} high-yield educational flashcards based on the material below:
"""
${truncated}
"""

Return JSON format:
{
  "flashcards": [
    {
      "id": "fc1",
      "front": "Question / Concept on front of card",
      "back": "Clear concise answer / breakdown on back of card",
      "topic": "Topic Name",
      "difficulty": "easy"
    }
  ]
}`;

    const ai = getGeminiClient();
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = safeJsonParse<Record<string, any>>(aiResponse.text || '{}', { flashcards: [] });
    return res.json({ success: true, flashcards: parsed.flashcards || [] });
  } catch (err: any) {
    console.error('Flashcards error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate flashcards' });
  }
});

// Document Chatbot (Q&A / Material Assistant)
app.post('/api/doc-chat', async (req, res) => {
  try {
    const { documentId, message, history = [] } = req.body;

    let docContext = '';
    if (documentId && documentStore.has(documentId)) {
      docContext = documentStore.get(documentId)!.content.slice(0, 10000);
    }

    const prompt = `You are Smart Exam Preparation Tutor assistant.
Context material:
"""
${docContext || 'General academic assistance'}
"""

User Query: "${message}"

Answer accurately, clearly, and concisely using simple language. If relevant information is found in the provided context material, reference it specifically.`;

    const ai = getGeminiClient();
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    return res.json({
      success: true,
      reply: aiResponse.text || 'I could not synthesize a response for that query.',
    });
  } catch (err: any) {
    console.error('Doc chat error:', err);
    return res.status(500).json({ error: err.message || 'AI Chat assistance failed' });
  }
});

// Evaluate Short/Long Answer using AI
app.post('/api/evaluate-answer', async (req, res) => {
  try {
    const { question, correctAnswer, userAnswer } = req.body;

    const prompt = `Evaluate the following student answer for a subjective question.

Question: "${question}"
Model/Correct Answer: "${correctAnswer}"
Student Answer: "${userAnswer}"

Return JSON:
{
  "isCorrect": boolean,
  "scorePercentage": number,
  "feedback": "Constructive 2-3 sentence feedback explaining what was good and what key points were missed..."
}`;

    const ai = getGeminiClient();
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = safeJsonParse<Record<string, any>>(aiResponse.text || '{}', { isCorrect: false, scorePercentage: 0, feedback: '' });
    return res.json({ success: true, evaluation: parsed });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Google Drive integration proxy route (Lists files if user provides token or environment)
app.get('/api/drive/files', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No OAuth access token header provided' });
    }

    const driveRes = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fpdf%27+or+mimeType%3D%27text%2Fplain%27+or+mimeType%3D%27application%2Fvnd.google-apps.document%27&fields=files(id,name,mimeType,size,modifiedTime)', {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!driveRes.ok) {
      const errText = await driveRes.text();
      return res.status(driveRes.status).json({ error: 'Google Drive API error', details: errText });
    }

    const data = await driveRes.json();
    return res.json({ files: data.files || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Start express server with Vite middleware in dev mode
async function main() {
  await connectDB();
  await hydrateDocumentStore();
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Exam Preparation server listening on http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal server startup error:', err);
});
