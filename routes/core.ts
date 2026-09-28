import express, { Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import * as pdfParseModule from 'pdf-parse';
import Material from '../db/Material';
import { User } from '../db/User';
import { Guest } from '../db/Guest';
import { Attempt } from '../db/Attempt';
import { identifyOwner, IdentifiedRequest } from '../middleware/auth';
import { analyzeLocalText, generateLocalQuestions, generateLocalNotes, findLocalRepeated } from '../lib/localQuizEngine';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || file.mimetype === '' || file.originalname.toLowerCase().endsWith('.pdf');
    cb(isPdf ? null : new Error('ONLY_PDF_ALLOWED'), isPdf);
  },
});

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const PDFParseClass = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default?.PDFParse;
    if (typeof PDFParseClass === 'function') {
      const parser = new PDFParseClass({ data: buffer });
      const result = await parser.getText();
      return result?.text || '';
    }
    const parseFn = (pdfParseModule as any).default || pdfParseModule;
    if (typeof parseFn === 'function') {
      const result = await parseFn(buffer);
      return result?.text || '';
    }
  } catch (err) {
    console.error('PDF parsing error:', err);
  }
  return buffer.toString('utf-8');
}

router.use(identifyOwner);

async function getFixedBranch(req: IdentifiedRequest): Promise<string | undefined> {
  if (req.ownerType === 'user') {
    const user = await User.findById(req.ownerId);
    return user?.branch;
  }
  const guest = await Guest.findOne({ guestId: req.ownerId });
  return guest?.branch;
}

async function setFixedBranchIfEmpty(req: IdentifiedRequest, branch: string) {
  if (req.ownerType === 'user') {
    const user = await User.findById(req.ownerId);
    if (user && !user.branch) {
      user.branch = branch;
      await user.save();
    }
  } else {
    const guest = await Guest.findOne({ guestId: req.ownerId });
    if (guest && !guest.branch) {
      guest.branch = branch;
      guest.lastActiveAt = new Date();
      await guest.save();
    } else if (!guest) {
      await Guest.create({ guestId: req.ownerId, branch, lastActiveAt: new Date() });
    }
  }
}

function ownerKey(req: IdentifiedRequest) {
  return `${req.ownerType}:${req.ownerId}`;
}

router.post('/upload-and-analyze', (req: IdentifiedRequest, res: Response, next) => {
  upload.single('file')(req, res, (err: any) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'FILE_TOO_LARGE',
        message: 'PDF is too large. Maximum upload size is 50 MB.'
      });
    }
    if (err?.message === 'ONLY_PDF_ALLOWED') {
      return res.status(415).json({
        error: 'ONLY_PDF_ALLOWED',
        message: 'Please upload a PDF file.'
      });
    }
    if (err) {
      console.error('PDF upload middleware error:', err);
      return res.status(400).json({
        error: 'PDF_UPLOAD_FAILED',
        message: 'The PDF could not be uploaded. Please try again with a valid PDF.'
      });
    }
    next();
  });
}, async (req: IdentifiedRequest, res: Response) => {
  let docId = '';
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF provided' });
    const { originalname, buffer } = req.file;
    const requestedBranch = typeof req.body?.branch === 'string' ? req.body.branch.trim() : '';
    const extractedText = await parsePdfBuffer(buffer);
    if (!extractedText.trim()) {
      return res.status(422).json({
        error: 'PDF_TEXT_NOT_FOUND',
        message: 'The PDF uploaded successfully, but no readable text was extracted. This usually means it is scanned/image-only, encrypted, or uses an unsupported PDF structure.'
      });
    }

    const cleanText = extractedText.replace(/\s+/g, ' ').trim();
    docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    await Material.create({ docId, userId: req.ownerType === 'user' ? req.ownerId : undefined, ownerKey: ownerKey(req), title: originalname, extractedText, fileType: 'pdf', wordCount: cleanText.split(/\s+/).length, summary: 'Uploaded study material', topics: [] } as any);

    const existingBranch = await getFixedBranch(req);
    const branch = existingBranch || requestedBranch || 'General';
    const analysis = analyzeLocalText(cleanText, 10);
    const subject = analysis.subject;
    const topics = analysis.topics.slice(0, 6);
    const questions = analysis.questions;

    if (!questions.length) {
      return res.status(422).json({
        error: 'NO_USABLE_QUESTIONS',
        message: 'PDF text was extracted, but it did not contain enough readable study statements to build questions. Try a clearer text-based PDF.'
      });
    }

    await setFixedBranchIfEmpty(req, branch);
    await Material.updateOne({ docId, ownerKey: ownerKey(req) }, { $set: { summary: topics.join(', '), topics } });
    return res.json({ success: true, docId, branch, subject, topics, questions, local: true });
  } catch (err: any) {
    console.error('upload-and-analyze error:', err);
    return res.status(500).json({ error: 'LOCAL_ANALYSIS_FAILED', message: 'Could not analyze this PDF locally. Please try another text-based PDF.', ...(docId ? { docId } : {}) });
  }
});

