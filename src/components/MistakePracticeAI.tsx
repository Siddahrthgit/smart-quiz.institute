import React, { useState } from 'react';
import { 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  BrainCircuit, 
  Zap, 
  Mic, 
  Edit3, 
  Target, 
  BookOpen, 
  HelpCircle,
  ArrowRight,
  Layers
} from 'lucide-react';
import { QuizAttempt, Question, QuizConfig } from '../types';

interface MistakePracticeAIProps {
  attempts: QuizAttempt[];
  onStartTargetedQuiz: (quizTitle: string, questions: Question[], config: QuizConfig) => void;
  onNavigateToPractice: (type: 'speaking' | 'writing', promptText: string) => void;
}

export interface WrongItem {
  id: string;
  question: Question;
  userAnswer?: string;
  quizTitle: string;
  date: string;
}

const FALLBACK_WRONG_QUESTIONS: Question[] = [
  {
    id: 'f1',
    type: 'mcq',
    question: 'In Machine Learning, what primary problem does L2 Regularization (Ridge) prevent?',
    options: ['Underfitting', 'Overfitting', 'Slow Gradient Descent', 'Data Leakage'],
    correctAnswer: 'Overfitting',
    explanation: 'L2 Regularization adds a penalty proportional to the square of the weights, keeping weights small and preventing overfitting on noise.',
    difficulty: 'medium',
    topic: 'Machine Learning',
  },
  {
    id: 'f2',
    type: 'mcq',
    question: 'Which activation function is susceptible to the "Dying ReLU" problem when weights receive large negative updates?',
    options: ['Leaky ReLU', 'Standard ReLU', 'Sigmoid', 'ELU'],
    correctAnswer: 'Standard ReLU',
    explanation: 'Standard ReLU outputs 0 for negative values with 0 gradient, causing neurons to stop learning permanently if updated negatively.',
    difficulty: 'hard',
    topic: 'Deep Neural Networks',
  },
  {
    id: 'f3',
    type: 'fill_blank',
    question: 'The proportion of true positive predictions among all positive calls made by a model is called _____.',
    correctAnswer: 'Precision',
    explanation: 'Precision measures exactness (TP / (TP + FP)), whereas Recall measures completeness.',
    difficulty: 'medium',
    topic: 'Model Evaluation Metrics',
  }
];

