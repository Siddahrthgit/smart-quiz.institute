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

type Phase = 'upload' | 'analyzing' | 'menu' | 'exam' | 'submitting';

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
  const [notesForDoc, setNotesForDoc] = useState<any | null>(null);
  const [generatedQuestionsPreview, setGeneratedQuestionsPreview] = useState<any[] | null>(null);
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
      // instead of jumping straight into the exam, show the post-upload menu
      setPhase('menu');
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

  async function handleGenerateNotes() {
    setError('');
    if (!docId) return setError('No document selected');
    try {
      const res = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: { ...ownerHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate notes');
      setNotesForDoc(data.notes || data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate notes');
    }
  }

  async function handleGenerateQuestions(count = 10) {
    setError('');
    if (!docId) return setError('No document selected');
    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { ...ownerHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId, numQuestions: count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate questions');
      // show a preview and allow the user to start the exam using these
      setGeneratedQuestionsPreview(data.questions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to generate questions');
    }
  }

  if (phase === 'upload') {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-16">
          <div className="text-center mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Upload your PDF</h1>
            <p className="text-slate-600 text-sm sm:text-base">
              We'll read it, work out your subject, and offer options: take an exam, generate notes, or practice weak topics.
            </p>
            <p className="text-xs text-slate-500 mt-2">Have perfect knowledge with studypdf.duckdns.org</p>
          </div>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl py-14 sm:py-20 cursor-pointer transition-colors text-center"
          >
            <p className="text-slate-700">Tap to choose a PDF</p>
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
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center">
        <p className="text-slate-700 animate-pulse">Reading your PDF and building your exam…</p>
      </div>
    );
  }

  if (phase === 'menu') {
    return (
      <div className="min-h-screen bg-white text-slate-900 pb-28">
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-12 space-y-6">
          <h2 className="text-xl font-semibold">Ready — what would you like to do?</h2>
          <p className="text-sm text-slate-600">Document: <strong>{subject || docId}</strong></p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setPhase('exam')}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3"
            >
              1) Take Exam
            </button>

            <button
              onClick={handleGenerateNotes}
              className="w-full rounded-lg border border-slate-200 hover:border-slate-400 py-3"
            >
              2) Study Notes
            </button>

            <button
              onClick={() => {
                // show branch suggestions as a quick way to surface repeated/weak topics
                fetch('/api/core/suggestions', { headers: ownerHeaders() })
                  .then((r) => r.json())
                  .then((d) => setSuggestions(d.suggestions || []))
                  .catch(() => setError('Failed to fetch repeated topics'));
              }}
              className="w-full rounded-lg border border-slate-200 hover:border-slate-400 py-3"
            >
              3) Search most repeated topics
            </button>

            <button
              onClick={() => handleGenerateQuestions(10)}
              className="w-full rounded-lg border border-slate-200 hover:border-slate-400 py-3"
            >
              4) Generate questions
            </button>

            <button
              onClick={() => setError('Complete an exam first to enable performance check / retry wrong questions')}
              className="w-full rounded-lg border border-slate-200 hover:border-slate-400 py-3"
            >
              5) Performance check — retry wrong questions
            </button>

            <button
              onClick={() => setError('You can rename suggested topics locally in the suggestions panel (non-persistent)')}
              className="w-full rounded-lg border border-slate-200 hover:border-slate-400 py-3"
            >
              6) Suggest rename topic to "Weak topic"
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {notesForDoc && (
            <div className="mt-6 border border-slate-200 rounded-lg p-4 bg-slate-50">
              <h3 className="text-sm font-semibold">Study Notes Preview</h3>
              <pre className="text-xs whitespace-pre-wrap mt-2">{JSON.stringify(notesForDoc, null, 2)}</pre>
            </div>
          )}

          {generatedQuestionsPreview && generatedQuestionsPreview.length > 0 && (
            <div className="mt-6 border border-slate-200 rounded-lg p-4 bg-slate-50">
              <h3 className="text-sm font-semibold">Generated Questions Preview</h3>
              <p className="text-xs text-slate-600">You can start the exam with these generated questions.</p>
              <div className="mt-3 space-y-2">
                {generatedQuestionsPreview.slice(0, 5).map((q, i) => (
                  <div key={i} className="text-xs border-t pt-2">{q.question}</div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setQuestions(generatedQuestionsPreview as any);
                    setAnswers({});
                    setPhase('exam');
                  }}
                  className="rounded-lg bg-indigo-600 text-white px-3 py-2 text-sm"
                >
                  Start Exam with generated questions
                </button>
                <button
                  onClick={() => setGeneratedQuestionsPreview(null)}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <SuggestionsList suggestions={suggestions} onRetry={handleRetrySet} />
        </div>
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
    setError(null as any);
    handleSubmitExam();
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-28">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3">
        <p className="text-sm text-slate-600 max-w-2xl lg:max-w-3xl mx-auto">
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
                      : 'border-slate-200 bg-slate-50 hover:border-slate-400'
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

      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3">
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
  const [localRename, setLocalRename] = useState<Record<string, string>>({});
  if (suggestions.length === 0) return null;
  return (
    <div className="mt-12">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Weak topic suggestions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {suggestions.map((s) => (
          <div key={s.topic} className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenTopic(openTopic === s.topic ? null : s.topic)}
              className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-between gap-2"
            >
              {localRename[s.topic] || s.topic}
              <span className="text-slate-500 text-xs">{openTopic === s.topic ? '−' : '+'}</span>
            </button>
            {openTopic === s.topic && (
              <div className="px-3 pb-3 border-t border-slate-200 pt-2">
                {s.note && <p className="text-xs text-slate-500 mb-2">{s.note}</p>}
                <div className="space-y-2">
                  <button
                    onClick={() => onRetry(s.topic)}
                    className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium py-2"
                  >
                    Retry set
                  </button>
                  <div className="flex gap-2">
                    <input
                      placeholder='Rename to "Weak topic"'
                      className="flex-1 text-xs border rounded px-2 py-1"
                      onChange={(e) => setLocalRename((r) => ({ ...r, [s.topic]: e.target.value }))}
                    />
                    <button
                      onClick={() => setLocalRename((r) => ({ ...r, [s.topic]: 'Weak topic' }))}
                      className="rounded px-2 bg-slate-100 text-xs"
                    >
                      Suggest "Weak topic"
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