router.post('/material/action', async (req: IdentifiedRequest, res: Response) => {
  try {
    const { docId, action } = req.body as { docId?: string; action?: 'notes' | 'repeated' | 'generate' };
    if (!docId || !['notes', 'repeated', 'generate'].includes(action || '')) return res.status(400).json({ error: 'docId and a valid action are required' });
    const material = await Material.findOne({ docId, ownerKey: ownerKey(req) });
    if (!material) return res.status(404).json({ error: 'Study material not found' });
    const text = String((material as any).extractedText || '');
    if (action === 'notes') return res.json({ success: true, action, notes: { title: material.title, keyPoints: generateLocalNotes(text), topics: analyzeLocalText(text, 0).topics } });
    if (action === 'repeated') return res.json({ success: true, action, repeated: { scope: 'uploaded material only', disclaimer: 'These are repeated or frequent terms detected inside your uploaded material; they are not claims about past exams.', repeatedQuestions: [], repeatedConcepts: findLocalRepeated(text), emphasizedTopics: analyzeLocalText(text, 0).topics } });
    return res.json({ success: true, action, questions: generateLocalQuestions(text, 10) });
  } catch (err: any) {
    console.error('material/action error:', err);
    return res.status(500).json({ error: 'LOCAL_ACTION_FAILED', message: 'Could not process this study material locally.' });
  }
});

router.post('/exam/submit', async (req: IdentifiedRequest, res: Response) => {
  try {
    const { docId, branch, subject, questions, source, parentAttemptId } = req.body as any;
    if (!Array.isArray(questions) || !questions.length) return res.status(400).json({ error: 'No questions submitted' });
    const scored = questions.map((q: any) => ({
      ...q,
      isCorrect: (q.userAnswer || '').trim().toLowerCase() === (q.correctAnswer || '').trim().toLowerCase(),
    }));
    const score = scored.filter((q: any) => q.isCorrect).length;
    const attempt = await Attempt.create({
      ownerId: req.ownerId, ownerType: req.ownerType, docId, branch, subject,
      questions: scored, score, total: scored.length,
      source: source === 'reattempt' ? 'reattempt' : 'exam', parentAttemptId,
    });
    return res.json({ success: true, attemptId: attempt.id, score, total: scored.length });
  } catch (err: any) {
    console.error('exam/submit error:', err);
    return res.status(err?.code === 'AI_TEMPORARILY_BUSY' ? 503 : 500).json({
      error: err?.code === 'AI_TEMPORARILY_BUSY' ? 'AI_TEMPORARILY_BUSY' : (err.message || 'Failed to submit exam'),
      message: err?.code === 'AI_TEMPORARILY_BUSY' ? 'AI is temporarily busy. Please try again in a moment.' : (err.message || 'Failed to submit exam')
    });
  }
});

router.get('/attempts/latest', async (req: IdentifiedRequest, res: Response) => {
  try {
    const attempt = await (Attempt as any).findOne({ ownerId: req.ownerId, ownerType: req.ownerType }).sort({ createdAt: -1 });
    if (!attempt) return res.json({ hasAttempt: false });
    return res.json({
      hasAttempt: true, attemptId: attempt.id, docId: attempt.docId, branch: attempt.branch,
      subject: attempt.subject, score: attempt.score, total: attempt.total,
      wrongCount: attempt.questions.filter((q: any) => !q.isCorrect).length,
    });
  } catch (err: any) {
    return res.status(err?.code === 'AI_TEMPORARILY_BUSY' ? 503 : 500).json({
      error: err?.code === 'AI_TEMPORARILY_BUSY' ? 'AI_TEMPORARILY_BUSY' : (err.message || 'Failed to load latest performance'),
      message: err?.code === 'AI_TEMPORARILY_BUSY' ? 'AI is temporarily busy. Please try again in a moment.' : (err.message || 'Failed to load latest performance')
    });
  }
});

