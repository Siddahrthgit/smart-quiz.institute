import React from 'react';
import { CheckCircle2, RotateCcw, ArrowLeft, Zap } from 'lucide-react';
import { QuizAttempt } from '../types';

interface QuizCompletedProps {
  attempt: QuizAttempt;
  onBackToPractice: () => void;
  onRetryWrong: () => void;
}

export const QuizCompleted: React.FC<QuizCompletedProps> = ({
  attempt,
  onBackToPractice,
  onRetryWrong,
}) => {
  const wrongCount = attempt.totalQuestions - attempt.correctCount;

  return (
    <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 text-center">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div>
        <h2 className="text-2xl font-black text-white">Quiz Completed</h2>
        <p className="text-sm text-slate-400 mt-1">{attempt.quizTitle}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4">
          <p className="text-2xl font-black text-white">{attempt.score}%</p>
          <p className="text-[11px] text-slate-400 font-semibold mt-1">Score</p>
        </div>
        <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4">
          <p className="text-2xl font-black text-emerald-400">{attempt.correctCount}</p>
          <p className="text-[11px] text-slate-400 font-semibold mt-1">Correct</p>
        </div>
        <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4">
          <p className="text-2xl font-black text-rose-400">{wrongCount}</p>
          <p className="text-[11px] text-slate-400 font-semibold mt-1">Wrong</p>
        </div>
      </div>

      <div className="flex items-center justify-center space-x-1.5 text-xs font-bold text-indigo-400">
        <Zap className="w-4 h-4" />
        <span>+{attempt.xpEarned} XP earned</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {wrongCount > 0 && (
          <button
            onClick={onRetryWrong}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Wrong Questions</span>
          </button>
        )}
        <button
          onClick={onBackToPractice}
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold transition-colors border border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Practice</span>
        </button>
      </div>
    </div>
  );
};
