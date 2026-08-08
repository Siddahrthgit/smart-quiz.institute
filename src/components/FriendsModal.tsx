import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  UserCheck, 
  UserMinus, 
  TrendingUp, 
  Flame, 
  Award, 
  X, 
  Sparkles, 
  CheckCircle2, 
  BarChart2,
  Mail,
  ShieldCheck
} from 'lucide-react';
import { FriendUser } from '../types';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendsList: FriendUser[];
  onToggleFriend: (friend: FriendUser) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  friendsList,
  onToggleFriend,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<FriendUser[]>(friendsList);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-friends' | 'find-friends'>('my-friends');

  useEffect(() => {
    fetchUsers(searchQuery);
  }, [searchQuery]);

  const fetchUsers = async (q: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/friends?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.users) {
        // Sync with local isAdded state
        const updated = data.users.map((u: FriendUser) => ({
          ...u,
          isAdded: friendsList.some((f) => f.id === u.id),
        }));
        setAllUsers(updated);
      }
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const myFriends = allUsers.filter((u) => friendsList.some((f) => f.id === u.id));
  const suggestedUsers = allUsers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Friends & Peer Exam Progress</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                  {friendsList.length} Connected
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Search by username or Gmail email to connect, compare study streaks, and monitor exam score improvements.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input & Navigation Tabs */}
        <div className="p-5 border-b border-slate-800 space-y-4 bg-slate-900/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username (e.g. alex_chen) or Gmail (e.g. rahul.sharma@gmail.com)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('my-friends')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'my-friends'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              My Friends ({friendsList.length})
            </button>

            <button
              onClick={() => setActiveTab('find-friends')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'find-friends'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              Discover & Search Users
            </button>
          </div>
        </div>

        {/* User Cards Scroll Body */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Searching network...</p>
            </div>
          ) : (activeTab === 'my-friends' ? myFriends : suggestedUsers).length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">No friends found matching your search</p>
              <p className="text-[11px] text-slate-500">Try searching for usernames or emails like 'alex_chen' or 'gmail.com'</p>
            </div>
          ) : (
            (activeTab === 'my-friends' ? myFriends : suggestedUsers).map((user) => {
              const isAdded = friendsList.some((f) => f.id === user.id);
              return (
                <div
                  key={user.id}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700/80 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img
                        src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                        alt={user.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-700"
                      />
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-slate-100">{user.name}</h3>
                        <span className="text-[10px] text-indigo-400 font-mono">@{user.username}</span>
                      </div>

                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{user.email}</span>
                      </p>

                      {user.lastExamTitle && (
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 pt-1">
                          <span className="text-slate-500">Latest Exam:</span>
                          <span className="text-slate-300 font-medium">{user.lastExamTitle}</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">
                            {user.lastExamScore}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Friend Improvement Metrics */}
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <div className="flex items-center space-x-3 text-center">
                      <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 block font-semibold uppercase">Exam Gain</span>
                        <span className="text-xs font-black text-emerald-400 flex items-center justify-center gap-0.5">
                          <TrendingUp className="w-3 h-3" />
                          +{user.examImprovementPercentage}%
                        </span>
                      </div>

                      <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 block font-semibold uppercase">Streak</span>
                        <span className="text-xs font-black text-amber-400 flex items-center justify-center gap-0.5">
                          <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {user.streakDays}d
                        </span>
                      </div>

                      <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-400 block font-semibold uppercase">XP</span>
                        <span className="text-xs font-black text-indigo-300 font-mono">
                          {user.xp}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onToggleFriend(user)}
                      className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        isAdded
                          ? 'bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/80'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add Friend</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5 text-indigo-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Peer Progress Sync Active</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
