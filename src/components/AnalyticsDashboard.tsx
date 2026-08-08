import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  CartesianGrid 
} from 'recharts';
import { 
  Award, 
  Flame, 
  TrendingUp, 
  ShieldCheck, 
  Cloud, 
  Clock, 
  CheckCircle2, 
  Zap, 
  Layers,
  Crown
} from 'lucide-react';
import { UserProfile, QuizAttempt, Badge } from '../types';

interface AnalyticsDashboardProps {
  profile: UserProfile;
  attempts: QuizAttempt[];
  badges: Badge[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  profile,
  attempts,
  badges,
}) => {
  // Chart 1: Progress over time
  const progressData = attempts.map((att, idx) => ({
    name: `Quiz ${idx + 1}`,
    score: att.score,
    time: Math.round(att.timeSpentSeconds / 60),
  }));

  // Topic performance aggregate
  const topicStats: Record<string, { total: number; correct: number }> = {};
  attempts.forEach((att) => {
    att.questions.forEach((q) => {
      const topic = q.topic || 'General';
      if (!topicStats[topic]) topicStats[topic] = { total: 0, correct: 0 };
      topicStats[topic].total += 1;
      const ans = att.answers[q.id];
      if (ans && ans.isCorrect) topicStats[topic].correct += 1;
    });
  });

  const topicChartData = Object.keys(topicStats).map((topic) => {
    const stat = topicStats[topic];
    const acc = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    return {
      topic,
      accuracy: acc,
    };
  });

  // Mock Leaderboard
  const leaderboard = [
    { rank: 1, name: 'Alex Rivera', xp: 2450, streak: 12 },
    { rank: 2, name: `${profile.name} (You)`, xp: profile.xp, streak: profile.streakDays },
    { rank: 3, name: 'Sarah Chen', xp: 1820, streak: 8 },
    { rank: 4, name: 'Michael Scott', xp: 1400, streak: 5 },
  ].sort((a, b) => b.xp - a.xp);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bento-card bg-slate-900 border-slate-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Analytics Dashboard & Achievements</h1>
            <p className="text-xs text-slate-400">
              Track accuracy trajectories, topic mastery, daily streaks, and gamification rewards.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="status-chip active">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Level {profile.level} Scholar
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score Progression Line Chart */}
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Quiz Score Progression (%)</span>
            </h2>
            <span className="status-chip active">Live Trajectory</span>
          </div>

          <div className="h-64 w-full">
            {progressData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No attempt data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#818cf8', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Topic Performance Bar Chart */}
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Topic Mastery Accuracy (%)</span>
            </h2>
            <span className="status-chip checked">Topic Analytics</span>
          </div>

          <div className="h-64 w-full">
            {topicChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No topic data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="topic" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                  />
                  <Bar dataKey="accuracy" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Gamification Badges & Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Badges Collection */}
        <div className="md:col-span-2 bento-card bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Phase 8 Achievement Badges ({badges.length})</span>
            </h2>
            <span className="status-chip active">{badges.filter(b => b.progress >= 100).length} Unlocked</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {badges.map((badge) => {
              const isUnlocked = badge.progress >= 100;
              return (
                <div
                  key={badge.id}
                  className={`p-4 rounded-xl border transition-all flex items-start space-x-3 ${
                    isUnlocked
                      ? 'bg-indigo-950/30 border-indigo-500/50 text-slate-100'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-400 opacity-70'
                  }`}
                >
                  <div
                    className={`p-3 rounded-xl border flex-shrink-0 ${
                      isUnlocked
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    <Award className="w-5 h-5" />
                  </div>

                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white">{badge.title}</h3>
                      {isUnlocked && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{badge.description}</p>

                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-indigo-500 h-full"
                        style={{ width: `${badge.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Leaderboard */}
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Leaderboard</span>
            </h2>
            <span className="status-chip active">Global Rank</span>
          </div>

          <div className="space-y-3">
            {leaderboard.map((user, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  user.name.includes('(You)')
                    ? 'bg-indigo-950/60 border-indigo-500/80 text-white font-bold'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono flex items-center justify-center font-bold">
                    #{idx + 1}
                  </span>
                  <span>{user.name}</span>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-amber-400 flex items-center gap-1 font-mono text-[11px]">
                    <Flame className="w-3 h-3 text-amber-500" />
                    {user.streak}d
                  </span>
                  <span className="text-indigo-300 font-mono font-bold">{user.xp} XP</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
