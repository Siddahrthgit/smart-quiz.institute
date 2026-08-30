import React from 'react';
import { FeatureChatWidget } from './FeatureChatWidget';
import { Sparkles, FileText, Target, Users, ShieldCheck, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center space-y-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI-powered exam preparation</span>
        </div>

        <p className="text-emerald-400 text-sm md:text-base font-semibold uppercase tracking-wide">
          Make Your Own Mock Test
        </p>

        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
          Turn your study material into quizzes, and turn weak topics into strengths.
        </h1>

        <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
          Upload your notes or PDFs, get instant AI-generated quizzes, and practice the questions
          you actually get wrong — until they're not weak spots anymore.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-16 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FeatureCard
          icon={<FileText className="w-5 h-5" />}
          title="Upload, then quiz instantly"
          description="Drop in a PDF or notes and get an AI-generated quiz built from your own material — not generic questions."
        />
        <FeatureCard
          icon={<Target className="w-5 h-5" />}
          title="Focus on your weak areas"
          description="Wrong answers get tracked and retested automatically, so you spend time where it actually matters."
        />
        <FeatureCard
          icon={<Users className="w-5 h-5" />}
          title="Study with friends"
          description="Compare progress with people you choose to share with — private by default, no public leaderboards."
        />
        <FeatureCard
          icon={<ShieldCheck className="w-5 h-5" />}
          title="Built on real question banks"
          description="Grounded in real exam question sets, not just AI-invented questions with no source material."
        />
      </div>

      <div className="border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-3xl mx-auto px-6 py-10 text-center space-y-2">
          <p className="text-sm text-slate-400">
            Every quiz is generated from material you upload or from curated question banks —
            no filler, no random trivia.
          </p>
        </div>
      <FeatureChatWidget />
      </div>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description,
}) => (
  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
    <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
      {icon}
    </div>
    <h3 className="text-sm font-bold text-white">{title}</h3>
    <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
  </div>
);
