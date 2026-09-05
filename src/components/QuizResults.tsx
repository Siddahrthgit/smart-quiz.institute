import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RotateCcw, 
  Sparkles, 
  ArrowLeft, 
  Zap, 
  FileText, 
  BookmarkCheck,
  TrendingUp,
  BrainCircuit
} from 'lucide-react';
import { QuizAttempt, Question } from '../types';

interface QuizResultsProps {
  attempt: QuizAttempt;
  onRetryWrong: () => void;
  onRetryLowConfidence: () => void;
  onGenerateFlashcards: () => void;
  onOpenPractice: (type?: 'speaking' | 'writing') => void;
  onOpenAnalytics: () => void;
  onReturnDashboard: () => void;
}

export const QuizResults: React.FC<QuizResultsProps> = ({
  attempt,
  onRetryWrong,
  onRetryLowConfidence,
  onGenerateFlashcards,
  onOpenPractice,
  onOpenAnalytics,
  onReturnDashboard,
}) => {
  useEffect(() => {
    if (attempt.score >= 80) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [attempt.score]);

  const wrongQuestionsCount = attempt.questions.filter((q) => {
    const ans = attempt.answers[q.id];
    return !ans || ans.isCorrect === false;
  }).length;

  // Rate confidence according to question accuracy
  const highConfidenceCount = attempt.questions.filter((q) => {
    const ans = attempt.answers[q.id];
    if (!ans) return false;
    const score = ans.scorePercentage ?? (ans.isCorrect ? 100 : 0);
    return score >= 80 || ans.confidence === 'high';
  }).length;


  const lowConfidenceCount = attempt.questions.filter((q) => {
    const ans = attempt.answers[q.id];
    if (!ans) return true;
    const score = ans.scorePercentage ?? (ans.isCorrect ? 100 : 0);
    return score < 50 || ans.confidence === 'low';
  }).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Score Header Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl p-6 md:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Award className="w-3.5 h-3.5" />
            <span>Quiz Completed</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">{attempt.quizTitle}</h1>
        </div>

        {/* Score Circle & XP */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <div className="w-32 h-32 rounded-full border-4 border-indigo-500/40 bg-indigo-950/60 flex flex-col items-center justify-center shadow-lg">
            <span className="text-3xl font-extrabold text-white">{attempt.score}%</span>
            <span className="text-[11px] text-slate-400 font-medium">Overall Score</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Accuracy</span>
              <span className="text-lg font-bold text-emerald-400">
                {attempt.correctCount} / {attempt.totalQuestions}
              </span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">XP Awarded</span>
              <span className="text-lg font-bold text-indigo-300 font-mono">
                +{attempt.xpEarned} XP
              </span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Time Spent</span>
              <span className="text-lg font-bold text-slate-200 font-mono">
                {Math.round(attempt.timeSpentSeconds / 60)}m {attempt.timeSpentSeconds % 60}s
              </span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Status</span>
              <span className="text-xs font-bold text-indigo-400 capitalize">
                {attempt.score >= 80 ? 'Mastered 🎉' : attempt.score >= 60 ? 'Passing 👍' : 'Needs Practice 📖'}
              </span>
            </div>
          </div>
        </div>

        {/* Recommended Next Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-800">
          {wrongQuestionsCount > 0 && (
            <button
              onClick={onRetryWrong}
              className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-red-600/30"
            >
              <RotateCcw className="w-4 h-4" />
              <span>1. Re-Exam Wrong ({wrongQuestionsCount} Set)</span>
            </button>
          )}

          <button
            onClick={onGenerateFlashcards}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/30"
          >
            <BrainCircuit className="w-4 h-4 text-amber-300" />
            <span>2. Make Notes & Flashcards for Mistakes</span>
          </button>

          {wrongQuestionsCount > 0 && (
            <button
              onClick={() => onOpenPractice('speaking')}
              className="flex items-center space-x-1.5 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-violet-600/30"
            >
              <Sparkles className="w-4 h-4" />
              <span>3. Speaking & Writing Practice</span>
            </button>
          )}

          <button
            onClick={onOpenAnalytics}
            className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-sky-600/30"
          >
            <TrendingUp className="w-4 h-4" />
            <span>4. Re-Exam Analytics</span>
          </button>

          <button
            onClick={onReturnDashboard}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      {/* Accuracy-Rated Confidence Breakdown Card */}
      <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Accuracy-Rated Confidence Calibration
            </h2>
          </div>
          <span className="status-chip active">
            Calibrated to Question Accuracy
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Confidence levels are automatically rated based on your accuracy for every question to help you pinpoint areas for revision.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-emerald-400 font-semibold block">High Confidence</span>
              <span className="text-xs text-slate-300">100% Correct / Mastered</span>
            </div>
            <span className="text-xl font-extrabold text-emerald-300 font-mono">
              {highConfidenceCount}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-red-400 font-semibold block">Low Confidence</span>
              <span className="text-xs text-slate-300">0-49% Accuracy (Needs Practice)</span>
            </div>
            <span className="text-xl font-extrabold text-red-300 font-mono">
              {lowConfidenceCount}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Question Review */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <span>Detailed Question Analysis ({attempt.questions.length})</span>
        </h2>

        <div className="space-y-4">
          {attempt.questions.map((q, idx) => {
            const ans = attempt.answers[q.id];
            const isCorrect = ans?.isCorrect;

            // Calculate accuracy-rated confidence
            const score = ans?.scorePercentage ?? (isCorrect ? 100 : 0);
            const ratedConfidence = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';

            return (
              <div
                key={q.id}
                className={`p-6 rounded-2xl border transition-all ${
                  isCorrect
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-slate-900/90 border-red-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-indigo-400 capitalize">{q.topic || 'General'}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] px-2.5 py-1 rounded-md font-mono border font-semibold flex items-center gap-1 ${
                      ratedConfidence === 'high'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : ratedConfidence === 'medium'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : 'bg-red-950 text-red-300 border-red-800'
                    }`}>
                      <Zap className="w-3 h-3 text-amber-400" />
                      Confidence: {ratedConfidence.toUpperCase()} ({score}% Accuracy)
                    </span>

                    {isCorrect ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Correct</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-red-950 text-red-300 border border-red-800 text-xs font-semibold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Incorrect</span>
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-100 mb-4">{q.question}</h3>

                {/* Answers Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-slate-400 block text-[11px] font-medium mb-1">Your Answer:</span>
                    <span className={`font-semibold ${isCorrect ? 'text-emerald-300' : 'text-red-300'}`}>
                      {ans?.userAnswer ? String(ans.userAnswer) : 'No Answer Provided'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
                    <span className="text-emerald-400 block text-[11px] font-medium mb-1">Correct Answer:</span>
                    <span className="font-semibold text-emerald-200">{q.correctAnswer}</span>
                  </div>
                </div>

                {/* AI Explanation */}
                {q.explanation && (
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-indigo-500/20 text-xs space-y-2">
                    <div className="flex items-center space-x-1.5 text-indigo-400 font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Explanation:</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{q.explanation}</p>

                    {q.sourceSnippet && (
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/50 text-[11px] text-slate-400 italic">
                        "{q.sourceSnippet}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