router.get('/attempts/:id', async (req: IdentifiedRequest, res: Response) => {
  try {
    // @ts-expect-error mongoose 9 query-overload bug
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt || attempt.ownerId !== req.ownerId || attempt.ownerType !== req.ownerType) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    const wrong = attempt.questions.filter((q: any) => !q.isCorrect);
    // Keep performance review available even when Gemini is out of quota.
    // Explanations are derived from the original question/correct answer.
    const missing = wrong.filter((q: any) => !q.note);
    if (missing.length) {
      for (const q of missing) {
        (q as any).note = `Review the material for this question. The correct answer is: ${q.correctAnswer}.`;
      }
      await attempt.save();
    }
    return res.json({
      attemptId: attempt.id, docId: attempt.docId, branch: attempt.branch, subject: attempt.subject,
      score: attempt.score, total: attempt.total,
      wrongQuestions: attempt.questions.filter((q: any) => !q.isCorrect),
    });
  } catch (err: any) {
    console.error('attempts/:id error:', err);
    return res.status(err?.code === 'AI_TEMPORARILY_BUSY' ? 503 : 500).json({
      error: err?.code === 'AI_TEMPORARILY_BUSY' ? 'AI_TEMPORARILY_BUSY' : (err.message || 'Failed to load performance review'),
      message: err?.code === 'AI_TEMPORARILY_BUSY' ? 'AI is temporarily busy. Please try again in a moment.' : (err.message || 'Failed to load performance review')
    });
  }
});

router.post('/attempts/:id/reattempt', async (req: IdentifiedRequest, res: Response) => {
  try {
    // @ts-expect-error mongoose 9 query-overload bug
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt || attempt.ownerId !== req.ownerId || attempt.ownerType !== req.ownerType) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    const wrong = attempt.questions.filter((q: any) => !q.isCorrect);
    return res.json({
      docId: attempt.docId, branch: attempt.branch, subject: attempt.subject, parentAttemptId: attempt.id,
      questions: wrong.map((q: any) => ({ question: q.question, options: q.options, correctAnswer: q.correctAnswer, topic: q.topic })),
    });
  } catch (err: any) {
    return res.status(err?.code === 'AI_TEMPORARILY_BUSY' ? 503 : 500).json({
      error: err?.code === 'AI_TEMPORARILY_BUSY' ? 'AI_TEMPORARILY_BUSY' : (err.message || 'Failed to start reattempt'),
      message: err?.code === 'AI_TEMPORARILY_BUSY' ? 'AI is temporarily busy. Please try again in a moment.' : (err.message || 'Failed to start reattempt')
    });
  }
});

router.get('/suggestions', async (req: IdentifiedRequest, res: Response) => {
  try {
    const branch = await getFixedBranch(req);
    if (!branch) return res.json({ suggestions: [] });
    const personalAgg = await Attempt.aggregate([
      { $match: { ownerId: req.ownerId, ownerType: req.ownerType } }, { $unwind: '$questions' },
      { $match: { 'questions.isCorrect': false } }, { $group: { _id: '$questions.topic', count: { $sum: 1 } } },
    ]);
    const materials = await (Material as any).find({ ownerKey: ownerKey(req) }, 'topics');
    const pdfTopics = new Set(materials.flatMap((m: any) => m.topics || []).filter(Boolean));
    const personal = new Map(personalAgg.map((a: any) => [a._id, a.count]));
    const topics = new Set([...personal.keys(), ...pdfTopics].filter(Boolean));
    const ranked = Array.from(topics).map((topic) => ({
      topic, personal: personal.get(topic) || 0, branchWide: 0,
    })).sort((a, b) => b.personal - a.personal).slice(0, 10);
    return res.json({ branch, suggestions: ranked });
  } catch (err: any) {
    return res.status(err?.code === 'AI_TEMPORARILY_BUSY' ? 503 : 500).json({
      error: err?.code === 'AI_TEMPORARILY_BUSY' ? 'AI_TEMPORARILY_BUSY' : (err.message || 'Failed to load weak topics'),
      message: err?.code === 'AI_TEMPORARILY_BUSY' ? 'AI is temporarily busy. Please try again in a moment.' : (err.message || 'Failed to load weak topics')
    });
  }
});

