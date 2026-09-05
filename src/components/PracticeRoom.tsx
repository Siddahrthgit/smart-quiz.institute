import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Edit3, 
  Sparkles, 
  CheckCircle2, 
  Volume2, 
  AlertCircle, 
  Award,
  RefreshCw,
  BrainCircuit
} from 'lucide-react';
import { QuizAttempt, Question, QuizConfig } from '../types';
import { MistakePracticeAI } from './MistakePracticeAI';

interface PracticeRoomProps {
  attempts: QuizAttempt[];
  onStartTargetedQuiz: (quizTitle: string, questions: Question[], config: QuizConfig) => void;
  initialTab?: 'mistakes' | 'speaking' | 'writing';
}

export const PracticeRoom: React.FC<PracticeRoomProps> = ({
  attempts,
  onStartTargetedQuiz,
  initialTab = 'mistakes',
}) => {
  const [activeTab, setActiveTab] = useState<'mistakes' | 'speaking' | 'writing'>(initialTab);

  // Speaking state
  const [isRecording, setIsRecording] = useState(false);
  const [targetPrompt, setTargetPrompt] = useState(
    'Supervised learning relies on labeled training datasets where input features map to known ground truth target outputs.'
  );
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [speakingFeedback, setSpeakingFeedback] = useState<any | null>(null);
  const [isAnalyzingSpeech, setIsAnalyzingSpeech] = useState(false);

  // Speech Recognition ref
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const sr = new SpeechRecognition();
        sr.continuous = true;
        sr.interimResults = true;
        sr.lang = 'en-US';

        sr.onresult = (event: any) => {
          let current = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            current += event.results[i][0].transcript;
          }
          setSpokenTranscript(current);
        };

        sr.onerror = (err: any) => {
          console.error('Speech recognition error:', err);
          setIsRecording(false);
        };

        setRecognition(sr);
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) {
      alert('Web Speech API is not supported in this browser environment. You can type your transcript manually below.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setSpokenTranscript('');
      setSpeakingFeedback(null);
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleAnalyzeSpeech = async () => {
    if (!spokenTranscript.trim()) return;
    setIsAnalyzingSpeech(true);

    try {
      const res = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Target Spoken Passage: "${targetPrompt}"`,
          correctAnswer: targetPrompt,
          userAnswer: spokenTranscript,
        }),
      });

      const data = await res.json();
      if (data.success && data.evaluation) {
        setSpeakingFeedback(data.evaluation);
      }
    } catch (err) {
      console.error('Speech analysis failed:', err);
    } finally {
      setIsAnalyzingSpeech(false);
    }
  };

  // Writing state
  const [writingPrompt, setWritingPrompt] = useState(
    'Explain the fundamental differences between Overfitting and Underfitting in Machine Learning, and list two common regularization techniques used to mitigate overfitting.'
  );
  const [writingText, setWritingText] = useState('');
  const [writingFeedback, setWritingFeedback] = useState<any | null>(null);
  const [isEvaluatingWriting, setIsEvaluatingWriting] = useState(false);

  const handleEvaluateWriting = async () => {
    if (!writingText.trim()) return;
    setIsEvaluatingWriting(true);

    try {
      const res = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: writingPrompt,
          correctAnswer: 'Overfitting happens when a model fits training noise and details too closely, failing to generalize. Underfitting occurs when a model is too simple to capture underlying data patterns. Regularization techniques include L1/L2 weight penalties and Dropout.',
          userAnswer: writingText,
        }),
      });

      const data = await res.json();
      if (data.success && data.evaluation) {
        setWritingFeedback(data.evaluation);
      }
    } catch (err) {
      console.error('Writing evaluation error:', err);
    } finally {
      setIsEvaluatingWriting(false);
    }
  };

  const handleNavigateFromMistakes = (type: 'speaking' | 'writing', promptText: string) => {
    if (type === 'speaking') {
      setTargetPrompt(promptText);
      setSpokenTranscript('');
      setSpeakingFeedback(null);
      setActiveTab('speaking');
    } else {
      setWritingPrompt(promptText);
      setWritingText('');
      setWritingFeedback(null);
      setActiveTab('writing');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Sub-Nav */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">AI Practice & Weakness Focus Studio</h1>
            <p className="text-xs text-slate-400">
              Practice targeted wrong questions, voice pronunciations, and AI essay writing.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700/80">
          <button
            onClick={() => setActiveTab('mistakes')}
            className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'mistakes' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BrainCircuit className="w-4 h-4 text-amber-300" />
            <span>Questions Focused AI</span>
          </button>

          <button
            onClick={() => setActiveTab('speaking')}
            className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'speaking' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Speaking Exam</span>
          </button>

          <button
            onClick={() => setActiveTab('writing')}
            className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'writing' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Writing Exam</span>
          </button>
        </div>
      </div>

      {/* Mistakes Focused AI */}
      {activeTab === 'mistakes' && (
        <MistakePracticeAI
          attempts={attempts}
          onStartTargetedQuiz={onStartTargetedQuiz}
          onNavigateToPractice={handleNavigateFromMistakes}
        />
      )}

      {/* Speaking Exam */}
      {activeTab === 'speaking' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 block font-mono">
              Speaking Exam Passage:
            </span>
            <p className="text-sm font-semibold text-white leading-relaxed">"{targetPrompt}"</p>
          </div>

          <div className="flex flex-col items-center justify-center space-y-4 py-6">
            <button
              onClick={toggleRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-95 ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-500/50'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}
            >
              {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
            <p className="text-xs text-slate-400 font-medium">
              {isRecording ? '🔴 Listening... Speak now into your microphone' : 'Click microphone icon to record your speech'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium block">Spoken Transcript / Typed Text:</label>
            <textarea
              rows={3}
              value={spokenTranscript}
              onChange={(e) => setSpokenTranscript(e.target.value)}
              placeholder="Your spoken words will appear here automatically..."
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl p-4 text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleAnalyzeSpeech}
            disabled={!spokenTranscript.trim() || isAnalyzingSpeech}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isAnalyzingSpeech ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Evaluating Fluency & Pronunciation with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Evaluate Spoken Accuracy</span>
              </>
            )}
          </button>

          {speakingFeedback && (
            <div className="p-5 rounded-2xl bg-slate-800/90 border border-violet-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-violet-300 font-bold text-xs">
                  <Award className="w-4 h-4 text-violet-400" />
                  <span>AI Fluency Score:</span>
                </div>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {speakingFeedback.scorePercentage}%
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{speakingFeedback.feedback}</p>
            </div>
          )}
        </div>
      )}

      {/* Writing Exam */}
      {activeTab === 'writing' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 block font-mono">
              Writing Exam Prompt:
            </span>
            <p className="text-sm font-semibold text-white leading-relaxed">{writingPrompt}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-medium block">Your Essay / Written Response:</label>
            <textarea
              rows={6}
              value={writingText}
              onChange={(e) => setWritingText(e.target.value)}
              placeholder="Type your detailed answer here..."
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl p-4 text-xs md:text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleEvaluateWriting}
            disabled={!writingText.trim() || isEvaluatingWriting}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isEvaluatingWriting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Rubric Evaluation in Progress...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Evaluate Essay with AI</span>
              </>
            )}
          </button>

          {writingFeedback && (
            <div className="p-5 rounded-2xl bg-slate-800/90 border border-violet-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-violet-300 font-bold text-xs">
                  <Award className="w-4 h-4 text-violet-400" />
                  <span>Rubric Score:</span>
                </div>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {writingFeedback.scorePercentage} / 100
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{writingFeedback.feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
