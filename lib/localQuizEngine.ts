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
  const t = clean(text)
    .replace(/[•▪◦●◆]/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n');

  const rawLines = t.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const out: string[] = [];

  for (const raw of rawLines) {
    let line = raw
      .replace(/^[-–—*]\s*/, '')
      .replace(/^(?:[A-Ha-h]|[0-9]{1,2})[.)]\s+/, '')
      .trim();

    if (!line) continue;

    // Preserve "Term: answer". Split only obvious PDF dash separators.
    if (line.includes(' - ')) {
      const parts = line.split(/\s+-\s+/).map(x => x.trim()).filter(Boolean);
      if (parts.length > 1 && parts.every(x => x.length >= 8 && x.length <= 500)) {
        for (const p of parts) out.push(p);
        continue;
      }
    }
    out.push(line);
  }

  const expanded = out.flatMap(line =>
    line.split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/).map(x => x.trim()).filter(Boolean)
  );

  return uniqueStrings(expanded.filter(s => {
    const alpha = (s.match(/[A-Za-z]/g) || []).length;
    const wc = s.split(/\s+/).length;
    return s.length >= 12 && s.length <= 500 && alpha >= 8 && wc >= 3 && !isPdfArtifact(s);
  }));
}

function normalizeFactPart(value: string) {
  return value
    .replace(/^[\-–—:;,.\s]+/, '')
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '')
    .trim();
}

function extractFacts(ss: string[]) {
  const rows: { subject: string; answer: string; source: string }[] = [];

  for (const source of ss) {
    const s = source.replace(/\s+/g, ' ').trim();
    let m = s.match(/^(?:Q\d+[.)]\s*)?What is\s+(.+?)\s*:\s*(.+?)[?]?$/i);

    if (m) {
      const subject = normalizeFactPart(m[1]);
      const answer = normalizeFactPart(m[2]);
      if (subject.length >= 2 && answer.length >= 3) {
        rows.push({ subject, answer, source: s });
        continue;
      }
    }

    m = s.match(/^(.{2,100}?)\s*:\s*(.{3,320})$/);
    if (m && !/^(?:note|notes|answer|question|example|eg|figure|fig|table|chapter|section|page)\b/i.test(m[1].trim())) {
      const subject = normalizeFactPart(m[1]);
      const answer = normalizeFactPart(m[2]);
      if (subject.length >= 2 && answer.length >= 3) {
        rows.push({ subject, answer, source: s });
        continue;
      }
    }

    m = s.match(/^(.{2,100}?)\s+(?:is|are|means|refers to|consists of|includes|comprises|is defined as|are defined as|is known as|are known as)\s+(.{3,260})[.!?]?$/i);
    if (m) {
      const subject = normalizeFactPart(m[1]);
      const answer = normalizeFactPart(m[2]);
      if (subject.length >= 2 && answer.length >= 3) {
        rows.push({ subject, answer, source: s });
        continue;
      }
    }

    m = s.match(/^(.{2,100}?)\s+(?:are|is)\s+(?:designated|represented)\s+(?:by|as)\s+(.{2,220})[.!?]?$/i);
    if (m) {
      const subject = normalizeFactPart(m[1]);
      const answer = normalizeFactPart(m[2]);
      if (subject.length >= 2 && answer.length >= 2) {
        rows.push({ subject: 'How are ' + subject + ' designated?', answer, source: s });
      }
    }

    m = s.match(/^(.{3,120}?)\s+is\s+known\s+as\s+(.{2,180})[.!?]?$/i);
    if (m) {
      rows.push({
        subject: 'What is ' + normalizeFactPart(m[1]),
        answer: normalizeFactPart(m[2]),
        source: s
      });
    }
  }

  return rows.filter(f => {
    const a = f.answer;
    if (a.length < 3 || a.length > 240) return false;
    if (/^(?:essential|applicable|measured|calculated|found|prepared|equal to|called|a|an|the)\b/i.test(a)) return false;
    if (/^(?:and|or|but|which|that|of|to|for|with|from|then|next)\b/i.test(a)) return false;
    if (/--|\.{3}|\b(?:page|slide|prepared by|thank you)\b/i.test(a)) return false;
    return /[A-Za-z]{2,}/.test(a);
  });
}

function makeFactQuestion(fact: {subject:string; answer:string; source:string; topic?:string}, answerPool: string[], i: number): LocalQuestion | null {
  const subject = normalizeFactPart(fact.subject);
  const question = /^(?:How are|How many|What is)\b/i.test(subject)
    ? (subject.endsWith('?') ? subject : subject + '?')
    : 'What is ' + subject + '?';

  const answer = shorten(fact.answer, 210);
  if (!validAnswerForQuestion(answer)) return null;

  const distractors = shuffled(
    uniqueStrings(answerPool.filter(x => x !== fact.answer).map(x => shorten(x, 210)))
      .filter(x => validAnswerForQuestion(x)),
    hash(fact.source + subject) + i
  ).slice(0, 3);

  if (distractors.length < 3) return null;

  return {
    id: 'local-fact-' + i,
    question,
    options: shuffled([answer, ...distractors], hash(subject) + 17),
    correctAnswer: answer,
    topic: shorten(fact.topic || subject, 90),
    source: 'Uploaded material'
  };
}

function validAnswerForQuestion(value: string) {
  const v = value.replace(/\s+/g, ' ').trim();
  if (v.length < 3 || v.length > 240) return false;
  if (/^(?:which|what|where|when|how|there|and|or|but|of|to|for|with|from|then|next|essential|applicable|measured|calculated)\b/i.test(v)) return false;
  if (/--|\.{3}|\b(?:page|slide|prepared by|thank you)\b/i.test(v)) return false;
  return /[A-Za-z]/.test(v);
}

function topicFromFact(subject: string) {
  const s = subject.replace(/^What is\s+/i, '').replace(/^How are\s+/i, '');
  return topicFrom(s);
}

export function analyzeLocalText(text: string, count = 20): LocalAnalysis {
  const ss = sentences(text);
  const facts0 = extractFacts(ss);

  const seenFacts = new Set<string>();
  const facts = facts0.filter(f => {
    const key = (f.subject + '|' + f.answer).toLowerCase();
    if (seenFacts.has(key)) return false;
    seenFacts.add(key);
    return true;
  });

  const freq = new Map<string, number>();
  for (const w of words(text)) freq.set(w, (freq.get(w) || 0) + 1);
  const topics = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));

  const notes = facts.slice(0, 30).map(f => f.subject + ' — ' + f.answer);

  const counts = new Map<string, number>();
  for (const f of facts0) {
    const key = (f.subject + '|' + f.answer).toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const repeated = facts
    .map(f => ({
      phrase: f.subject + ' — ' + f.answer,
      count: counts.get((f.subject + '|' + f.answer).toLowerCase()) || 1
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const answerPool = uniqueStrings(facts.map(f => f.answer));
  const questions: LocalQuestion[] = [];
  const seenQuestions = new Set<string>();
  const target = Math.max(0, Math.min(Number(count) || 20, 20));

  facts.forEach((f, i) => {
    if (questions.length >= target) return;
    const q = makeFactQuestion(
      { ...f, topic: topicFromFact(f.subject) },
      answerPool,
      i + 1
    );
    if (!q) return;
    const key = q.question.toLowerCase();
    if (seenQuestions.has(key)) return;
    seenQuestions.add(key);
    questions.push(q);
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
  return analyzeLocalText(text, 0).notes;
}

export function findLocalRepeated(text: string) {
  return analyzeLocalText(text, 0).repeated;
}

