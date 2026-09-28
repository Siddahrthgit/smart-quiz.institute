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

function sentences(text: string) {
  const t = clean(text).replace(/\n+/g, ' ');
  return t
    .split(/(?<=[.!?])\s+|(?<=:)\s+(?=[A-Z0-9])/)
    .map(s => s.trim().replace(/^[-•*]\s*/, ''))
    .filter(s => s.length >= 30 && s.length <= 700);
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

function makeDefinitionQuestion(sentence: string, answerPool: string[], i: number): LocalQuestion | null {
  const m = sentence.match(/^(.{3,100}?)\s+(?:is|are|means|refers to|consists of|includes|is defined as|are defined as|shall be|should be|must be)\s+(.{5,300})[.!?]?$/i);
  if (!m) return null;

  const subject = shorten(m[1], 100);
  const answer = shorten(m[2], 180);
  const distractors = shuffled(
    uniqueStrings(answerPool.filter(x => x !== answer && x.length >= 5)),
    hash(sentence)
  ).slice(0, 3);

  if (distractors.length < 3) return null;

  const options = shuffled([answer, ...distractors], hash(sentence) + 17);
  return {
    id: 'local-def-' + i,
    question: `According to the uploaded material, what is the correct description of "${subject}"?`,
    options,
    correctAnswer: answer,
    topic: topicFrom(sentence),
    source: 'Uploaded material'
  };
}

function makeNumericQuestion(sentence: string, numberPool: string[], i: number): LocalQuestion | null {
  const numbers = sentence.match(/\b\d+(?:\.\d+)?(?:\s*%|\s*(?:mm|cm|m|km|N|kN|Pa|kPa|MPa|GPa|kg|kg\/m3|m3\/s|°C|days?|years?))?\b/gi);
  if (!numbers || numbers.length === 0) return null;

  const target = numbers[0];
  const alternatives = shuffled(
    uniqueStrings(numberPool.filter(x => x !== target)),
    hash(sentence) + 31
  ).slice(0, 3);
  if (alternatives.length < 3) return null;

  const redacted = sentence.replace(target, '_____');
  const options = shuffled([target, ...alternatives], hash(sentence) + 41);
  return {
    id: 'local-num-' + i,
    question: `According to the uploaded material, which value correctly completes this statement? "${shorten(redacted, 210)}"`,
    options,
    correctAnswer: target,
    topic: topicFrom(sentence),
    source: 'Uploaded material'
  };
}

function makeTrueFalseQuestion(sentence: string, i: number): LocalQuestion {
  const statement = shorten(sentence, 260);
  return {
    id: 'local-tf-' + i,
    question: `According to the uploaded material, is this statement true or false? "${statement}"`,
    options: ['True', 'False'],
    correctAnswer: 'True',
    topic: topicFrom(sentence),
    source: 'Uploaded material'
  };
}

function makeGenericMcq(sentence: string, pool: string[], i: number): LocalQuestion | null {
  const correct = shorten(sentence, 180);
  const distractors = shuffled(
    uniqueStrings(pool.filter(x => x !== sentence && x.length >= 30).map(shorten)),
    hash(sentence) + 59
  ).slice(0, 3);
  if (distractors.length < 3) return null;

  const options = shuffled([correct, ...distractors], hash(sentence) + 67);
  return {
    id: 'local-fact-' + i,
    question: 'Which statement is supported by the uploaded material?',
    options,
    correctAnswer: correct,
    topic: topicFrom(sentence),
    source: 'Uploaded material'
  };
}

export function analyzeLocalText(text: string, count = 10): LocalAnalysis {
  const ss = sentences(text);
  const freq = new Map<string, number>();
  for (const w of words(text)) freq.set(w, (freq.get(w) || 0) + 1);

  const topWords = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .map(([word]) => word);

  const topics = uniqueStrings(topWords.slice(0, 8).map(w => w.charAt(0).toUpperCase() + w.slice(1)));

  const notes = ss.slice(0, 24).map(s => shorten(s, 260));

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
  const target = Math.max(0, Math.min(count, 30));

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

  // Then use factual True/False questions. This guarantees useful questions
  // even when a PDF has no definition-style sentences.
  ss.forEach((s, idx) => {
    if (questions.length >= target) return;
    add(makeTrueFalseQuestion(s, idx + 1));
  });

  // Finally use statement-based MCQs when enough distinct source sentences exist.
  ss.forEach((s, idx) => {
    if (questions.length >= target) return;
    add(makeGenericMcq(s, ss, idx + 1));
  });

  // If the PDF has only a few usable statements, repeat the source facts
  // with different question IDs rather than returning an empty exam.
  // This is intentionally conservative: every answer is still taken
  // directly from the uploaded material.
  if (questions.length < target && ss.length) {
    for (let round = 1; questions.length < target && round <= 3; round++) {
      ss.forEach((s, idx) => {
        if (questions.length >= target) return;
        const base = makeTrueFalseQuestion(s, round * 1000 + idx + 1);
        add({
          ...base,
          id: base.id + '-r' + round,
          question: round === 1
            ? base.question
            : `Based on the uploaded material, which statement is correct? "${shorten(s, 260)}"`
        });
      });
    }
  }

  return {
    subject: topics.slice(0, 2).join(' & ') || 'Uploaded Study Material',
    topics,
    notes,
    repeated,
    questions
  };
}

export function generateLocalQuestions(text: string, count = 10) {
  return analyzeLocalText(text, count).questions;
}

export function generateLocalNotes(text: string) {
  const analysis = analyzeLocalText(text, 0);
  return analysis.notes;
}

export function findLocalRepeated(text: string) {
  return analyzeLocalText(text, 0).repeated;
}
