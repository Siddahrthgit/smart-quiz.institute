export interface LocalQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  topic: string;
  source?: string;
}

export interface LocalAnalysis {
  subject: string;
  topics: string[];
  notes: string[];
  repeated: { phrase: string; count: number }[];
  questions: LocalQuestion[];
}

const STOP = new Set([
  'the','and','for','with','that','this','from','are','was','were','which','shall','will',
  'into','than','then','have','has','had','not','but','can','may','its','their','there',
  'where','when','what','how','who','been','being','also','using','used','such','more',
  'less','each','other','these','those','about','between','through','under','over',
  'per','one','two','three','four','five','six','seven','eight','nine','ten','section',
  'chapter','figure','table','page','www','http','https'
]);

function clean(text: string) {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

function isPdfArtifact(s: string) {
  const v = s.replace(/\s+/g, ' ').trim();
  if (/^(?:page|slide)?\s*[-–—]?\s*\d+\s*(?:of|\/)\s*\d+$/i.test(v)) return true;
  if (/^\d+\s*(?:of|\/)\s*\d+\s*[-–—]?/i.test(v)) return true;
  if (/^(?:thank you|www\.|https?:\/\/)/i.test(v)) return true;
  if (/^(?:prepared by|author\s*[:\-]|tutor\b|course\b)/i.test(v)) return true;
  if (/\b\d+\s+of\s+\d+\b/i.test(v) && v.length < 220) return true;
  const words = v.split(/\s+/);
  const numeric = (v.match(/\d+(?:\.\d+)?/g) || []).length;
  const alpha = (v.match(/[A-Za-z]/g) || []).length;
  if (numeric >= 2 && numeric > alpha / 4) return true;
  return false;
}

function sentences(text: string) {
  const t = clean(text);
  const lines = t.replace(/\r/g, '\n')
    .split(/\n+/)
    .map(s => s.trim().replace(/^[-•*▪◦]\s*/, ''))
    .filter(Boolean);

  const isHardHeading = (s: string) =>
    /^(?:chapter|section|unit|contents|references|bibliography)\b/i.test(s) ||
    /^(?:figure|fig\.?|table)\s*\d+/i.test(s) ||
    /^(?:page|slide)\s*\d+/i.test(s);

  const danglingEnd = (s: string) =>
    /(?:[:;,]|\b(?:the|a|an|of|for|from|after|before|and|or|but|with|by|to|in|on|as|than|that|which|is|are|was|were|calculated|multiplied|rate|per|similar|area|volume))$/i.test(s.trim());

  const logical: string[] = [];
  let buffer = '';

  for (const line of lines) {
    if (!buffer) {
      buffer = line;
      continue;
    }

    const shouldJoin =
      !isHardHeading(line) &&
      (
        danglingEnd(buffer) ||
        /^[a-z(]/.test(line) ||
        buffer.length < 70 ||
        line.length < 55
      );

    if (shouldJoin) {
      buffer += ' ' + line;
    } else {
      logical.push(buffer);
      buffer = line;
    }
  }
  if (buffer) logical.push(buffer);

  const raw = logical
    .flatMap(s => s.split(/(?<=[.!?])\s+/))
    .map(s => s.trim())
    .filter(Boolean);

  const expanded: string[] = [];
  for (const item of raw) {
    if (item.length <= 700) expanded.push(item);
    else expanded.push(...(item.match(/.{1,600}(?:\s+|$)/g) || []).map(x => x.trim()));
  }

  return uniqueStrings(expanded.filter(s => {
    const alpha = (s.match(/[A-Za-z]/g) || []).length;
    return s.length >= 35 && s.length <= 500 && alpha >= 20 &&
      s.split(/\s+/).length >= 6 && !isPdfArtifact(s);
  }));
}
function words(text: string) {
  return (text.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || [])
    .filter(w => !STOP.has(w));
}

function topicFrom(sentence: string) {
  const cleaned = sentence
    .replace(/[^A-Za-z0-9\s&/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const meaningful = cleaned.split(/\s+/).filter(w => !STOP.has(w.toLowerCase()));
  return (meaningful.slice(0, 5).join(' ') || 'General')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function shorten(value: string, max = 180) {
  const v = value.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  return v.length > max ? v.slice(0, max - 1).trimEnd() + '…' : v;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map(v => v.trim()).filter(Boolean))];
}

function shuffled<T>(items: T[], seed: number) {
  const a = [...items];
  let x = Math.abs(seed) + 1;
  for (let i = a.length - 1; i > 0; i--) {
    x = (x * 1664525 + 1013904223) >>> 0;
    const j = x % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function isStrongSourceSentence(sentence: string) {
  const v = sentence.replace(/\s+/g, ' ').trim();
  if (isPdfArtifact(v)) return false;
  if (/^(?:firstly|secondly|thirdly|then|next|note|data|required|prepared|author|chapter|section|figure|table|contents|introduction|conclusion)\b/i.test(v)) return false;
  if (/--|\.{3}|\b(?:prepared by|thank you)\b/i.test(v)) return false;
  const ws = v.split(/\s+/);
  const alpha = (v.match(/[A-Za-z]/g) || []).length;
  return ws.length >= 7 && alpha >= 25;
}

function isCompleteAnswer(value: string) {
  const v = value.replace(/\s+/g, ' ').trim();
  if (v.length < 20 || v.length > 240) return false;
  if (v.split(/\s+/).length < 4) return false;
  if (/^(?:and|or|but|than|because|therefore|which|that|of|to|for|with|from|then|next)\b/i.test(v)) return false;
  if (/--|\.{3}|\b(?:page|slide|prepared by|thank you)\b/i.test(v)) return false;
  return true;
}
function makeDefinitionQuestion(sentence: string, answerPool: string[], i: number): LocalQuestion | null {
  const m = sentence.match(/^(.{3,80}?)\s+(?:is|are|means|refers to|consists of|includes|is defined as|are defined as|shall be|should be|must be)\s+(.{5,180})[.!?]?$/i);
  if (!m) return null;

  const subject = shorten(m[1], 80);
  const answer = shorten(m[2], 160);
  if (/^(?:firstly|secondly|thirdly|then|next|note|data|required|prepared|author|chapter|section|figure|table)\b/i.test(subject)) return null;
  if (/\b(?:of\s+\d+|\d+\s+of\s+\d+|prepared by|thank you|estimating, costing|license examination)\b/i.test(sentence)) return null;
  if (!isCompleteAnswer(answer) || /\b1\/\d+th\b/i.test(answer)) return null;
  const distractors = shuffled(
    uniqueStrings(answerPool.filter(x =>
      x !== answer &&
      x.length >= 12 &&
      x.split(/\s+/).length >= 4 &&
      x.split(/\s+/).length <= 24 &&
      !/--|\.\.\.|\b(?:page|slide|prepared by|thank you|therefore)\b/i.test(x)
    )),
    hash(sentence)
  ).slice(0, 3);

  if (distractors.length < 3) return null;

  const options = shuffled([answer, ...distractors], hash(sentence) + 17);
  return {
    id: 'local-def-' + i,
    question: `What is the correct description of "${subject}"?`,
    options,
    correctAnswer: answer,
    topic: topicFrom(sentence),
    source: 'Uploaded material'
  };
}

function makeNumericQuestion(sentence: string, numberPool: string[], i: number): LocalQuestion | null {
  if (/\b(?:page|slide|of\s+\d+|\d+\s+of\s+\d+|prepared by|thank you|license examination)\b/i.test(sentence)) return null;
  const numbers = sentence.match(/\b\d+(?:\.\d+)?\s*(?:%|mm|cm|m|km|N|kN|Pa|kPa|MPa|GPa|kg|kg\/m3|m3\/s|°C|days?|years?)\b/gi);
  if (!numbers || numbers.length === 0) return null;

  const target = numbers[0];
  const alternatives = shuffled(
    uniqueStrings(numberPool.filter(x => x !== target)),
    hash(sentence) + 31
  ).slice(0, 3);
  if (alternatives.length < 3) return null;

  if (!/[A-Za-z]{3,}/.test(target) || !/\s?(?:%|mm|cm|m|km|N|kN|Pa|kPa|MPa|GPa|kg|kg\/m3|m3\/s|°C|days?|years?)\b/i.test(target)) return null;
  const redacted = sentence.replace(target, '_____');
  if (redacted.split(/\s+/).length < 7 || /--|\.\.\.|\b(?:page|slide|prepared by|thank you)\b/i.test(redacted)) return null;
  const options = shuffled([target, ...alternatives], hash(sentence) + 41);
  return {
    id: 'local-num-' + i,
    question: `Which value correctly completes this statement? "${shorten(redacted, 210)}"`,
    options,
    correctAnswer: target,
    topic: topicFrom(sentence),
    source: 'Uploaded material'
  };
}

function makeTrueFalseQuestion(sentence: string, i: number): LocalQuestion | null {
  if (!isStrongSourceSentence(sentence)) return null;
  const statement = shorten(sentence, 260);
  return {
    id: 'local-tf-' + i,
    question: `Is this statement true or false? "${statement}"`,
    options: ['True', 'False'],
    correctAnswer: 'True',
    topic: topicFrom(sentence),
    source: 'Uploaded material'
  };
}

function makeGenericMcq(sentence: string, pool: string[], i: number): LocalQuestion | null {
  if (!isStrongSourceSentence(sentence)) return null;
  const correct = shorten(sentence, 220);
  const candidates = uniqueStrings(pool.filter(x => x !== sentence && x.length >= 25).map(x => shorten(x, 220)));
  const distractors = shuffled(candidates, hash(sentence) + 59).slice(0, 3);
  if (distractors.length < 3) return null;
  const options = shuffled([correct, ...distractors], hash(sentence) + 67);
  return {
    id: 'local-fact-' + i,
    question: 'Which statement is directly supported by the uploaded material?',
    options,
    correctAnswer: correct,
    topic: topicFrom(sentence),
    source: 'Uploaded material'
  };
}

function makeCompletionQuestion(sentence: string, pool: string[], i: number): LocalQuestion | null {
  if (isPdfArtifact(sentence)) return null;
  const cleaned = shorten(sentence, 240);
  const ws = cleaned.split(/\s+/);
  if (ws.length < 7) return null;

  // Hide a meaningful middle phrase. The correct option is always the
  // original phrase, while distractors come from other source sentences.
  const start = Math.max(2, Math.floor(ws.length * 0.35));
  const len = Math.max(2, Math.min(6, Math.floor(ws.length * 0.25)));
  const hidden = ws.slice(start, start + len).join(' ');
  if (hidden.length < 5) return null;

  const stem = [...ws.slice(0, start), '_____', ...ws.slice(start + len)].join(' ');
  const distractors = shuffled(
    uniqueStrings(pool.filter(x => x !== sentence).map(x => {
      const p = x.split(/\s+/);
      return p.slice(0, Math.min(6, p.length)).join(' ');
    })).filter(x => x.length >= 5 && x !== hidden),
    hash(sentence) + 101
  ).slice(0, 3);

  if (distractors.length < 3) return null;
  const answer = hidden;
  return {
    id: 'local-complete-' + i,
    question: `Complete the statement: "${shorten(stem, 260)}"`,
    options: shuffled([answer, ...distractors], hash(sentence) + 103),
    correctAnswer: answer,
    topic: topicFrom(sentence),
    source: 'Uploaded material'
  };
}

export function analyzeLocalText(text: string, count = 20): LocalAnalysis {
  const ss = sentences(text);
  const freq = new Map<string, number>();
  for (const w of words(text)) freq.set(w, (freq.get(w) || 0) + 1);

  const topWords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .map(([word]) => word);

  const topics = uniqueStrings(topWords.slice(0, 8).map(w => w.charAt(0).toUpperCase() + w.slice(1)));

  const notes = ss
    .filter(s => isStrongSourceSentence(s) || /^(?:specifications|estimation|valuation|rate analysis|plinth area|cube rate|quantity surveying|bill of quantities|abstract of cost)\b/i.test(s))
    .slice(0, 24)
    .map(s => shorten(s, 300));

  const phraseFreq = new Map<string, number>();
  for (let i = 0; i < ss.length; i++) {
    const ws = words(ss[i]);
    for (let j = 0; j < ws.length - 1; j++) {
      const phrase = ws[j] + ' ' + ws[j + 1];
      phraseFreq.set(phrase, (phraseFreq.get(phrase) || 0) + 1);
    }
  }
  const repeated = [...phraseFreq.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([phrase, count]) => ({ phrase, count }));

  const answerPool = uniqueStrings(
    ss.map(s => s.match(/(?:is|are|means|refers to|consists of|includes|is defined as|are defined as|shall be|should be|must be)\s+(.{5,300})[.!?]?$/i)?.[1] || '')
      .map(shorten)
  );

  const numberPool = uniqueStrings(
    (text.match(/\b\d+(?:\.\d+)?(?:\s*%|\s*(?:mm|cm|m|km|N|kN|Pa|kPa|MPa|GPa|kg|kg\/m3|m3\/s|°C|days?|years?))?\b/gi) || [])
  );

  const questions: LocalQuestion[] = [];
  const seen = new Set<string>();
  const target = Math.max(0, Math.min(count, 20));

  const add = (q: LocalQuestion | null) => {
    if (!q || questions.length >= target) return;
    const key = q.question.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    questions.push(q);
  };

  // Prefer high-confidence definition and numeric questions.
  ss.forEach((s, idx) => {
    if (questions.length >= target) return;
    add(makeDefinitionQuestion(s, answerPool, idx + 1));
    if (questions.length < target) add(makeNumericQuestion(s, numberPool, idx + 1));
  });

  // Completion questions work well with textbooks and technical PDFs
  // even when the extracted text has no "X is Y" definitions.
  ss.forEach((s, idx) => {
    if (questions.length >= target) return;
    add(makeCompletionQuestion(s, ss, idx + 1));
  });

  // Then use factual True/False questions.
  ss.forEach((s, idx) => {
    if (questions.length >= target) return;
    add(makeTrueFalseQuestion(s, idx + 1));
  });

  // Finally use statement-based MCQs when enough distinct source sentences exist.
  ss.forEach((s, idx) => {
    if (questions.length >= target) return;
    add(makeGenericMcq(s, ss, idx + 1));
  });


  return {
    subject: topics.slice(0, 2).join(' & ') || 'Uploaded Study Material',
    topics,
    notes,
    repeated,
    questions
  };
}

export function generateLocalQuestions(text: string, count = 20) {
  return analyzeLocalText(text, count).questions;
}

export function generateLocalNotes(text: string) {
  const analysis = analyzeLocalText(text, 0);
  return analysis.notes;
}

export function findLocalRepeated(text: string) {
  return analyzeLocalText(text, 0).repeated;
}
