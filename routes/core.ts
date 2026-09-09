import express, { Response } from 'express';
import multer from 'multer';
import * as pdfParseModule from 'pdf-parse';
import Material from '../db/Material';
import { User } from '../db/User';
import { Guest } from '../db/Guest';
import { Attempt } from '../db/Attempt';
import { identifyOwner, IdentifiedRequest } from '../middleware/auth';
import { generateJson } from '../lib/gemini';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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
  } catch (err) {
    console.error('PDF parsing error:', err);
  }
  return buffer.toString('utf-8');
}

// Every route below requires either a logged-in user or a guest session.
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
    const existing = await Guest.findOne({ guestId: req.ownerId });
    if (existing && !existing.branch) {
      existing.branch = branch;
      existing.lastActiveAt = new Date();
      await existing.save();
    } else if (!existing) {
      await Guest.create({ guestId: req.ownerId, branch, lastActiveAt: new Date() });
    }
  }
}

/**
 * PAGE 2 — Upload PDF.
 * Student only uploads. Behind the scenes: extract text, infer subject
 * always, infer branch only if this owner doesn't already have one fixed,
 * persist the document scoped to this owner, and generate exam questions.
 */
router.post('/upload-and-analyze', upload.single('file'), async (req: IdentifiedRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF provided' });

    const { originalname, buffer } = req.file;
    const extractedText = await parsePdfBuffer(buffer);
    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'Could not read any text from this PDF' });
    }

    const existingBranch = await getFixedBranch(req);

    const analysis = await generateJson<{ branch: string; subject: string; topics: string[] }>(
      `You are classifying a student's study material.
${existingBranch ? `This student's branch/category is already fixed as "${existingBranch}". Keep branch exactly as "${existingBranch}" unless the text is clearly from a completely unrelated field (in which case still return your best-guess branch, but this is unusual).` : `Infer the student's branch/category (e.g. "Civil Engineering", "Computer Science", "Medicine") from the material below.`}
Also infer the specific subject of THIS document (e.g. "Soil Mechanics", "Data Structures").
List 3-6 short topic tags covered in the material.
Respond ONLY as JSON: {"branch": string, "subject": string, "topics": string[]}

MATERIAL:
${extractedText.slice(0, 6000)}`
    );

    const branch = existingBranch || analysis.branch;
    await setFixedBranchIfEmpty(req, branch);

    const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    await Material.create({
      docId,
      userId: req.ownerType === 'user' ? req.ownerId : undefined,
      ownerKey: `${req.ownerType}:${req.ownerId}`,
      title: originalname,
      extractedText,
      fileType: 'pdf',
      wordCount: extractedText.trim().split(/\s+/).length,
      summary: analysis.topics?.join(', '),
    } as any);

    const questions = await generateJson<any[]>(
      `Create 10 multiple-choice exam questions from this material on the subject "${analysis.subject}".
Each item: {"question": string, "options": string[4], "correctAnswer": string (must match one option exactly), "topic": string (short topic tag)}.
Respond ONLY as a JSON array of 10 items, no other text.

MATERIAL:
${extractedText.slice(0, 6000)}`
    );

    return res.json({
      success: true,
      docId,
      branch,
      subject: analysis.subject,
      topics: analysis.topics,
      questions,
    });
  } catch (err: any) {
    console.error('upload-and-analyze error:', err);
    return res.status(500).json({ error: err.message || 'Failed to analyze PDF' });
  }
});

/**
 * PAGE 2 — submit the finished exam session.
 * No answers are ever sent back during the exam itself; only here, after
 * submission, do we score it and store the attempt for Page 3.
 */
router.post('/exam/submit', async (req: IdentifiedRequest, res: Response) => {
  try {
    const { docId, branch, subject, questions, source, parentAttemptId } = req.body as {
      docId: string;
      branch: string;
      subject: string;
      source?: 'exam' | 'reattempt';
      parentAttemptId?: string;
      questions: { question: string; options?: string[]; correctAnswer: string; userAnswer?: string; topic?: string }[];
    };

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'No questions submitted' });
    }

    const scored = questions.map((q) => ({
      ...q,
      isCorrect: (q.userAnswer || '').trim().toLowerCase() === (q.correctAnswer || '').trim().toLowerCase(),
    }));
    const score = scored.filter((q) => q.isCorrect).length;

    const attempt = await Attempt.create({
      ownerId: req.ownerId,
      ownerType: req.ownerType,
      docId,
      branch,
      subject,
      questions: scored,
      score,
      total: scored.length,
      source: source === 'reattempt' ? 'reattempt' : 'exam',
      parentAttemptId,
    });

    return res.json({ success: true, attemptId: attempt.id, score, total: scored.length });
  } catch (err: any) {
    console.error('exam/submit error:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit exam' });
  }
});

/**
 * PAGE 3 — Performance Review data: the attempt, wrong questions ready for
 * reattempt, and (if not generated yet) notes-form explanations for each
 * wrong answer.
 */
