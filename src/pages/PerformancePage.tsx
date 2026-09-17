import React, { useEffect, useState } from 'react';
import { ownerHeaders } from '../lib/ownerAuth';
import { Share2 } from 'lucide-react';

interface WrongQuestion {
  question: string;
  options?: string[];
  correctAnswer: string;
  userAnswer?: string;
  topic?: string;
  note?: string;
}

interface Suggestion {
  topic: string;
  personal: number;
  branchWide: number;
}

export function PerformancePage({
  attemptId,
  onReattempt,
  onUploadNew,
}: {
  attemptId: string;
  onReattempt: (reattempt: { docId: string; branch: string; subject: string; parentAttemptId: string; questions: any[] }) => void;
  onUploadNew: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [subject, setSubject] = useState('');
  const [wrong, setWrong] = useState<WrongQuestion[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [reattemptLoading, setReattemptLoading] = useState(false);

  async function handleShare() {
    const percent = total ? Math.round((score / total) * 100) : 0;
    const text = subject
      ? `I scored ${percent}% (${score}/${total}) on ${subject} — practice with Study Planner AI!`
      : `I scored ${percent}% (${score}/${total}) — practice with Study Planner AI!`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    }
  }

  useEffect(() => {
    load();
    fetch('/api/core/suggestions', { headers: ownerHeaders() })
      .then((r) => r.json())
      .then((d) => setSuggestions(d.suggestions || []))
      .catch(() => {});
  }, [attemptId]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/core/attempts/${attemptId}`, { headers: ownerHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load performance review');
      setScore(data.score);
      setTotal(data.total);
      setSubject(data.subject || '');
      setWrong(data.wrongQuestions || []);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleReattempt() {
    setReattemptLoading(true);
    try {
      const res = await fetch(`/api/core/attempts/${attemptId}/reattempt`, {
        method: 'POST',
        headers: ownerHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start reattempt');
      onReattempt(data);
    } catch (err: any) {
      setError(err.message || 'Failed to start reattempt');
    } finally {
      setReattemptLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-white flex items-center justify-center">
        <p className="text-slate-700 animate-pulse">Loading your performance review…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-white flex flex-col md:flex-row">
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">Performance Review</h1>
        <div className="flex flex-col items-center py-6 mb-6 border-b border-slate-200">
          <div className="relative w-28 h-28 mb-3">
            <svg className="w-full h-full -rotate-90">
              <circle cx="56" cy="56" r="48" strokeWidth="8" fill="none" stroke="currentColor" className="text-slate-800" />
              <circle
                cx="56" cy="56" r="48" strokeWidth="8" fill="none" stroke="currentColor"
                strokeDasharray={2 * Math.PI * 48}
                strokeDashoffset={2 * Math.PI * 48 * (1 - (total ? score / total : 0))}
                strokeLinecap="round"
                className="text-indigo-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-2xl font-semibold">
              {total ? Math.round((score / total) * 100) : 0}%
            </div>
          </div>
          <p className="text-slate-600 text-sm">{score} of {total} correct</p>
          <button
            onClick={handleShare}
            className="mt-3 flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-800 rounded-full px-4 py-1.5"
          >
            <Share2 size={14} /> Share
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {wrong.length === 0 ? (
          <div className="border border-emerald-800 bg-emerald-900/20 rounded-xl px-4 py-6 text-center">
            <p className="text-emerald-300 font-medium">No wrong answers — nice work.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Wrong Questions ({wrong.length})</h2>
              <button
                onClick={handleReattempt}
                disabled={reattemptLoading}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-sm"
              >
                {reattemptLoading ? 'Preparing…' : 'Reattempt All'}
              </button>
            </div>

            <div className="space-y-4">
              {wrong.map((q, i) => (
                <div key={i} className="border border-slate-200 rounded-xl px-4 py-4 bg-slate-50/50">
                  <p className="font-medium mb-2">{q.question}</p>
                  <p className="text-sm text-red-400 mb-1">Your answer: {q.userAnswer || '(none)'}</p>
                  <p className="text-sm text-emerald-400 mb-3">Correct answer: {q.correctAnswer}</p>
                  {q.note && (
                    <div className="bg-white/60 border border-slate-200 rounded-lg px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Notes</p>
                      <p className="text-sm text-slate-700">{q.note}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <button onClick={onUploadNew} className="w-full mt-8 border border-slate-300 hover:border-slate-500 rounded-lg py-2 text-sm">
          Upload Another PDF
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="md:w-72 bg-slate-50/60 border-t md:border-t-0 md:border-l border-slate-200 px-5 py-8">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Suggested for you</h3>
          <ul className="space-y-2">
            {suggestions.map((s) => (
              <li key={s.topic} className="text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-2">
                {s.topic}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