export const MistakePracticeAI: React.FC<MistakePracticeAIProps> = ({
  attempts,
  onStartTargetedQuiz,
  onNavigateToPractice,
}) => {
  const [isGeneratingFresh, setIsGeneratingFresh] = useState(false);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all');
  const [aiAnalysisMap, setAiAnalysisMap] = useState<Record<string, string>>({});
  const [analyzingQuestionId, setAnalyzingQuestionId] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Extract all wrong questions across attempts
  const allWrongItems: WrongItem[] = [];
  attempts.forEach((att) => {
    att.questions.forEach((q) => {
      const ans = att.answers[q.id];
      const isWrong = ans ? !ans.isCorrect || (ans.scorePercentage !== undefined && ans.scorePercentage < 60) : false;
      if (isWrong) {
        allWrongItems.push({
          id: `${att.id}_${q.id}`,
          question: q,
          userAnswer: typeof ans?.userAnswer === 'string' ? ans.userAnswer : JSON.stringify(ans?.userAnswer || 'Unanswered'),
          quizTitle: att.quizTitle,
          date: att.date,
        });
      }
    });
  });

  // Fallback to sample items if no wrong attempts exist yet
  const displayItems: WrongItem[] = allWrongItems.length > 0 
    ? allWrongItems 
    : FALLBACK_WRONG_QUESTIONS.map((q) => ({
        id: `sample_${q.id}`,
        question: q,
        userAnswer: 'Incorrect Choice',
        quizTitle: 'Sample Assessment Diagnostic',
        date: new Date().toISOString().split('T')[0],
      }));

  // Unique topics
  const topics = Array.from(new Set(displayItems.map((item) => item.question.topic || 'General')));

  const filteredItems = selectedTopicFilter === 'all'
    ? displayItems
    : displayItems.filter((item) => (item.question.topic || 'General') === selectedTopicFilter);

  // AI Fresh Variations Handler
  const handleGenerateFreshVariations = async () => {
    setIsGeneratingFresh(true);
    setGeneralError(null);

    const questionsToAnalyze = filteredItems.map((item) => ({
      question: item.question.question,
      correctAnswer: item.question.correctAnswer,
      userAnswer: item.userAnswer,
      topic: item.question.topic || 'General',
    }));

    try {
      const res = await fetch('/api/generate-mistake-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wrongQuestions: questionsToAnalyze,
          numQuestions: Math.min(5, Math.max(3, questionsToAnalyze.length)),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate mistake practice quiz.');
      }

      if (data.questions && data.questions.length > 0) {
        onStartTargetedQuiz(
          data.quizTitle || 'AI Weak Concept Remediation Quiz',
          data.questions,
          {
            numQuestions: data.questions.length,
            difficulty: 'medium',
            questionTypes: ['mcq', 'fill_blank'],
          }
        );
      } else {
        throw new Error('AI produced no questions. Retrying...');
      }
    } catch (err: any) {
      console.error('Mistake practice generation error:', err);
      setGeneralError(err.message || 'Generation error. Starting exact question retry instead.');
      // Fallback: start exact wrong questions
      handleRetryExactQuestions();
    } finally {
      setIsGeneratingFresh(false);
    }
  };

  // Retry Exact Questions
  const handleRetryExactQuestions = () => {
    const questionsList = filteredItems.map((i) => i.question);
    onStartTargetedQuiz(
      'Targeted Retry: Exact Missed Questions',
      questionsList,
      {
        numQuestions: questionsList.length,
        difficulty: 'medium',
        questionTypes: ['mcq', 'fill_blank'],
      }
    );
  };

  // AI Step-by-Step Misconception Analysis for a single question
  const handleAnalyzeMisconception = async (item: WrongItem) => {
    setAnalyzingQuestionId(item.id);
    try {
      const res = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: item.question.question,
          correctAnswer: item.question.correctAnswer,
          userAnswer: item.userAnswer || 'I got confused',
        }),
      });

      const data = await res.json();
      if (data.success && data.evaluation) {
        setAiAnalysisMap((prev) => ({
          ...prev,
          [item.id]: data.evaluation.feedback || 'Review the explanation carefully: ' + item.question.explanation,
        }));
      } else {
        setAiAnalysisMap((prev) => ({
          ...prev,
          [item.id]: `Key Concept Rule: ${item.question.explanation}`,
        }));
      }
    } catch (err) {
      setAiAnalysisMap((prev) => ({
        ...prev,
        [item.id]: `Key Concept Rule: ${item.question.explanation}`,
      }));
    } finally {
      setAnalyzingQuestionId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start space-x-4 relative z-10">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-red-500/20 to-indigo-500/20 border border-red-500/30 text-red-400">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-white tracking-tight">AI Targeted Mistake & Weakness Practice</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 uppercase font-mono">
                Misconception AI Engine
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Analyzes all questions you missed across quizzes, identifies your underlying conceptual gaps, and generates fresh AI variations to ensure 100% mastery.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto relative z-10">
          <button
            onClick={handleGenerateFreshVariations}
            disabled={isGeneratingFresh}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs px-5 py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            {isGeneratingFresh ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating AI Fresh Variations...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4.5 h-4.5 text-amber-300" />
                <span>Generate AI Fresh Variations</span>
              </>
            )}
          </button>

          <button
            onClick={handleRetryExactQuestions}
            className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-3.5 rounded-2xl border border-slate-700 transition-all"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span>Retry Exact Questions ({filteredItems.length})</span>
          </button>
        </div>
      </div>

      {generalError && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Stats & Topic Filter Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center space-x-3 text-xs">
          <span className="text-slate-400 font-semibold">Logged Mistakes Bank:</span>
          <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30 font-mono">
            {displayItems.length} Misconceptions
          </span>
          {allWrongItems.length === 0 && (
            <span className="text-[11px] text-amber-400 italic">
              (Showing sample mistake questions — take quizzes to record your own!)
            </span>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedTopicFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedTopicFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Topics
          </button>
          {topics.map((tp) => (
            <button
              key={tp}
              onClick={() => setSelectedTopicFilter(tp)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedTopicFilter === tp
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tp}
            </button>
          ))}
        </div>
      </div>

      {/* Mistake Cards List */}
      <div className="space-y-4">
        {filteredItems.map((item, idx) => (
          <div
            key={item.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700/90 rounded-2xl p-5 md:p-6 space-y-4 transition-all shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 font-mono text-xs font-bold flex items-center justify-center">
                  #{idx + 1}
                </span>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 font-mono">
                    {item.question.topic || 'General Topic'}
                  </span>
                  <p className="text-sm font-bold text-slate-100 mt-0.5 leading-snug">
                    {item.question.question}
                  </p>
                </div>
              </div>

              <span className="text-[10px] text-slate-400 font-mono flex-shrink-0 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                {item.quizTitle}
              </span>
            </div>

            {/* Answer Contrast Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/40 text-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-red-400 font-bold">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Your Recorded Answer:</span>
                </div>
                <p className="text-slate-300 font-mono text-xs pl-5">{item.userAnswer || 'Incorrect / Skipped'}</p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs space-y-1">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Correct Solution:</span>
                </div>
                <p className="text-slate-200 font-bold text-xs pl-5">{item.question.correctAnswer}</p>
              </div>
            </div>

            {/* AI Explanation Snippet */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 text-xs text-slate-300 space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono block">
                Why this answer is right:
              </span>
              <p className="text-slate-300 leading-relaxed">{item.question.explanation}</p>
            </div>

            {/* AI Misconception Analysis Result if requested */}
            {aiAnalysisMap[item.id] && (
              <div className="p-4 rounded-xl bg-indigo-950/50 border border-indigo-500/40 text-xs space-y-2 animate-fadeIn">
                <div className="flex items-center space-x-2 text-indigo-300 font-bold">
                  <BrainCircuit className="w-4 h-4 text-indigo-400" />
                  <span>AI Misconception Diagnostic:</span>
                </div>
                <p className="text-slate-200 leading-relaxed">{aiAnalysisMap[item.id]}</p>
              </div>
            )}

            {/* Card Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <button
                onClick={() => handleAnalyzeMisconception(item)}
                disabled={analyzingQuestionId === item.id}
                className="flex items-center space-x-1.5 bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/30 font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                {analyzingQuestionId === item.id ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Misconception...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>AI Misconception Tutor</span>
                  </>
                )}
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    onNavigateToPractice(
                      'speaking',
                      `Practice explaining this concept aloud: "${item.question.question}". Correct concept: ${item.question.correctAnswer}.`
                    )
                  }
                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-violet-300 bg-slate-800 hover:bg-slate-700/80 px-3 py-2 rounded-xl border border-slate-700 transition-colors"
                  title="Practice speaking this answer"
                >
                  <Mic className="w-3.5 h-3.5 text-violet-400" />
                  <span>Oral Practice</span>
                </button>

                <button
                  onClick={() =>
                    onNavigateToPractice(
                      'writing',
                      `Write a short essay explaining why "${item.question.correctAnswer}" is the correct answer to: "${item.question.question}", and address common pitfalls.`
                    )
                  }
                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-violet-300 bg-slate-800 hover:bg-slate-700/80 px-3 py-2 rounded-xl border border-slate-700 transition-colors"
                  title="Write an essay on this concept"
                >
                  <Edit3 className="w-3.5 h-3.5 text-violet-400" />
                  <span>Writing Drill</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
