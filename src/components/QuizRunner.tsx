import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Bookmark, 
  BookmarkCheck, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Check,
  AlertCircle,
  Zap,
  Info
} from 'lucide-react';
import { Question, UserAnswer, QuizConfig } from '../types';

interface QuizRunnerProps {
  quizTitle: string;
  documentName?: string;
  questions: Question[];
  config: QuizConfig;
  bookmarkedIds: string[];
  onToggleBookmark: (questionId: string) => void;
  onFinishQuiz: (
    answers: Record<string, UserAnswer>,
    totalTimeSeconds: number,
    isExamMode: boolean
  ) => void;
  onExit: () => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({
  quizTitle,
  documentName,
  questions,
  config,
  bookmarkedIds,
  onToggleBookmark,
  onFinishQuiz,
  onExit,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  
  // Timer states
  const [timeRemaining, setTimeRemaining] = useState<number>(
    config.isExamMode && config.timeLimitPerQuestion
      ? config.timeLimitPerQuestion * questions.length
      : 0
  );
  const [totalTimeSpent, setTotalTimeSpent] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

  // Current question states
  const currentQ = questions[currentIndex];
  const isBookmarked = currentQ ? bookmarkedIds.includes(currentQ.id) : false;

  const [currentSelection, setCurrentSelection] = useState<string | Record<string, string>>('');
  const [confidence, setConfidence] = useState<'high' | 'low'>('high');
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [aiEvaluation, setAiEvaluation] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // Sync state when index changes
  useEffect(() => {
    const existing = answers[currentQ?.id];
    if (existing) {
      setCurrentSelection(existing.userAnswer);
      setConfidence(existing.confidence || 'high');
      if (existing.aiFeedback) setAiEvaluation(existing.aiFeedback);
    } else {
      setCurrentSelection('');
      setConfidence('high');
      setShowExplanation(false);
      setAiEvaluation(null);
    }
    setQuestionStartTime(Date.now());
  }, [currentIndex, currentQ?.id]);

  // Overall Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTotalTimeSpent((prev) => prev + 1);
      if (config.isExamMode && timeRemaining > 0) {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [config.isExamMode, timeRemaining]);

  const handleAutoSubmit = () => {
    onFinishQuiz(answers, totalTimeSpent, config.isExamMode || false);
  };

  const currentQAnswered = Boolean(answers[currentQ?.id]);

  const saveCurrentAnswer = (overrideSelection?: any) => {
    const selectionToSave = overrideSelection !== undefined ? overrideSelection : currentSelection;
    if (!selectionToSave || (typeof selectionToSave === 'string' && !selectionToSave.trim())) {
      return;
    }

    const elapsed = Math.round((Date.now() - questionStartTime) / 1000);

    let isCorrect = false;
    if (currentQ.type === 'mcq' || currentQ.type === 'true_false' || currentQ.type === 'fill_blank') {
      isCorrect =
        String(selectionToSave).trim().toLowerCase() ===
        String(currentQ.correctAnswer).trim().toLowerCase();
    }

    // Auto-rate confidence according to accuracy
    const autoConfidence: 'high' | 'low' = isCorrect ? 'high' : 'low';
    setConfidence(autoConfidence);

    const newAnswer: UserAnswer = {
      questionId: currentQ.id,
      userAnswer: selectionToSave,
      isCorrect,
      confidence: autoConfidence,
      timeSpentSeconds: elapsed,
      aiFeedback: aiEvaluation || undefined,
    };

    setAnswers((prev) => ({ ...prev, [currentQ.id]: newAnswer }));
    setShowExplanation(true);
  };

  const handleEvaluateSubjectiveAnswer = async () => {
    if (!currentSelection || typeof currentSelection !== 'string' || !currentSelection.trim()) return;

    setIsEvaluating(true);
    try {
      const res = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          correctAnswer: currentQ.correctAnswer,
          userAnswer: currentSelection,
        }),
      });

