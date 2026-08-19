import React, { useState } from 'react';
import { 
  Sparkles, 
  Upload, 
  Cloud, 
  RotateCcw, 
  BrainCircuit, 
  Award, 
  Flame, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Bookmark, 
  FileText, 
  Zap,
  Mic,
  TrendingUp,
  BookOpen,
  HelpCircle,
  BarChart2,
  Smile,
  Meh,
  Frown,
  Plus,
  Check,
  Layers,
  Search,
  BookMarked
} from 'lucide-react';
import { UserProfile, QuizAttempt, DocumentItem } from '../types';
import { DailyStudyPlanner } from './DailyStudyPlanner';

interface DashboardProps {
  profile: UserProfile;
  attempts: QuizAttempt[];
  documents: DocumentItem[];
  onStartQuizGen: () => void;
  onOpenDocuments: () => void;
  onOpenNotesAndCards: () => void;
  onOpenPractice: () => void;
  onOpenAnalytics?: () => void;
  onRetryWrongQuestions: () => void;
  onRetryLowConfidence: () => void;
  onOpenAttemptDetail: (attempt: QuizAttempt) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profile,
  attempts,
  documents,
  onStartQuizGen,
  onOpenDocuments,
  onOpenNotesAndCards,
  onOpenPractice,
  onOpenAnalytics,
  onRetryWrongQuestions,
  onRetryLowConfidence,
  onOpenAttemptDetail,
}) => {
  const [smartRevisionTab, setSmartRevisionTab] = useState<'wrong' | 'low'>('wrong');
  const [selectedConfidence, setSelectedConfidence] = useState<'low' | 'medium' | 'high'>('medium');

  // Aggregated Stats
  const totalQuizzes = attempts.length > 0 ? attempts.length : 24;
  const totalQuestions = attempts.reduce((acc, curr) => acc + curr.totalQuestions, 0) || 240;
  const correctAnswers = attempts.reduce((acc, curr) => acc + curr.correctCount, 0) || 192;
  const wrongAnswers = profile.wrongQuestionIds.length > 0 ? profile.wrongQuestionIds.length : 48;
  const lessConfident = profile.lowConfidenceQuestionIds.length > 0 ? profile.lowConfidenceQuestionIds.length : 36;
  const overallAccuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 80;

  // Recent Quizzes display (with fallbacks if empty)
  const defaultRecentQuizzes = [
    { id: 'q1', title: 'Concrete Technology.pdf', questions: 20, date: '18 Jul 2025', score: 85 },
    { id: 'q2', title: 'Highway Engineering.txt', questions: 20, date: '16 Jul 2025', score: 65 },
    { id: 'q3', title: 'RCC Structures.pdf', questions: 20, date: '14 Jul 2025', score: 90 },
  ];

  const recentList = attempts.length > 0 
    ? attempts.slice(0, 3).map((a) => ({
        id: a.id,
        title: a.quizTitle,
        questions: a.totalQuestions,
        date: a.date,
        score: a.score,
        attempt: a,
      }))
    : defaultRecentQuizzes;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Upper Grid: 3-Column Layout matching Model (Features Sidebar | Main Dashboard | Quiz Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Brand & Feature Highlights (3 cols on lg) */}
        <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-indigo-400">
                <BrainCircuit className="w-7 h-7" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-1.5">
                <span>Smart Quiz</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">AI</span>
              </h1>
              <p className="text-[11px] font-semibold text-slate-400 leading-tight">
                Study Smarter. Learn Faster. Score Higher.
              </p>
            </div>
          </div>

          <div className="flex overflow-x-auto gap-2 pt-2 border-t border-slate-800 pb-1">
            {/* Feature 1 */}
            <div className="flex flex-col items-center text-center space-y-1 p-2 rounded-2xl hover:bg-slate-800/50 transition-colors flex-shrink-0 w-20">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-slate-100">AI Powered</h3>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center text-center space-y-1 p-2 rounded-2xl hover:bg-slate-800/50 transition-colors flex-shrink-0 w-20">
              <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-slate-100">Smart Quiz</h3>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center text-center space-y-1 p-2 rounded-2xl hover:bg-slate-800/50 transition-colors flex-shrink-0 w-20">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-slate-100">Track & Improve</h3>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex flex-col items-center text-center space-y-1 p-2 rounded-2xl hover:bg-slate-800/50 transition-colors flex-shrink-0 w-20">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-slate-100">Smart Revision</h3>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="flex flex-col items-center text-center space-y-1 p-2 rounded-2xl hover:bg-slate-800/50 transition-colors flex-shrink-0 w-20">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Award className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-slate-100">Confidence Check</h3>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="flex flex-col items-center text-center space-y-1 p-2 rounded-2xl hover:bg-slate-800/50 transition-colors flex-shrink-0 w-20">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-slate-100">Multi-Format Support</h3>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Main Welcome & Dashboard Cards (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Welcome Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute right-4 top-4 flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                🌙
              </div>
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" 
                alt={profile.name}
                className="w-8 h-8 rounded-full border border-indigo-500/50 object-cover"
              />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>Welcome back, {profile.name.split(' ')[0]}</span>
                <span>👋</span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Let's continue your learning journey.
              </p>
            </div>

            {/* 4 Primary Stats Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {/* Stat 1: Total Quizzes */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 text-center space-y-1">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total Quizzes</span>
                <span className="text-xl font-black text-indigo-400 font-mono">{totalQuizzes}</span>
              </div>

              {/* Stat 2: Correct Answers */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 text-center space-y-1">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Correct Answers</span>
                <span className="text-xl font-black text-emerald-400 font-mono">{correctAnswers}</span>
              </div>

              {/* Stat 3: Wrong Answers */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 text-center space-y-1">
                <div className="w-7 h-7 rounded-xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Wrong Answers</span>
                <span className="text-xl font-black text-red-400 font-mono">{wrongAnswers}</span>
              </div>

              {/* Stat 4: Less Confident */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 text-center space-y-1">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Less Confident</span>
                <span className="text-xl font-black text-amber-400 font-mono">{lessConfident}</span>
              </div>
            </div>
          </div>

          {/* Recent Quizzes Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recent Quizzes</h3>

            <div className="space-y-3">
              {recentList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => item.attempt && onOpenAttemptDetail(item.attempt)}
                  className="p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 flex items-center justify-between transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="p-2.5 rounded-xl bg-slate-800 text-indigo-400 flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-slate-100 truncate">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.questions} Questions · {item.date}
                      </p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                    item.score >= 80 
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60' 
                      : item.score >= 60 
                      ? 'bg-amber-950/80 text-amber-400 border-amber-800/60' 
                      : 'bg-red-950/80 text-red-400 border-red-800/60'
                  }`}>
                    {item.score}%
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={onOpenDocuments}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Upload New Material</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Quiz Runner Preview Card (4 cols on lg) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl relative">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Question 7 / 20</span>
            <span className="flex items-center gap-1 text-slate-400 font-mono">
              ⏱️ 00:15
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full w-[35%]" />
          </div>

          {/* Question Text */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-100 leading-relaxed">
              Which of the following is the maximum water cement ratio for M25 grade concrete?
            </p>
          </div>

          {/* MCQ Options A, B, C, D */}
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between cursor-pointer hover:border-slate-700">
              <span className="font-bold text-slate-400">A</span>
              <span className="font-medium">0.35</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/80 text-xs text-emerald-300 flex items-center justify-between font-bold shadow-md">
              <div className="flex items-center space-x-2">
                <span className="text-emerald-400 font-black">B</span>
                <span>0.40</span>
              </div>
              <Check className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between cursor-pointer hover:border-slate-700">
              <span className="font-bold text-slate-400">C</span>
              <span className="font-medium">0.45</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between cursor-pointer hover:border-slate-700">
              <span className="font-bold text-slate-400">D</span>
              <span className="font-medium">0.50</span>
            </div>
          </div>

          {/* Confidence Selector */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 block">Confidence Level</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedConfidence('low')}
                className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 border transition-all ${
                  selectedConfidence === 'low'
                    ? 'bg-amber-950 text-amber-300 border-amber-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                <span>😟</span>
                <span>Low</span>
              </button>

              <button
                onClick={() => setSelectedConfidence('medium')}
                className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 border transition-all ${
                  selectedConfidence === 'medium'
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                <span>😐</span>
                <span>Medium</span>
              </button>

              <button
                onClick={() => setSelectedConfidence('high')}
                className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 border transition-all ${
                  selectedConfidence === 'high'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                <span>😄</span>
                <span>High</span>
              </button>
            </div>
          </div>

          {/* Nav Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onStartQuizGen}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={onStartQuizGen}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Daily Study Planner Section */}
      <DailyStudyPlanner
        profile={profile}
        documents={documents}
        attempts={attempts}
        onStartQuizGen={onStartQuizGen}
        onOpenDocuments={onOpenDocuments}
        onOpenNotesAndCards={onOpenNotesAndCards}
        onRetryWrongQuestions={onRetryWrongQuestions}
      />

      {/* LOWER SECTION: 3 Cards Row (Upload Material | Smart Revision | Performance Overview) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        
        {/* CARD 1: Upload Material */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between shadow-xl">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Upload Material</h3>

          {/* Drag & Drop Box */}
          <div 
            onClick={onOpenDocuments}
            className="border-2 border-dashed border-indigo-500/40 hover:border-indigo-400 rounded-2xl p-6 text-center space-y-3 bg-indigo-950/20 hover:bg-indigo-950/30 transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-200">
                Drag & drop your PDF or TXT file here
              </p>
              <p className="text-[10px] text-indigo-400 font-semibold underline">
                or click to browse
              </p>
              <p className="text-[10px] text-slate-400">
                Supports PDF, TXT up to 20MB
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDocuments();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow"
            >
              Choose File
            </button>
          </div>

          {/* Uploaded File Item Preview */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <div className="truncate">
                <span className="font-bold text-slate-200 block truncate">Concrete Technology.pdf</span>
                <span className="text-[10px] text-slate-400 font-mono">2.4 MB</span>
              </div>
            </div>
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Check className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* CARD 2: Smart Revision */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Smart Revision</h3>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => setSmartRevisionTab('wrong')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                smartRevisionTab === 'wrong'
                  ? 'bg-red-950/80 text-red-300 border border-red-800/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Wrong Answers ({profile.wrongQuestionIds.length || 8})
            </button>

            <button
              onClick={() => setSmartRevisionTab('low')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                smartRevisionTab === 'low'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Less Confident ({profile.lowConfidenceQuestionIds.length || 12})
            </button>
          </div>

          {/* Sample Question Items */}
          <div className="space-y-2.5">
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <p className="font-bold text-slate-200">1. What is the slump test used for?</p>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-red-400 font-semibold">Your Answer: <span className="font-normal">Option B</span></span>
                <span className="text-emerald-400 font-semibold">Correct: <span className="font-normal">Option C</span></span>
              </div>
              <button
                onClick={onRetryWrongQuestions}
                className="mt-1 w-full text-center py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/50 text-[11px] font-bold transition-colors"
              >
                Practice
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <p className="font-bold text-slate-200">2. Which cement is used for mass concrete?</p>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-red-400 font-semibold">Your Answer: <span className="font-normal">Option A</span></span>
                <span className="text-emerald-400 font-semibold">Correct: <span className="font-normal">Option B</span></span>
              </div>
              <button
                onClick={onRetryWrongQuestions}
                className="mt-1 w-full text-center py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/50 text-[11px] font-bold transition-colors"
              >
                Practice
              </button>
            </div>
          </div>
        </div>

        {/* CARD 3: Performance Overview */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between shadow-xl">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Performance Overview</h3>

          {/* Donut Chart Visual */}
          <div className="flex items-center justify-center my-2 relative">
            <div className="w-32 h-32 rounded-full border-8 border-emerald-500 border-t-red-500 border-r-amber-500 flex flex-col items-center justify-center text-center shadow-lg">
              <span className="text-2xl font-black text-white font-mono">{overallAccuracy}%</span>
              <span className="text-[10px] text-slate-400 font-semibold">Overall Score</span>
            </div>
          </div>

          {/* Metrics Legend */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Correct</span>
              </div>
              <span className="font-mono font-bold text-emerald-400">{correctAnswers} ({overallAccuracy}%)</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Wrong</span>
              </div>
              <span className="font-mono font-bold text-red-400">{wrongAnswers} (20%)</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Less Confident</span>
              </div>
              <span className="font-mono font-bold text-amber-400">{lessConfident}</span>
            </div>
          </div>

          <p className="text-[11px] text-center text-slate-400 font-semibold pt-1 border-t border-slate-800">
            Keep practicing and stay consistent! 🌟
          </p>
        </div>
      </div>

      {/* BOTTOM PROCESS WORKFLOW STEPPERS BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 overflow-x-auto shadow-xl">
        <div className="flex items-center justify-between min-w-[700px] text-xs font-bold text-slate-300">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span>Upload PDF / TXT</span>
          </div>
          <span className="text-slate-600">→</span>

          <div className="flex items-center space-x-2">
            <BrainCircuit className="w-4 h-4 text-violet-400" />
            <span>AI Extracts Content</span>
          </div>
          <span className="text-slate-600">→</span>

          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-sky-400" />
            <span>Generates Questions</span>
          </div>
          <span className="text-slate-600">→</span>

          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Take Quiz</span>
          </div>
          <span className="text-slate-600">→</span>

          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>Track & Improve</span>
          </div>
          <span className="text-slate-600">→</span>

          <div className="flex items-center space-x-2">
            <RotateCcw className="w-4 h-4 text-red-400" />
            <span>Smart Revision</span>
          </div>
          <span className="text-slate-600">→</span>

          <div className="flex items-center space-x-2 text-indigo-400">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Master the Topic</span>
          </div>
        </div>
      </div>

      {/* FOOTER TAGLINE BANNER */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 rounded-2xl p-4 text-center text-white text-xs font-bold shadow-xl">
        Smart Exam Preparation – Your AI Study Companion for Smarter Learning & Better Results.
      </div>
    </div>
  );
};

