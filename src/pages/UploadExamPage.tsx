import React, { useEffect, useRef, useState } from 'react';
import { ownerHeaders } from '../lib/ownerAuth';

interface CoreQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  topic?: string;
}

interface Suggestion {
  topic: string;
  personal: number;
  branchWide: number;
}

type Phase = 'upload' | 'analyzing' | 'exam' | 'submitting';

export function UploadExamPage({
  onFinished,
  reattempt,
}: {
  onFinished: (attemptId: string) => void;
  // if set, skip upload and go straight into an exam built from a prior attempt's wrong questions
  reattempt?: { docId: string; branch: string; subject: string; parentAttemptId: string; questions: CoreQuestion[] } | null;
}) {
  const [phase, setPhase] = useState<Phase>(reattempt ? 'exam' : 'upload');
  const [error, setError] = useState('');
  const [docId, setDocId] = useState('');
  const [branch, setBranch] = useState('');
  const [subject, setSubject] = useState('');
  const [questions, setQuestions] = useState<CoreQuestion[]>(reattempt?.questions || []);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [current, setCurrent] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/core/suggestions', { headers: ownerHeaders() })
      .then((r) => r.json())
      .then((d) => setSuggestions(d.suggestions || []))
      .catch(() => {});
    if (reattempt) {
      setDocId(reattempt.docId);
      setBranch(reattempt.branch);
      setSubject(reattempt.subject);
    }
  }, []);

  async function handleFile(file: File) {
    setError('');
    setPhase('analyzing');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/core/upload-and-analyze', {
        method: 'POST',
        headers: ownerHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze PDF');
      setDocId(data.docId);
      setBranch(data.branch);
      setSubject(data.subject);
      setQuestions(data.questions);
      setAnswers({});
      setCurrent(0);
      setPhase('exam');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setPhase('upload');
    }
  }

  async function handleSubmitExam() {
    setPhase('submitting');
    try {
      const payload = {
        docId,
        branch,
        subject,
        source: reattempt ? 'reattempt' : 'exam',
        parentAttemptId: reattempt?.parentAttemptId,
        questions: questions.map((q, i) => ({ ...q, userAnswer: answers[i] || '' })),
      };
      const res = await fetch('/api/core/exam/submit', {
        method: 'POST',
        headers: { ...ownerHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit exam');
      onFinished(data.attemptId);
    } catch (err: any) {
      setError(err.message || 'Failed to submit exam');
      setPhase('exam');
    }
  }

  if (phase === 'upload') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row">
        <div className="flex-1 flex flex-col items-center px-4 pt-16 pb-10">
          <div className="w-full max-w-md text-center">
            <h1 className="text-2xl font-bold mb-2">Upload your PDF</h1>
            <p className="text-slate-400 text-sm mb-6">
              We'll read it, work out your subject, and build your exam automatically.
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl py-14 cursor-pointer transition-colors"
            >
              <p className="text-slate-300">Tap to choose a PDF</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          </div>
        </div>
        <SuggestionsPanel suggestions={suggestions} />
      </div>
    );
  }

  if (phase === 'analyzing') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-300 animate-pulse">Reading your PDF and building your exam…</p>
      </div>
    );
  }

  // exam phase - no answers, no correctness, no suggestions shown here
  const q = questions[current];
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="max-w-xl mx-auto w-full px-4 py-8 flex-1">
        <p className="text-slate-500 text-sm mb-1">
          {subject} · Question {current + 1} of {questions.length}
        </p>
        <h2 className="text-lg font-semibold mb-5">{q.question}</h2>
        <div className="space-y-2">
          {q.options.map((opt) => (
            <button
              key={opt}
              onClick={() => setAnswers({ ...answers, [current]: opt })}
              className={`w-full text-left px-4 py-3 rounded-lg border ${
                answers[current] === opt
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-800 bg-slate-900 hover:border-slate-600'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex justify-between mt-8">
          <button
            disabled={current === 0}
            onClick={() => setCurrent(current - 1)}
            className="px-4 py-2 rounded-lg border border-slate-800 disabled:opacity-40"
          >
            Back
          </button>
          {current < questions.length - 1 ? (
            <button
              onClick={() => setCurrent(current + 1)}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmitExam}
              disabled={phase === 'submitting'}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
            >
              {phase === 'submitting' ? 'Submitting…' : 'Finish Exam'}
            </button>
          )}
        </div>
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      </div>
    </div>
  );
}

function SuggestionsPanel({ suggestions }: { suggestions: Suggestion[] }) {
  if (suggestions.length === 0) return <div className="hidden md:block md:w-72" />;
  return (
    <div className="md:w-72 bg-slate-900/60 border-t md:border-t-0 md:border-l border-slate-800 px-5 py-8">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">Suggested for you</h3>
      <ul className="space-y-2">
        {suggestions.map((s) => (
          <li key={s.topic} className="text-sm text-slate-400 border border-slate-800 rounded-lg px-3 py-2">
            {s.topic}
          </li>
        ))}
      </ul>
    </div>
  );
}
