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

router.post('/upload-and-analyze', upload.single('file'), async (req: IdentifiedRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF provided' });
    const { originalname, buffer } = req.file;
    const extractedText = await parsePdfBuffer(buffer);
    if (!extractedText.trim()) return res.status(400).json({ error: 'Could not read any text from this PDF' });

    const existingBranch = await getFixedBranch(req);
    const analysis = await generateJson<{ branch: string; subject: string; topics: string[] }>(
      `Classify this study material. ${existingBranch ? `The student's branch is already fixed as "${existingBranch}". Return that branch.` : 'Infer the branch/category.'}
Infer the specific subject and 3-6 short topic tags.
Return ONLY JSON: {"branch":string,"subject":string,"topics":string[]}

MATERIAL:
${extractedText.slice(0, 6000)}`
    );
    const branch = existingBranch || analysis.branch;
    await setFixedBranchIfEmpty(req, branch);

    const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    await Material.create({
      docId,
      userId: req.ownerType === 'user' ? req.ownerId : undefined,
      ownerKey: ownerKey(req),
      title: originalname,
      extractedText,
      fileType: 'pdf',
      wordCount: extractedText.trim().split(/\s+/).length,
      summary: analysis.topics?.join(', '),
      topics: analysis.topics,
    } as any);

    const questions = await generateJson<any[]>(
      `Create 10 multiple-choice questions ONLY from this material. Each item must be {"question":string,"options":string[4],"correctAnswer":string,"topic":string}, and correctAnswer must exactly match one option. Return ONLY a JSON array.
SUBJECT: ${analysis.subject}
MATERIAL:
${extractedText.slice(0, 6000)}`
    );

    return res.json({ success: true, docId, branch, subject: analysis.subject, topics: analysis.topics, questions });
  } catch (err: any) {
    console.error('upload-and-analyze error:', err);
    return res.status(500).json({ error: err.message || 'Failed to analyze PDF' });
  }
});

router.post('/material/action', async (req: IdentifiedRequest, res: Response) => {
  try {
    const { docId, action } = req.body as { docId?: string; action?: 'notes' | 'repeated' | 'generate' };
    if (!docId || !['notes', 'repeated', 'generate'].includes(action || '')) {
      return res.status(400).json({ error: 'docId and a valid action are required' });
    }
    const material = await Material.findOne({ docId, ownerKey: ownerKey(req) });
    if (!material) return res.status(404).json({ error: 'Study material not found' });
    const text = String((material as any).extractedText || '').slice(0, 18000);

    if (action === 'notes') {
      const notes = await generateJson<any>(
        `Create useful study notes from the uploaded material. Do not invent facts. Return ONLY JSON with keys title, summary, keyConcepts, definitions, formulas, keyPoints. Use arrays for keyConcepts, definitions, formulas, keyPoints.
MATERIAL:
${text}`
      );
      return res.json({ success: true, action, notes });
    }

    if (action === 'repeated') {
      const repeated = await generateJson<any>(
        `Analyze this uploaded material for repetition/emphasis INSIDE THE MATERIAL ONLY. Do not claim that a question appeared in past exams unless the material itself explicitly provides that evidence. Return ONLY JSON with keys scope, disclaimer, repeatedQuestions, repeatedConcepts, emphasizedTopics. repeatedQuestions must contain only questions/prompts that are actually repeated or strongly emphasized in the supplied material.
MATERIAL:
${text}`
      );
      return res.json({ success: true, action, repeated });
    }

    const questions = await generateJson<any[]>(
      `Generate exactly 10 multiple-choice questions from ONLY this uploaded material. Return ONLY JSON array. Each item: {"question":string,"options":string[4],"correctAnswer":string,"topic":string}; correctAnswer must exactly equal one option. Avoid duplicate questions.
MATERIAL:
${text}`
    );
    return res.json({ success: true, action, questions });
  } catch (err: any) {
    console.error('material/action error:', err);
    return res.status(500).json({ error: err.message || 'Failed to process study material' });
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
    return res.status(500).json({ error: err.message || 'Failed to submit exam' });
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
    return res.status(500).json({ error: err.message || 'Failed to load latest performance' });
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
    const missing = wrong.filter((q: any) => !q.note);
    if (missing.length) {
      const notes = await generateJson<{ question: string; note: string }[]>(
        `For each wrong answer, write a short study-note explanation. Return ONLY JSON array of {"question":string,"note":string}.
${missing.map((q: any) => `Q: ${q.question}\nCorrect: ${q.correctAnswer}\nStudent: ${q.userAnswer || '(none)'}`).join('\n\n')}`
      );
      for (const n of notes) {
        const q = attempt.questions.find((x: any) => x.question === n.question);
        if (q) (q as any).note = n.note;
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
    return res.status(500).json({ error: err.message || 'Failed to load performance review' });
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
    return res.status(500).json({ error: err.message || 'Failed to start reattempt' });
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
    return res.status(500).json({ error: err.message || 'Failed to load weak topics' });
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
    return res.status(500).json({ error: err.message || 'Failed to merge guest data' });
  }
});

router.post('/exam/from-topic', async (req: IdentifiedRequest, res: Response) => {
  try {
    const { topic } = req.body as { topic?: string };
    if (!topic) return res.status(400).json({ error: 'No topic provided' });
    const branch = await getFixedBranch(req);
    const docId = 'topic_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const prevAttempt = await (Attempt as any).findOne({
      ownerId: req.ownerId, ownerType: req.ownerType, subject: topic, docId: { $regex: '^topic_' },
    }).sort({ createdAt: -1 });
    const wrongFromLast = (prevAttempt?.questions || []).filter((q: any) => !q.isCorrect).slice(0, 5)
      .map((q: any) => ({ question: q.question, options: q.options, correctAnswer: q.correctAnswer, topic: q.topic }));
    const newCount = 10 - wrongFromLast.length;
    const avoid = wrongFromLast.length ? ` Do not repeat these: ${wrongFromLast.map((q: any) => q.question).join(' | ')}` : '';
    const fresh = await generateJson<any[]>(
      `Create ${newCount} MCQs on "${topic}" in ${branch || 'the student field'}.${avoid} Return ONLY JSON array with question, options[4], correctAnswer and topic.`
    );
    return res.json({ success: true, docId, branch: branch || null, subject: topic, questions: [...wrongFromLast, ...fresh] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate practice set' });
  }
});

export default router;