router.get('/attempts/:id', async (req: IdentifiedRequest, res: Response) => {
  try {
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt || attempt.ownerId !== req.ownerId) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const wrong = attempt.questions.filter((q: any) => !q.isCorrect);
    const missingNotes = wrong.filter((q: any) => !q.note);

    if (missingNotes.length > 0) {
      const notes = await generateJson<{ question: string; note: string }[]>(
        `For each wrong answer below, write a short notes-form explanation (2-4 sentences, like a study note, not just "the answer is X") of why the correct answer is right.
Respond ONLY as a JSON array: [{"question": string, "note": string}, ...]

WRONG ANSWERS:
${missingNotes.map((q: any) => `Q: ${q.question}\nCorrect answer: ${q.correctAnswer}\nStudent answered: ${q.userAnswer || '(no answer)'}`).join('\n\n')}`
      );
      for (const n of notes) {
        const q = attempt.questions.find((aq: any) => aq.question === n.question);
        if (q) (q as any).note = n.note;
      }
      await attempt.save();
    }

    return res.json({
      attemptId: attempt.id,
      docId: attempt.docId,
      branch: attempt.branch,
      subject: attempt.subject,
      score: attempt.score,
      total: attempt.total,
      wrongQuestions: attempt.questions.filter((q: any) => !q.isCorrect),
    });
  } catch (err: any) {
    console.error('attempts/:id error:', err);
    return res.status(500).json({ error: err.message || 'Failed to load performance review' });
  }
});

/**
 * PAGE 3 — Reattempt: re-serve the wrong questions from a prior attempt as
 * a fresh mini exam (still no answers shown during it).
 */
router.post('/attempts/:id/reattempt', async (req: IdentifiedRequest, res: Response) => {
  try {
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt || attempt.ownerId !== req.ownerId) {
      return res.status(404).json({ error: 'Attempt not found' });
    }
    const wrong = attempt.questions.filter((q: any) => !q.isCorrect);
    return res.json({
      docId: attempt.docId,
      branch: attempt.branch,
      subject: attempt.subject,
      parentAttemptId: attempt.id,
      questions: wrong.map((q: any) => ({ question: q.question, options: q.options, correctAnswer: q.correctAnswer, topic: q.topic })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to start reattempt' });
  }
});

/**
 * Suggestions side panel — blended ranked list: this owner's own weak
 * topics, plus branch-wide common weak topics across other users/guests
 * in the SAME branch. Only aggregated topic counts cross the owner
 * boundary here, never another person's individual records.
 */
router.get('/suggestions', async (req: IdentifiedRequest, res: Response) => {
  try {
    const branch = await getFixedBranch(req);
    if (!branch) return res.json({ suggestions: [] });

    const personalAgg = await Attempt.aggregate([
      { $match: { ownerId: req.ownerId } },
      { $unwind: '$questions' },
      { $match: { 'questions.isCorrect': false } },
      { $group: { _id: '$questions.topic', count: { $sum: 1 } } },
    ]);

    const branchAgg = await Attempt.aggregate([
      { $match: { branch } },
      { $unwind: '$questions' },
      { $match: { 'questions.isCorrect': false } },
      { $group: { _id: '$questions.topic', count: { $sum: 1 } } },
    ]);

    const personalMap = new Map(personalAgg.map((a: any) => [a._id, a.count]));
    const branchMap = new Map(branchAgg.map((a: any) => [a._id, a.count]));
    const allTopics = new Set([...personalMap.keys(), ...branchMap.keys()].filter(Boolean));

    // Blended score: personal weakness weighted higher than branch-wide trend.
    const ranked = Array.from(allTopics)
      .map((topic) => {
        const personal = personalMap.get(topic) || 0;
        const branchWide = branchMap.get(topic) || 0;
        return { topic, score: personal * 3 + branchWide, personal, branchWide };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return res.json({ branch, suggestions: ranked });
  } catch (err: any) {
    console.error('suggestions error:', err);
    return res.status(500).json({ error: err.message || 'Failed to load suggestions' });
  }
});

/**
 * When a guest signs up / logs in for the first time after using the app
 * as a guest, fold their guest data into the new account so nothing is lost.
 */
router.post('/guest/merge', async (req: IdentifiedRequest, res: Response) => {
  try {
    if (req.ownerType !== 'user') return res.status(400).json({ error: 'Must be logged in to merge' });
    const { guestId } = req.body as { guestId: string };
    if (!guestId) return res.status(400).json({ error: 'guestId required' });

    const guest = await Guest.findOne({ guestId });
    if (!guest) return res.json({ success: true, merged: 0 });

    const user = await User.findById(req.ownerId);
    if (user && !user.branch && guest.branch) {
      user.branch = guest.branch;
      await user.save();
    }

    const attemptsUpdated = await Attempt.updateMany(
      { ownerId: guestId, ownerType: 'guest' },
      { $set: { ownerId: req.ownerId, ownerType: 'user' } }
    );
    await Material.updateMany({ ownerKey: `guest:${guestId}` }, { $set: { userId: req.ownerId, ownerKey: `user:${req.ownerId}` } });

    guest.mergedIntoUserId = req.ownerId as any;
    await guest.save();

    return res.json({ success: true, merged: attemptsUpdated.modifiedCount });
  } catch (err: any) {
    console.error('guest/merge error:', err);
    return res.status(500).json({ error: err.message || 'Failed to merge guest data' });
  }
});

export default router;
