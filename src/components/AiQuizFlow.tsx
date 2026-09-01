import React, { useMemo, useState } from 'react';

type Difficulty = 'easy' | 'medium' | 'hard';
type QuestionType = 'mcq' | 'true_false' | 'short' | 'long';
type Phase = 'landing' | 'session-setup' | 'session-quiz' | 'dashboard';

interface GeneratedQuestion {
  id: string;
  prompt: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string;
}

interface AnswerResult {
  questionId: string;
  prompt: string;
  selectedIndex: number | null;
  yourAnswerText: string;
  correctAnswerText: string;
  correct: boolean;
  confidence: 'low' | 'high';
}

export function AiQuizFlow({ onNavigate, onAuthSuccess }: { onNavigate?: (tab: string) => void; onAuthSuccess?: (user: { name: string; email: string }) => void }) {
  const [phase, setPhase] = useState<Phase>('landing');
  const [topic, setTopic] = useState('');

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionType, setQuestionType] = useState<QuestionType>('mcq');
  const [questionCount, setQuestionCount] = useState(20);

  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<AnswerResult[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = questions[current];
  const progressPct = useMemo(
    () => (questions.length ? Math.round(((current + 1) / questions.length) * 100) : 0),
    [current, questions.length]
  );

  const stats = useMemo(() => {
    const total = results.length || 1;
    const correct = results.filter((r) => r.correct).length;
    const confident = results.filter((r) => r.confidence === 'high').length;
    const needImprove = results.filter((r) => r.confidence === 'low').length;
    return {
      correct,
      confident,
      needImprove,
      overallScorePct: Math.round((correct / total) * 100),
    };
  }, [results]);

  const handleStartFromLanding = (t: string) => {
    setTopic(t);
    setPhase('session-setup');
  };

  const handleGenerateQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, difficulty, questionType, count: questionCount }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to generate questions');
      if (!data.questions || data.questions.length === 0) throw new Error('No questions returned');

      setQuestions(data.questions);
      setCurrent(0);
      setResults([]);
      setSelected(null);
      setPhase('session-quiz');
    } catch (err: any) {
      setError(err.message || 'Something went wrong generating questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (confidence: 'low' | 'high') => {
    if (!question) return;
    const correct = question.correctIndex !== undefined && selected === question.correctIndex;
    const yourAnswerText =
      selected !== null && question.options ? question.options[selected] : question.correctAnswer ? '—' : '—';
    const correctAnswerText =
      question.correctIndex !== undefined && question.options
        ? question.options[question.correctIndex]
        : question.correctAnswer || '—';

    const newResults = [
      ...results,
      {
        questionId: question.id,
        prompt: question.prompt,
        selectedIndex: selected,
        yourAnswerText,
        correctAnswerText,
        correct,
        confidence,
      },
    ];
    setResults(newResults);
    setSelected(null);

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      setPhase('dashboard');
    }
  };

  const handleRestart = () => {
    setPhase('landing');
    setTopic('');
    setQuestions([]);
    setResults([]);
    setCurrent(0);
    setSelected(null);
    setError(null);
  };

  if (phase === 'landing') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4">
          <span className="text-2xl">✨</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Smart AI question practicing</h1>
        <p className="text-slate-400 text-sm mb-8 max-w-xs">
          Type any exam name or subject and we'll generate a custom quiz for you.
        </p>
        <LandingForm onStart={handleStartFromLanding} />
        <div className="flex gap-3 mt-6 text-xs text-slate-400">
          <button onClick={() => { if (!onAuthSuccess) onNavigate && onNavigate("documents"); }} disabled={!!onAuthSuccess} className={onAuthSuccess ? "text-slate-600 cursor-not-allowed" : "underline"}>Upload document</button>
          <span>·</span>
          <button onClick={() => { if (!onAuthSuccess) onNavigate && onNavigate("documents"); }} disabled={!!onAuthSuccess} className={onAuthSuccess ? "text-slate-600 cursor-not-allowed" : "underline"}>Materials & Drive</button>
          <span>·</span>
          <button onClick={() => { if (!onAuthSuccess) onNavigate && onNavigate("notes-cards"); }} disabled={!!onAuthSuccess} className={onAuthSuccess ? "text-slate-600 cursor-not-allowed" : "underline"}>Notes & Flashcards</button>
        </div>
        {onAuthSuccess && <div id="signup-section"><AuthForm onSuccess={onAuthSuccess} /></div>}
      </div>
    );
  }

  if (phase === 'session-setup') {
    return (
      <div className="min-h-screen bg-slate-950 text-white max-w-lg mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold">{topic}</h1>
          <p className="text-slate-400 text-sm">Set up your practice session</p>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400 mb-2 block">Difficulty</label>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 rounded-lg py-2 text-sm capitalize border ${
                  difficulty === d ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400 mb-2 block">Question Type</label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['mcq', 'Multiple Choice'],
                ['true_false', 'True / False'],
                ['short', 'Short Answer'],
                ['long', 'Long Answer'],
              ] as [QuestionType, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setQuestionType(val)}
                className={`rounded-lg py-2 text-xs border ${
                  questionType === val ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400 mb-2 block">
            Number of Questions: {questionCount}
          </label>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleGenerateQuestions}
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 font-semibold py-3 text-sm"
        >
          {loading ? 'Generating questions...' : 'Start Quiz'}
        </button>
      </div>
    );
  }

  if (phase === 'session-quiz' && question) {
    return (
      <div className="min-h-screen bg-slate-950 text-white max-w-lg mx-auto px-4 py-6 space-y-6">
        <div>
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>
              Question {current + 1} / {questions.length}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <h2 className="text-lg font-medium">{question.prompt}</h2>

        {question.options && (
          <div className="space-y-2">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`w-full text-left rounded-lg px-4 py-3 text-sm border ${
                  selected === i ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-900 border-slate-800'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        <div>
          <label className="text-xs uppercase tracking-wide text-slate-400 mb-2 block">Confidence Level</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleAnswer('low')}
              className="flex-1 rounded-lg py-2 text-sm bg-amber-900/40 text-amber-300"
            >
              Need Improve
            </button>
            <button
              onClick={() => handleAnswer('high')}
              className="flex-1 rounded-lg py-2 text-sm bg-green-900/40 text-green-300"
            >
              Confident
            </button>
          </div>
        </div>
      </div>
    );
  }

  const needImproveResults = results.filter((r) => !r.correct || r.confidence === 'low');

  return (
    <div className="min-h-screen bg-slate-950 text-white max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">{topic}</h1>
        <p className="text-slate-400 text-sm">Your results and next steps</p>
      </div>

      <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex items-center gap-4">
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 36 36" className="w-16 h-16">
            <path
              className="text-slate-800"
              stroke="currentColor"
              strokeWidth="3.5"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-indigo-500"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeDasharray={`${stats.overallScorePct}, 100`}
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
            {stats.overallScorePct}%
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold">Overall Score</div>
          <div className="text-xs text-slate-400">
            {stats.correct} correct out of {results.length}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 rounded-xl bg-slate-900/80 border border-slate-800 p-4">
          <div className="text-2xl font-bold text-green-400">{stats.confident}</div>
          <div className="text-xs uppercase tracking-wide text-slate-400 mt-1">Confident</div>
        </div>
        <div className="flex-1 rounded-xl bg-slate-900/80 border border-slate-800 p-4">
          <div className="text-2xl font-bold text-amber-400">{stats.needImprove}</div>
          <div className="text-xs uppercase tracking-wide text-slate-400 mt-1">Need Improve</div>
        </div>
      </div>

      {needImproveResults.length > 0 && (
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Need Improve Questions
          </h2>
          <div className="space-y-3">
            {needImproveResults.map((r, i) => (
              <div key={r.questionId} className="rounded-lg bg-slate-950/60 border border-slate-800 p-3">
                <div className="font-medium mb-2">
                  {i + 1}. {r.prompt}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-400">Your Answer: {r.yourAnswerText}</span>
                  <span className="text-green-400">Correct: {r.correctAnswerText}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleRestart} className="w-full rounded-xl bg-indigo-600 font-semibold py-3 text-sm">
        Practice Another Topic
      </button>
    </div>
  );
}

function LandingForm({ onStart }: { onStart: (topic: string) => void }) {
  const [topic, setTopic] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = topic.trim();
        if (trimmed) onStart(trimmed);
      }}
      className="w-full max-w-sm space-y-3"
    >
      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="e.g. Concrete Technology, NEC Loksewa..."
        className="w-full rounded-xl bg-white text-slate-900 placeholder-slate-400 border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-500"
      />
      <button
        type="submit"
        disabled={!topic.trim()}
        className="w-full rounded-xl bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 font-semibold py-3 text-sm"
      >
        Start Practicing
      </button>
    </form>
  );
}

function AuthForm({ onSuccess }: { onSuccess: (user: { name: string; email: string }) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login' ? { emailOrUsername: email, password } : { name, username, email, password };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }
      localStorage.setItem('authToken', data.token);
      onSuccess({ name: data.user.name, email: data.user.email });
    } catch {
      setError('Could not reach the server. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mt-10 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-left">
      <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700 mb-5">
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${mode === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Sign Up
        </button>
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${mode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Log In
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'register' && (
          <>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Full Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
            </div>
          </>
        )}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">{mode === 'login' ? 'Email or Username' : 'Email Address'}</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500" />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 font-semibold py-2.5 text-sm text-white"
        >
          {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}
