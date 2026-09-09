import React, { useState } from 'react';
import { 
  Calendar, 
  Target, 
  CheckSquare, 
  Square, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  Plus, 
  ChevronRight, 
  BookOpen, 
  HelpCircle, 
  FileText, 
  Flame, 
  TrendingUp,
  Brain,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { UserProfile, DocumentItem, QuizAttempt } from '../types';

interface DailyStudyPlannerProps {
  profile: UserProfile;
  documents: DocumentItem[];
  attempts: QuizAttempt[];
  onStartQuizGen: () => void;
  onOpenDocuments: () => void;
  onOpenNotesAndCards: () => void;
  onRetryWrongQuestions: () => void;
}

interface DeadlineItem {
  id: string;
  title: string;
  subject: string;
  daysRemaining: number;
  urgency: 'high' | 'medium' | 'low';
  targetScore: number;
}

interface DailyTask {
  id: string;
  title: string;
  category: 'Quiz' | 'Document' | 'Flashcards' | 'Practice';
  estimatedMinutes: number;
  completed: boolean;
  xpReward: number;
}

export const DailyStudyPlanner: React.FC<DailyStudyPlannerProps> = ({
  profile,
  documents,
  attempts,
  onStartQuizGen,
  onOpenDocuments,
  onOpenNotesAndCards,
  onRetryWrongQuestions,
}) => {
  // Deadlines State
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([
    {
      id: 'd1',
      title: 'Concrete Technology Midterm',
      subject: 'Civil Engineering',
      daysRemaining: 2,
      urgency: 'high',
      targetScore: 90,
    },
    {
      id: 'd2',
      title: 'Highway Engineering Quiz',
      subject: 'Transportation',
      daysRemaining: 5,
      urgency: 'medium',
      targetScore: 85,
    },
    {
      id: 'd3',
      title: 'RCC Structures Design Exam',
      subject: 'Structural Eng.',
      daysRemaining: 9,
      urgency: 'low',
      targetScore: 88,
    },
  ]);

  // Daily Tasks State
  const [tasks, setTasks] = useState<DailyTask[]>([
    {
      id: 't1',
      title: 'Review 8 wrong questions from Concrete Technology',
      category: 'Quiz',
      estimatedMinutes: 15,
      completed: true,
      xpReward: 50,
    },
    {
      id: 't2',
      title: 'Study Chapter 3 PDF: Water-Cement Ratio & Slump Test',
      category: 'Document',
      estimatedMinutes: 20,
      completed: false,
      xpReward: 40,
    },
    {
      id: 't3',
      title: 'Practice 15 low-confidence flashcards on Mass Concrete',
      category: 'Flashcards',
      estimatedMinutes: 10,
      completed: false,
      xpReward: 30,
    },
  ]);

  // Form states
  const [showAddDeadline, setShowAddDeadline] = useState(false);
  const [newDeadlineTitle, setNewDeadlineTitle] = useState('');
  const [newDeadlineDays, setNewDeadlineDays] = useState(3);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<'Quiz' | 'Document' | 'Flashcards' | 'Practice'>('Quiz');

  // Toggle task completion
  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  // Add custom task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: DailyTask = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      estimatedMinutes: 15,
      completed: false,
      xpReward: 35,
    };
    setTasks((prev) => [...prev, newTask]);
    setNewTaskTitle('');
  };

  // Add custom deadline
  const handleAddDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeadlineTitle.trim()) return;
    const days = Number(newDeadlineDays) || 3;
    const newDeadline: DeadlineItem = {
      id: `d_${Date.now()}`,
      title: newDeadlineTitle.trim(),
      subject: 'General Study',
      daysRemaining: days,
      urgency: days <= 3 ? 'high' : days <= 6 ? 'medium' : 'low',
      targetScore: 85,
    };
    setDeadlines((prev) => [newDeadline, ...prev]);
    setNewDeadlineTitle('');
    setShowAddDeadline(false);
  };

  const completedTaskCount = tasks.filter((t) => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedTaskCount / tasks.length) * 100) : 0;
  const totalEarnedXp = tasks.filter((t) => t.completed).reduce((acc, curr) => acc + curr.xpReward, 0);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl relative overflow-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-0.5 shadow-md shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white tracking-tight">Daily AI Study Planner</h2>
              <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                Adaptive
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Suggested topics & material based on your recent performance & deadlines.
            </p>
          </div>
        </div>

        {/* Daily Progress Widget */}
        <div className="flex items-center space-x-4 bg-slate-950/80 border border-slate-800 p-3 rounded-2xl">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-400">Today's Goal</span>
              <span className="text-emerald-400 font-mono">{progressPercent}%</span>
            </div>
            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div className="text-right pl-2 border-l border-slate-800">
            <span className="text-xs font-black text-amber-400 block font-mono">+{totalEarnedXp} XP</span>
            <span className="text-[10px] text-slate-400 font-semibold">{completedTaskCount}/{tasks.length} Completed</span>
          </div>
        </div>
      </div>

      {/* Grid: AI Recommendations & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT SUB-COLUMN: AI Recommended Focus Areas (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Recommended Study Focus Today</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-semibold">Priority Ranking</span>
          </div>

          <div className="space-y-3">
            {/* Rec 1: High Error Document */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 hover:border-indigo-400 transition-all space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Concrete Technology.pdf</h4>
                    <span className="text-[10px] text-red-400 font-semibold block">
                      Low Quiz Score (65%) · 8 Missed Concepts
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-red-950 text-red-300 border border-red-800/60 text-[10px] font-bold">
                  High Priority
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Focus on Water-Cement ratios for M25 concrete and slump test requirements. High error rate on recent quiz.
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500 font-mono">Est. Time: 20 mins</span>
                <button
                  onClick={onOpenDocuments}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1"
                >
                  <span>Study Material</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Rec 2: Low-Confidence Practice */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 hover:border-amber-400 transition-all space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Low Confidence Question Drill</h4>
                    <span className="text-[10px] text-amber-400 font-semibold block">
                      {profile.lowConfidenceQuestionIds.length || 12} Flagged Items Pending
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800/60 text-[10px] font-bold">
                  Medium Priority
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Review questions rated "Low" confidence to boost retention before the upcoming exam.
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500 font-mono">Est. Time: 15 mins</span>
                <button
                  onClick={onRetryWrongQuestions}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all flex items-center gap-1"
                >
                  <span>Practice Weak Items</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Rec 3: Targeted Quiz AI Generation */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-violet-500/50 transition-all space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Highway Engineering Self-Assessment</h4>
                    <span className="text-[10px] text-violet-400 font-semibold block">
                      Not Tested in 7 Days
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold">
                  Maintenance
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Generate a fresh 10-question AI quiz on flexible vs rigid pavements to maintain knowledge mastery.
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500 font-mono">Est. Time: 10 mins</span>
                <button
                  onClick={onStartQuizGen}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all flex items-center gap-1"
                >
                  <span>Generate Quiz</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SUB-COLUMN: Upcoming Deadlines & Daily Task Checklist (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Section A: Upcoming Deadlines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Upcoming Deadlines</span>
              </h3>
              <button
                onClick={() => setShowAddDeadline(!showAddDeadline)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Goal</span>
              </button>
            </div>

            {/* Add Deadline Form Modal/Input */}
            {showAddDeadline && (
              <form onSubmit={handleAddDeadline} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <input
                  type="text"
                  placeholder="Exam or Quiz Title..."
                  value={newDeadlineTitle}
                  onChange={(e) => setNewDeadlineTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={newDeadlineDays}
                    onChange={(e) => setNewDeadlineDays(Number(e.target.value))}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <span className="text-xs text-slate-400 font-semibold">days away</span>
                  <button
                    type="submit"
                    className="ml-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {deadlines.map((item) => (
                <div 
                  key={item.id}
                  className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5 truncate">
                    <h4 className="font-bold text-slate-200 truncate">{item.title}</h4>
                    <span className="text-[10px] text-slate-400">{item.subject} · Target: {item.targetScore}%</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl font-mono text-[11px] font-bold flex-shrink-0 border ${
                    item.daysRemaining <= 2
                      ? 'bg-red-950/80 text-red-400 border-red-800/60'
                      : item.daysRemaining <= 5
                      ? 'bg-amber-950/80 text-amber-400 border-amber-800/60'
                      : 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60'
                  }`}>
                    {item.daysRemaining} days left
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Today's Action Checklist */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
              <span>Today's Study Tasks</span>
            </h3>

            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    task.completed
                      ? 'bg-slate-950/50 border-emerald-900/40 text-slate-500 line-through'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <button className="flex-shrink-0 text-emerald-400">
                      {task.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-950" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    <span className="font-medium truncate">{task.title}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold flex-shrink-0 ml-2 px-2 py-0.5 rounded-lg ${
                    task.completed ? 'text-emerald-500 bg-emerald-950/30' : 'text-amber-400 bg-amber-950/30'
                  }`}>
                    +{task.xpReward} XP
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Add Task Form */}
            <form onSubmit={handleAddTask} className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                placeholder="Add study task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
