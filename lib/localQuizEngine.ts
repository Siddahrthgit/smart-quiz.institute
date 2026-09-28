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
  // Technical study material can be numeric-heavy (RCC, hydraulics,
  // surveying, specifications, etc.). Do not discard valid content merely
  // because it contains many numbers.
  return false;
}

function sentences(text: string) {
  const t = clean(text).replace(/([A-Za-z])[-–]\s*\n\s*([A-Za-z])/g, '$1$2');
  const lines = t.replace(/\r/g, '\n')
    .split(/\n+/)
    .map(s => s.trim().replace(/^[-•*▪◦]\s*/, ''))
    .filter(Boolean);

  const isHardHeading = (s: string) =>
    /^(?:chapter|section|unit|contents|references|bibliography)\b/i.test(s) ||
    /^(?:figure|fig\.?|table)\s*\d+/i.test(s) ||
    /^(?:page|slide)\s*\d+/i.test(s);

  const logical: string[] = [];
  let buffer = '';

  for (const line of lines) {
    if (!buffer) {
      buffer = line;
      continue;
    }

    const previousEndsSentence = /[.!?]["')\]]?$/.test(buffer.trim());
    const lineLooksLikeHeading =
      isHardHeading(line) ||
      (/^[A-Z][A-Za-z0-9 &/(),-]{1,70}$/.test(line) && line.split(/\s+/).length <= 9);

    // PDF extraction often puts one sentence/paragraph across many lines.
    const shouldJoin =
      !lineLooksLikeHeading &&
      (!previousEndsSentence || buffer.length < 180 || /^[a-z(0-9]/.test(line) || line.length < 90);

    if (shouldJoin) buffer += ' ' + line;
    else {
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
    const wordCount = s.split(/\s+/).length;
    return s.length >= 25 && s.length <= 500 && alpha >= 12 &&
      wordCount >= 5 && !isPdfArtifact(s);
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
function makeDefinitionQuestion(fact: {subject:string; answer:string; source?:string; topic?:string}, answerPool: string[], i: number): LocalQuestion | null {
  const rawSubject = shorten(fact.subject, 90);
  const subject = rawSubject.replace(/[?]+$/, '').trim();
  let question = '';

  if (/^How are /i.test(subject)) question = subject.endsWith('?') ? subject : subject + '?';
  else if (/^What is /i.test(subject)) question = subject.endsWith('?') ? subject : subject + '?';
  else if (/^How many /i.test(subject)) question = subject.endsWith('?') ? subject : subject + '?';
  else question = 'What is ' + subject + '?';

  const answer = shorten(fact.answer, 210);
  if (!answer || !validAnswerForQuestion(answer)) return null;

  const distractors = shuffled(
    uniqueStrings(answerPool.filter(x => x !== answer).map(x => shorten(x, 210)))
      .filter(x => validAnswerForQuestion(x)),
    hash(fact.source || subject) + i
  ).slice(0, 3);

  if (distractors.length < 3) return null;

  return {
    id: 'local-def-' + i,
    question,
    options: shuffled([answer, ...distractors], hash(subject) + 19),
    correctAnswer: answer,
    topic: shorten(fact.topic || subject, 90),
    source: 'Uploaded material'
  };
}

function validAnswerForQuestion(value: string) {
  const v = value.replace(/\s+/g, ' ').trim();
  if (v.length < 2 || v.length > 240) return false;
  if (/^(?:which|what|where|when|how|there|and|or|but|of|to|for|with|from)\b/i.test(v)) return false;
  return /[A-Za-z]/.test(v);
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

  // Extract only complete, source-faithful facts. This is the important
  // boundary between PDF text extraction and question generation.
  const factRows = ss.map((s, i) => {
    const m = s.match(/^(.{3,90}?)\s+(?:is|are|means|refers to|consists of|includes|comprises|is defined as|are defined as|is known as|are known as|shall be|should be|must be)\s+(.{8,220})[.!?]?$/i);
    return m ? { subject: shorten(m[1],90), answer: shorten(m[2],210), source:s, i } : null;
  }).filter(Boolean) as {subject:string;answer:string;source:string;i:number}[];

  // Also recognize common lecture-note formats such as "Roadways: Roads, Highway..." and
  // "National Highway are designated by H...". These are study facts even when
  // they are not written as X is Y.
  const extraFacts: {subject:string; answer:string; source:string}[] = [];
  for (const s of ss) {
    let m = s.match(/^([A-Za-z][A-Za-z0-9 &/'()\/-]{2,80})\s*:\s*(.{3,300})$/);
    if (m && !/^(?:q|question|answer|note|example|eg)\b/i.test(m[1])) {
      extraFacts.push({subject: shorten(m[1], 90), answer: shorten(m[2], 210), source:s});
    }
    m = s.match(/^(.{3,100}?)\s+(?:are|is)\s+(?:designated|represented)\s+(?:by|as)\s+(.{3,200})[.!?]?$/i);
    if (m) extraFacts.push({subject: 'How are ' + shorten(m[1],70) + ' designated?', answer: shorten(m[2],210), source:s});
    m = s.match(/^(.{8,180}?)\s+is\s+known\s+as\s+(.{2,100})[.!?]?$/i);
    if (m) extraFacts.push({subject: 'What is ' + shorten(m[1],80) + '?', answer: shorten(m[2],210), source:s});
  }
  const combinedRows = [
    ...factRows.map(f => ({ subject:f.subject, answer:f.answer, source:f.source, i:f.i })),
    ...extraFacts.map((f,i) => ({ subject:f.subject, answer:f.answer, source:f.source, i:10000+i }))
  ];
  const facts = uniqueStrings(combinedRows.map(f => f.subject + '|||' + f.answer)).map(k => {
    const p=k.split('|||');
    return combinedRows.find(f=>f.subject===p[0] && f.answer===p[1])!;
  });

  const freq = new Map<string, number>();
  for (const w of words(text)) freq.set(w, (freq.get(w)||0)+1);
  const topics = [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10)
    .map(([w])=>w.charAt(0).toUpperCase()+w.slice(1));

  // Library/Notes contains facts with their answers, not raw PDF fragments.
  const notes = facts.slice(0,24).map(f => `${f.subject} — ${f.answer}`);

  // "Most Repeated Questions" means the most important exam-relevant
  // questions/facts from the uploaded material. It is NOT a raw word-frequency list.
  const repeated = facts
    .slice()
    .sort((a, b) => {
      const aScore = /\b(?:known as|defined as|designated|represented|fastest|cheapest|door-to-door|types?|mode|highway|road)\b/i.test(a.source) ? 2 : 1;
      const bScore = /\b(?:known as|defined as|designated|represented|fastest|cheapest|door-to-door|types?|mode|highway|road)\b/i.test(b.source) ? 2 : 1;
      return bScore - aScore;
    })
    .slice(0, 20)
    .map(f => ({
      phrase: f.subject + ' — ' + f.answer,
      count: /\b(?:known as|defined as|designated|represented|fastest|cheapest|door-to-door|types?|mode|highway|road)\b/i.test(f.source) ? 2 : 1
    }));

  const answerPool = uniqueStrings(facts.map(f=>f.answer));
  const numberPool = uniqueStrings((text.match(/\b\.+(?:\.\.+)?(?:\s*%|\s*(?:mm|cm|m|km|N|kN|Pa|kPa|MPa|GPa|kg|kg\.m3|m3\.s|°C|days?|years?))?\b/gi)||[]));

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

  // 1) Definition/fact questions first.
  facts.forEach((f,i)=>add(makeDefinitionQuestion(f, answerPool, i+1)));

  // 2) Numeric facts such as 1028 km and construction years.
  ss.forEach((s,i)=>{ if(questions.length<target) add(makeNumericQuestion(s,numberPool,i+1)); });

  // 3) Complete source statements only. Never turn orphan headings/fragments
  // into questions.
  ss.forEach((s,i)=>{ if(questions.length<target) add(makeTrueFalseQuestion(s,i+1)); });

  return {
    subject: topics.slice(0,2).join(' & ') || 'Uploaded Study Material',
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
