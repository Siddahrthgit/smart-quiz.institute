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
  note?: string;
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

  async function handleRetrySet(topic: string) {
    setError('');
    setPhase('analyzing');
    try {
      const res = await fetch('/api/core/exam/from-topic', {
        method: 'POST',
        headers: { ...ownerHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate practice set');
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

  if (phase === 'upload') {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-16">
          <div className="text-center mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Upload your PDF</h1>
            <p className="text-slate-400 text-sm sm:text-base">
              We'll read it, work out your subject, and build your exam automatically.
            </p>
          </div>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl py-14 sm:py-20 cursor-pointer transition-colors text-center"
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
          {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
          <SuggestionsList suggestions={suggestions} onRetry={handleRetrySet} />
        </div>
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

  // exam phase - all questions on one page, no pagination
  const answeredCount = Object.keys(answers).length;

  function handleFinishClick() {
    const firstUnanswered = questions.findIndex((_, i) => !answers[i]);
    if (firstUnanswered !== -1) {
      setError(`Question ${firstUnanswered + 1} is unanswered`);
      document.getElementById(`q-${firstUnanswered}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setError(null);
    handleSubmitExam();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-28">
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <p className="text-sm text-slate-400 max-w-2xl lg:max-w-3xl mx-auto">
          {subject} · {answeredCount} of {questions.length} answered
        </p>
      </div>

      <div className="max-w-2xl lg:max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 space-y-10">
        {questions.map((q, i) => (
          <div key={i} id={`q-${i}`} className="scroll-mt-20">
            <p className="text-slate-500 text-sm mb-1">Question {i + 1} of {questions.length}</p>
            <h2 className="text-lg font-semibold mb-4">{q.question}</h2>
            <div className="space-y-2">
              {q.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAnswers({ ...answers, [i]: opt })}
                  className={`w-full text-left px-4 py-3 rounded-lg border ${
                    answers[i] === opt
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-slate-950/95 backdrop-blur border-t border-slate-800 px-4 py-3">
        <button
          onClick={handleFinishClick}
          disabled={phase === 'submitting'}
          className="max-w-2xl lg:max-w-3xl mx-auto w-full block rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 font-semibold py-3"
        >
          {phase === 'submitting' ? 'Submitting…' : `Finish Exam (${answeredCount}/${questions.length})`}
        </button>
      </div>
    </div>
  );
}

function SuggestionsList({ suggestions, onRetry }: { suggestions: Suggestion[]; onRetry: (topic: string) => void }) {
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  if (suggestions.length === 0) return null;
  return (
    <div className="mt-12">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">Suggested for you</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {suggestions.map((s) => (
          <div key={s.topic} className="border border-slate-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenTopic(openTopic === s.topic ? null : s.topic)}
              className="w-full text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-900 hover:text-white flex items-center justify-between gap-2"
            >
              {s.topic}
              <span className="text-slate-500 text-xs">{openTopic === s.topic ? '−' : '+'}</span>
            </button>
            {openTopic === s.topic && (
              <div className="px-3 pb-3 border-t border-slate-800 pt-2">
                {s.note && <p className="text-xs text-slate-500 mb-2">{s.note}</p>}
                <button
                  onClick={() => onRetry(s.topic)}
                  className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium py-2"
                >
                  Retry set
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
