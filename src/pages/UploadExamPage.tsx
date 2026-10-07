import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  FileQuestion,
  FileText,
  FileUp,
  Library,
  ListChecks,
  Repeat2,
  Search,
  Sparkles,
  Target,
  Upload,
} from 'lucide-react';
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

type Phase = 'upload' | 'analyzing' | 'menu' | 'exam' | 'submitting';

export function UploadExamPage({
  onFinished,
  reattempt,
}: {
  onFinished: (attemptId: string) => void;
  reattempt?: {
    docId: string;
    branch: string;
    subject: string;
    parentAttemptId: string;
    questions: CoreQuestion[];
  } | null;
}) {
  const [phase, setPhase] = useState<Phase>(reattempt ? 'exam' : 'upload');
  const [error, setError] = useState('');
  const [docId, setDocId] = useState(reattempt?.docId || '');
  const [branch, setBranch] = useState(reattempt?.branch || '');
  const [subject, setSubject] = useState(reattempt?.subject || '');
  const [questions, setQuestions] = useState<CoreQuestion[]>(reattempt?.questions || []);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(() => localStorage.getItem('studypdf_branch') || 'General');
  const [notes, setNotes] = useState<any | null>(null);
  const [repeated, setRepeated] = useState<any | null>(null);
  const [generated, setGenerated] = useState<CoreQuestion[] | null>(null);
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

  async function action(action: 'notes' | 'repeated' | 'generate') {
    setError('');
    const res = await fetch('/api/core/material/action', {
      method: 'POST',
      headers: { ...ownerHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId, action }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Action failed');
    if (action === 'notes') setNotes(data.notes);
    if (action === 'repeated') setRepeated(data.repeated);
    if (action === 'generate') setGenerated(data.questions);
  }

  async function handleFile(file: File) {
    setError('');
    setPhase('analyzing');
    try {
      localStorage.setItem('studypdf_branch', selectedBranch);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('branch', selectedBranch);

      const res = await fetch('/api/core/upload-and-analyze', {
        method: 'POST',
        headers: ownerHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to analyze PDF');

      setDocId(data.docId);
      setBranch(data.branch || selectedBranch);
      setSubject(data.subject || selectedBranch);
      setQuestions(data.questions || []);
      setAnswers({});
      setPhase('menu');
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
      setPhase('upload');
    }
  }

  async function submit() {
    setPhase('submitting');
    try {
      const res = await fetch('/api/core/exam/submit', {
        method: 'POST',
        headers: { ...ownerHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId,
          branch,
          subject,
          source: reattempt ? 'reattempt' : 'exam',
          parentAttemptId: reattempt?.parentAttemptId,
          questions: questions.map((q, i) => ({ ...q, userAnswer: answers[i] || '' })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to submit exam');
      onFinished(data.attemptId);
    } catch (e: any) {
      setError(e.message || 'Failed to submit exam');
      setPhase('exam');
    }
  }

  async function retryTopic(topic: string) {
    setError('');
    setPhase('analyzing');
    try {
      const res = await fetch('/api/core/exam/from-topic', {
        method: 'POST',
        headers: { ...ownerHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to generate practice set');

      setDocId(data.docId);
      setBranch(data.branch || selectedBranch);
      setSubject(data.subject || topic);
      setQuestions(data.questions || []);
      setAnswers({});
      setPhase('exam');
    } catch (e: any) {
      setError(e.message || 'Failed');
      setPhase('menu');
    }
  }

  async function performance() {
    setError('');
    try {
      const res = await fetch('/api/core/attempts/latest', { headers: ownerHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed');
      if (!data.hasAttempt) {
        setError('Complete an exam first to check your performance and retry wrong questions.');
        return;
      }
      onFinished(data.attemptId);
    } catch (e: any) {
      setError(e.message || 'Failed');
    }
  }

  if (phase === 'upload') {
    const featureWords = [
      'Upload PDF',
      'Make notes on this topic',
      'Make exam session',
      'Help me find most popular questions',
      'Logic of topics',
      'Weak topics',
      'Practice what matters',
    ];

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10 text-slate-900">
        <div className="w-full max-w-4xl">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_55%)]" />

            <div className="relative z-10 p-6 sm:p-10">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  StudyPDF
                </div>
                <h1 className="mt-4 text-2xl font-black text-slate-900 sm:text-4xl">
                  Have perfect knowledge with studypdf.duckdns.org
                </h1>
                <p className="mt-3 text-sm text-slate-600 sm:text-base">
                  Turn your PDF into notes, exams, repeated questions, and weak-topic practice.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:p-7">
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-wrap items-center justify-center gap-2 px-4 text-center text-[clamp(0.8rem,2vw,1.5rem)] font-semibold tracking-wide text-slate-300/90">
                    {featureWords.map((feature, idx) => (
                      <span key={idx} className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 shadow-sm">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="relative z-10 space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex-1">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Branch / subject
                      </label>
                      <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none ring-0 transition focus:border-indigo-400"
                      >
                        <option value="General">General</option>
                        <option value="Science">Science</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Business">Business</option>
                        <option value="Medical">Medical</option>
                      </select>
                    </div>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group mt-4 cursor-pointer rounded-[22px] border border-dashed border-slate-300 bg-white p-6 text-center transition-all duration-200 hover:border-indigo-500 hover:bg-indigo-50/60"
                  >
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-sm transition group-hover:scale-105">
                      <Upload className="h-8 w-8" />
                    </div>
                    <p className="text-lg font-semibold text-slate-900">Upload PDF</p>
                    <p className="mt-2 text-sm text-slate-500">Choose a study material PDF and let the app analyze it.</p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">What this box does</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="flex items-start gap-2"><BookOpen className="mt-0.5 h-4 w-4 text-indigo-600" /> Analyze your uploaded PDF and extract the content.</div>
                  <div className="flex items-start gap-2"><FileQuestion className="mt-0.5 h-4 w-4 text-indigo-600" /> Make an AI exam session from the material.</div>
                  <div className="flex items-start gap-2"><ListChecks className="mt-0.5 h-4 w-4 text-indigo-600" /> Create study notes and highlight the main ideas.</div>
                  <div className="flex items-start gap-2"><Search className="mt-0.5 h-4 w-4 text-indigo-600" /> Search for repeated, emphasized, or similar questions.</div>
                  <div className="flex items-start gap-2"><BrainCircuit className="mt-0.5 h-4 w-4 text-indigo-600" /> Understand the logic of your topics.</div>
                  <div className="flex items-start gap-2"><Target className="mt-0.5 h-4 w-4 text-indigo-600" /> Focus on weak topics and retry mistakes.</div>
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

              <div className="mt-6">
                <SuggestionsList suggestions={suggestions} onRetry={retryTopic} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'analyzing') {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
            <Sparkles className="h-8 w-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold">Building your exam…</h2>
          <p className="mt-2 text-sm text-slate-600">Analyzing your PDF and preparing personalized practice material.</p>
        </div>
      </div>
    );
  }

  if (phase === 'menu') {
    return (
      <div className="min-h-screen bg-white text-slate-900 pb-28">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="mb-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Uploaded material</p>
            <h2 className="mt-2 text-2xl font-bold">{subject || 'Your PDF'}</h2>
            <p className="mt-1 text-sm text-slate-500">{branch || 'General'} · ready for smart study actions</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ActionCard icon={<BookOpen className="h-5 w-5" />} title="1) Take Exam" onClick={() => setPhase('exam')} primary />
            <ActionCard icon={<FileText className="h-5 w-5" />} title="2) Study Notes" onClick={() => action('notes').catch((e: any) => setError(e.message))} />
            <ActionCard icon={<Search className="h-5 w-5" />} title="3) Search Most Repeated Questions" onClick={() => action('repeated').catch((e: any) => setError(e.message))} />
            <ActionCard icon={<Sparkles className="h-5 w-5" />} title="4) Generate Questions" onClick={() => action('generate').catch((e: any) => setError(e.message))} />
            <ActionCard icon={<BarChart3 className="h-5 w-5" />} title="5) Performance Check — Retry Wrong Questions" onClick={performance} />
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          {notes && (
            <ResultCard title="Study Notes">
              <pre className="whitespace-pre-wrap text-sm text-slate-700">{JSON.stringify(notes, null, 2)}</pre>
            </ResultCard>
          )}

          {repeated && (
            <ResultCard title="Most Repeated / Emphasized in This PDF">
              <p className="mb-3 text-xs text-slate-500">{repeated.disclaimer || 'Based on repeated concepts found inside the uploaded material.'}</p>
              <pre className="whitespace-pre-wrap text-sm text-slate-700">{JSON.stringify(repeated, null, 2)}</pre>
            </ResultCard>
          )}

          {generated && (
            <ResultCard title="Generated Questions">
              <div className="space-y-3">
                {generated.map((q, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{q.question}</p>
                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                          {q.options.map((opt) => (
                            <div key={opt}>{opt}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ResultCard>
          )}

          <div className="mt-8">
            <SuggestionsList suggestions={suggestions} onRetry={retryTopic} />
          </div>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;

  function handleFinishClick() {
    const firstUnanswered = questions.findIndex((_, i) => !answers[i]);
    if (firstUnanswered !== -1) {
      setError(`Question ${firstUnanswered + 1} is unanswered`);
      document.getElementById(`q-${firstUnanswered}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setError('');
    submit();
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-28">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <p className="mx-auto max-w-3xl text-sm text-slate-600">
          {subject} · {answeredCount} of {questions.length} answered
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        {questions.map((q, i) => (
          <div key={i} id={`q-${i}`} className="scroll-mt-20">
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Question {i + 1}</p>
            <h2 className="mb-4 text-lg font-semibold text-slate-800">{q.question}</h2>
            <div className="space-y-2">
              {q.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAnswers({ ...answers, [i]: opt })}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                    answers[i] === opt
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <button
          onClick={handleFinishClick}
          disabled={phase === 'submitting'}
          className="mx-auto block w-full max-w-3xl rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
        >
          {phase === 'submitting' ? 'Submitting…' : `Finish Exam (${answeredCount}/${questions.length})`}
        </button>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  onClick,
  primary = false,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
        primary
          ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-200'
          : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100'
      }`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${primary ? 'bg-white/20' : 'bg-white text-indigo-600'}`}>
        {icon}
      </div>
      <span className="text-sm font-semibold">{title}</span>
      <ArrowRight className={`ml-auto h-4 w-4 ${primary ? 'text-white/80' : 'text-slate-400'}`} />
    </button>
  );
}

function ResultCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</h3>
      {children}
    </div>
  );
}

function SuggestionsList({ suggestions, onRetry }: { suggestions: Suggestion[]; onRetry: (topic: string) => void }) {
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  if (!suggestions.length) return null;

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Weak Topics</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <div key={s.topic} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setOpenTopic(openTopic === s.topic ? null : s.topic)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700"
            >
              <span>{s.topic}</span>
              <span className="text-xs text-slate-500">{openTopic === s.topic ? '−' : '+'}</span>
            </button>

            {openTopic === s.topic && (
              <div className="border-t border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 text-xs text-slate-500">
                  personal: {s.personal} · branch: {s.branchWide}
                </div>
                <button
                  onClick={() => onRetry(s.topic)}
                  className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white"
                >
                  Practice this weak topic
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default UploadExamPage;