router.post('/guest/merge', async (req: IdentifiedRequest, res: Response) => {
  try {
    if (req.ownerType !== 'user') return res.status(400).json({ error: 'Must be logged in to merge' });
    const { guestId } = req.body as { guestId: string };
    if (!guestId) return res.status(400).json({ error: 'guestId required' });
    const guest = await Guest.findOne({ guestId });
    if (!guest) return res.json({ success: true, merged: 0 });
    const user = await User.findById(req.ownerId);
    if (user && !user.branch && guest.branch) { user.branch = guest.branch; await user.save(); }
    // @ts-expect-error mongoose 9 query-overload bug
    const attemptsUpdated = await Attempt.updateMany({ ownerId: guestId, ownerType: 'guest' }, { $set: { ownerId: req.ownerId, ownerType: 'user' } });
    await Material.updateMany({ ownerKey: `guest:${guestId}` }, { $set: { userId: req.ownerId, ownerKey: `user:${req.ownerId}` } });
    guest.mergedIntoUserId = req.ownerId as any;
    await guest.save();
    return res.json({ success: true, merged: attemptsUpdated.modifiedCount });
  } catch (err: any) {
    return res.status(err?.code === 'AI_TEMPORARILY_BUSY' ? 503 : 500).json({
      error: err?.code === 'AI_TEMPORARILY_BUSY' ? 'AI_TEMPORARILY_BUSY' : (err.message || 'Failed to merge guest data'),
      message: err?.code === 'AI_TEMPORARILY_BUSY' ? 'AI is temporarily busy. Please try again in a moment.' : (err.message || 'Failed to merge guest data')
    });
  }
});

router.get('/question-library', async (req: IdentifiedRequest, res: Response) => {
  try {
    const branch = String(req.query.branch || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim().toLowerCase();
    const filePath = path.join(process.cwd(), 'data', 'questionLibrary.json');
    const library = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const civil = library?.civil || {};
    const keyMap: Record<string, string> = {
      'nec civil': 'nec',
      'nec': 'nec',
      'loksewa civil': 'loksewa',
      'loksewa': 'loksewa',
      'rcc': 'rcc',
      'soil foundation': 'soil-foundation',
      'soil-foundation': 'soil-foundation',
      'soil & foundation': 'soil-foundation',
      'hydraulics': 'hydraulics',
      'hydraulics water resources': 'hydraulics',
      'hydraulics & water resources': 'hydraulics',
      'transportation surveying': 'transportation-surveying',
      'transportation & surveying': 'transportation-surveying'
    };
    const key = keyMap[category] || category;
    const questions = Array.isArray(civil[key]) ? civil[key] : [];
    return res.json({
      success: true,
      branch: branch || null,
      category: category || null,
      questions,
      sourceNote: 'Library practice questions are clearly labeled by source; derived questions are not official NEC/Loksewa past questions.'
    });
  } catch (err: any) {
    console.error('question-library error:', err);
    return res.status(500).json({ error: 'QUESTION_LIBRARY_FAILED', message: 'Could not load the question library.' });
  }
});

router.post('/exam/from-topic', async (req: IdentifiedRequest, res: Response) => {
  try {
    const { topic } = req.body as { topic?: string };
    if (!topic) return res.status(400).json({ error: 'No topic provided' });

    const branch = await getFixedBranch(req);
    const material = await (Material as any).findOne({ ownerKey: ownerKey(req) }).sort({ createdAt: -1 });
    if (!material) {
      return res.status(404).json({
        error: 'NO_STUDY_MATERIAL',
        message: 'Upload a PDF first so StudyPDF can build practice questions from your material.'
      });
    }

    const text = String(material.extractedText || '');
    const topicWords = topic.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const sourceSentences = text
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter((s: string) => s.length >= 30);

    const relevant = topicWords.length
      ? sourceSentences.filter((s: string) => topicWords.some((w: string) => s.toLowerCase().includes(w)))
      : sourceSentences;

    const pool = relevant.length >= 3 ? relevant.join(' ') : text;
    const questions = generateLocalQuestions(pool, 10);

    if (!questions.length) {
      return res.status(422).json({
        error: 'NOT_ENOUGH_SOURCE_CONTENT',
        message: `There is not enough readable material to create practice questions for "${topic}".`
      });
    }

    const docId = 'topic_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    return res.json({
      success: true,
      docId,
      branch: branch || null,
      subject: topic,
      questions,
      local: true
    });
  } catch (err: any) {
    console.error('exam/from-topic error:', err);
    return res.status(500).json({
      error: 'LOCAL_TOPIC_FAILED',
      message: 'Could not create topic practice from the uploaded material.'
    });
  }
});

export default router;