      const data = await res.json();
      if (data.success && data.evaluation) {
        const evalObj = data.evaluation;
        const elapsed = Math.round((Date.now() - questionStartTime) / 1000);

        // Rate confidence according to accuracy score
        const score = evalObj.scorePercentage ?? (evalObj.isCorrect ? 100 : 0);
        const autoConfidence: 'high' | 'low' =
          score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';
        
        setConfidence(autoConfidence);

        const newAnswer: UserAnswer = {
          questionId: currentQ.id,
          userAnswer: currentSelection,
          isCorrect: evalObj.isCorrect,
          scorePercentage: evalObj.scorePercentage,
          confidence: autoConfidence,
          timeSpentSeconds: elapsed,
          aiFeedback: evalObj.feedback,
        };

        setAnswers((prev) => ({ ...prev, [currentQ.id]: newAnswer }));
        setAiEvaluation(evalObj.feedback);
        setShowExplanation(true);
      }
    } catch (err) {
      console.error('Failed to evaluate subjective answer:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNext = () => {
    saveCurrentAnswer();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    saveCurrentAnswer();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onExit}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-xs font-semibold"
          >
            ← Exit
          </button>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">{quizTitle}</h1>
            {documentName && (
              <p className="text-[11px] text-indigo-400 font-medium">Source: {documentName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Question Progress Counter */}
          <div className="text-xs font-mono font-semibold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            Question <span className="text-indigo-400">{currentIndex + 1}</span> / {questions.length}
          </div>

          {/* Timer Display */}
          <div
            className={`flex items-center space-x-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-lg border ${
              config.isExamMode && timeRemaining < 60
                ? 'bg-red-950/80 text-red-400 border-red-800 animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>{config.isExamMode ? formatTimer(timeRemaining) : formatTimer(totalTimeSpent)}</span>
          </div>

          {/* Bookmark toggle */}
          <button
            onClick={() => onToggleBookmark(currentQ.id)}
            className={`p-2 rounded-xl border transition-colors ${
              isBookmarked
                ? 'bg-indigo-950/80 border-indigo-500 text-indigo-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Bookmark this question"
          >
            {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress Pills Bar */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
        {questions.map((q, idx) => {
          const isAnswered = Boolean(answers[q.id]);
          const isCurrent = idx === currentIndex;
          const ans = answers[q.id];

          return (
            <button
              key={q.id}
              onClick={() => {
                saveCurrentAnswer();
                setCurrentIndex(idx);
              }}
              className={`flex-1 min-w-[32px] h-2.5 rounded-full transition-all ${
                isCurrent
                  ? 'ring-2 ring-indigo-400 bg-indigo-500'
                  : isAnswered
                  ? ans?.isCorrect === false && !config.isExamMode
                    ? 'bg-red-500'
                    : 'bg-emerald-500'
                  : 'bg-slate-800'
              }`}
              title={`Go to question ${idx + 1}`}
            />
          );
        })}
      </div>

      {/* Main Question Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
        {/* Question Meta tags */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
              {currentQ.type.replace('_', ' ')}
            </span>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border capitalize font-mono ${
                currentQ.difficulty === 'easy'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                  : currentQ.difficulty === 'medium'
                  ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                  : 'bg-red-950/60 text-red-300 border-red-800'
              }`}
            >
              {currentQ.difficulty}
            </span>
            {currentQ.topic && (
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
                Topic: {currentQ.topic}
              </span>
            )}
          </div>
        </div>

        {/* Question Text */}
        <h2 className="text-lg md:text-xl font-bold text-slate-100 leading-snug">
          {currentQ.question}
        </h2>

        {/* Question Input Formats */}
        <div className="space-y-3 pt-2">
          {/* MCQ & True/False */}
          {(currentQ.type === 'mcq' || currentQ.type === 'true_false') && currentQ.options && (
            <div className="space-y-2.5">
              {currentQ.options.map((option, idx) => {
                const isSelected = currentSelection === option;
                const answeredObj = answers[currentQ.id];
                const isSavedAns = answeredObj?.userAnswer === option;

                let btnStyle = 'bg-slate-800/60 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:border-slate-600';

                if (!config.isExamMode && answeredObj) {
                  if (option === currentQ.correctAnswer) {
                    btnStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-200 font-semibold';
                  } else if (isSavedAns) {
                    btnStyle = 'bg-red-950/70 border-red-500 text-red-200';
                  }
                } else if (isSelected) {
                  btnStyle = 'bg-indigo-950/80 border-indigo-500 text-indigo-100 font-semibold ring-1 ring-indigo-500';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentSelection(option);
                      saveCurrentAnswer(option);
                    }}
                    className={`w-full p-4 rounded-xl border text-left text-xs md:text-sm transition-all flex items-center justify-between ${btnStyle}`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 font-mono text-xs flex items-center justify-center flex-shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </div>

                    {!config.isExamMode && answeredObj && (
                      <div>
                        {option === currentQ.correctAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                        {isSavedAns && option !== currentQ.correctAnswer && <XCircle className="w-5 h-5 text-red-400" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Fill in the Blanks */}
          {currentQ.type === 'fill_blank' && (
            <div className="space-y-3">
              <input
                type="text"
                value={typeof currentSelection === 'string' ? currentSelection : ''}
                onChange={(e) => setCurrentSelection(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                onClick={() => saveCurrentAnswer()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors"
              >
                Confirm Answer
              </button>
            </div>
          )}

          {/* Short & Long Answer Subjective Inputs */}
          {(currentQ.type === 'short_answer' || currentQ.type === 'long_answer') && (
            <div className="space-y-3">
              <textarea
                rows={currentQ.type === 'long_answer' ? 6 : 3}
                value={typeof currentSelection === 'string' ? currentSelection : ''}
                onChange={(e) => setCurrentSelection(e.target.value)}
                placeholder="Write your explanation or detailed response here..."
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl p-4 text-xs md:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleEvaluateSubjectiveAnswer}
                  disabled={isEvaluating || !currentSelection}
                  className="bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  {isEvaluating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Grading with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Evaluate Answer with AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Accuracy-Based Confidence Rating */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Confidence Rating (Calibrated to Accuracy):</span>
            </label>
            <span className="status-chip active">
              Auto-Rated by Accuracy
            </span>
          </div>

          {!config.isExamMode && answers[currentQ.id] && (
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Question Accuracy Status:</span>
              <span className={`font-bold flex items-center gap-1 ${
                answers[currentQ.id].isCorrect ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {answers[currentQ.id].isCorrect ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>100% Accurate → High Confidence</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>0% Accuracy → Low Confidence (Needs Practice)</span>
                  </>
                )}
              </span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            {(['high', 'low'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  setConfidence(lvl);
                  if (answers[currentQ.id]) {
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQ.id]: { ...prev[currentQ.id], confidence: lvl },
                    }));
                  }
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize border transition-all ${
                  confidence === lvl
                    ? lvl === 'high'
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-950'
                      : 'bg-red-950 border-red-500 text-red-300 shadow-sm shadow-red-950'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl === 'high' ? '🟢 Confident' : '🔴 Need Improve'}
              </button>
            ))}
          </div>
        </div>

        {/* Phase 2 AI Answer Explanations & Source Reference */}
        {!config.isExamMode && showExplanation && currentQ.explanation && (
          <div className="p-4 rounded-xl bg-slate-800/80 border border-indigo-500/30 space-y-3">
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>AI Explanation & Reference</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{currentQ.explanation}</p>

            {currentQ.sourceSnippet && (
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-700/50 text-[11px] text-slate-400 italic">
                <span className="font-semibold text-slate-300 not-italic">Source Excerpt: </span>
                "{currentQ.sourceSnippet}"
              </div>
            )}

            {aiEvaluation && (
              <div className="p-3 rounded-lg bg-violet-950/60 border border-violet-800/60 text-xs text-violet-200">
                <span className="font-bold block mb-1">AI Feedback:</span>
                {aiEvaluation}
              </div>
            )}
          </div>
        )}

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-xs font-semibold disabled:opacity-40"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {currentIndex === questions.length - 1 ? (
            <button
              onClick={() => {
                saveCurrentAnswer();
                handleAutoSubmit();
              }}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all"
            >
              <span>Submit & See Results</span>
              <Check className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-600/20"
            >
              <span>Next Question</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
