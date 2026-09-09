import React from 'react';
import { 
  Sparkles, 
  BookOpen, 
  FileText, 
  BarChart2, 
  Flame, 
  Award, 
  Cloud, 
  Layers, 
  Mic, 
  User,
  Plus,
  Users,
  Bell
} from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: UserProfile;
  onOpenAuth: () => void;
  onQuickGenerate: () => void;
  onOpenFriends: () => void;
  onRequestNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  profile,
  onOpenAuth,
  onQuickGenerate,
  onOpenFriends,
  onRequestNotifications,
}) => {
  const nextLevelXp = profile.level * 200;
  const xpPercent = Math.min(100, Math.round((profile.xp / nextLevelXp) * 100));

  const navItems = [
    { id: 'documents', label: 'Materials & Drive', icon: BookOpen },
    { id: 'notes-cards', label: 'Notes & Flashcards', icon: FileText },
    { id: 'practice', label: 'Speaking & Writing', icon: Mic },
    { id: 'analytics', label: 'Analytics & Badges', icon: Layers },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div 
            className="flex items-center space-x-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Study Planner <span className="text-indigo-400 font-mono text-xs px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-800">AI</span>
              </span>
              <p className="text-[11px] text-slate-400 -mt-0.5">Intelligent Study Platform</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center space-x-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40 scale-[1.02]'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile & XP Stats */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Friends Quick Access Button */}
            <button
              onClick={onOpenFriends}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all shadow-sm"
              title="Friends & Peer Exam Improvements"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Friends</span>
            </button>

            {/* Streak Counter */}
            <div className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-950/40 border border-amber-800/40 rounded-lg text-amber-400 text-xs font-semibold" title="Daily Study Streak">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
              <span>{profile.streakDays}d</span>
            </div>

            {/* XP & Level Badge */}
            <div className="hidden lg:flex flex-col text-right w-28">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Lvl {profile.level}</span>
                <span className="text-indigo-300 font-mono font-semibold">{profile.xp} XP</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-500" 
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
{/* Notification Bell */}
            <button
              onClick={onRequestNotifications}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="Enable Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            {/* Account Icon */}
            <button
              onClick={onOpenAuth}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
              title="User Account"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800 bg-slate-900 px-2 py-2.5 overflow-x-auto gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 mb-1" />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={onOpenFriends}
          className="flex flex-col items-center px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all flex-shrink-0 text-indigo-400 hover:text-white hover:bg-slate-800"
        >
          <Users className="w-4 h-4 mb-1" />
          <span className="whitespace-nowrap">Friends</span>
        </button>
      </div>
    </header>
  );
};
