import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, FileText, Settings, HelpCircle, Cloud, Clock, ShieldAlert,
  CheckSquare, Square, AlertCircle, Upload, CheckCircle2, Trash2, TrendingUp,
} from 'lucide-react';
import { DocumentItem, Difficulty, QuestionType, QuizConfig } from '../types';

interface QuizGeneratorProps {
  profile?: { xp: number; streakDays: number };
  attempts?: { totalQuestions: number; correctCount: number }[];
  documents: DocumentItem[];
  onGenerateQuiz: (config: QuizConfig) => Promise<void>;
  onUploadFile?: (file: File) => Promise<void>;
  onDeleteDocument?: (docId: string) => void;
  onOpenDocuments: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const QuizGenerator: React.FC<QuizGeneratorProps> = ({
  attempts = [], documents, onGenerateQuiz, onUploadFile, onDeleteDocument,
  onOpenDocuments, isLoading, error,
}) => {
  const [sourceMode, setSourceMode] = useState<'doc' | 'topic'>('doc');
  const [selectedDocId, setSelectedDocId] = useState(documents[0]?.id || '');
  const [customTopic, setCustomTopic] = useState('');
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(['mcq', 'true_false', 'fill_blank']);
  const [isExamMode, setIsExamMode] = useState(false);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [timeLimitPerQuestion, setTimeLimitPerQuestion] = useState(60);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (documents.length && (!selectedDocId || !documents.some((d) => d.id === selectedDocId))) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadFile) return;
    setIsUploadingPdf(true);
    try { await onUploadFile(file); } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleType = (type: QuestionType) => {
    setSelectedTypes((current) => current.includes(type)
      ? (current.length === 1 ? current : current.filter((t) => t !== type))
      : [...current, type]);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onGenerateQuiz({
      documentId: sourceMode === 'doc' ? selectedDocId : undefined,
      topic: sourceMode === 'topic' ? customTopic : undefined,
      numQuestions, difficulty, questionTypes: selectedTypes, isExamMode,
      negativeMarking: isExamMode ? negativeMarking : false,
      timeLimitPerQuestion: isExamMode ? timeLimitPerQuestion : 0,
    });
  };

  const availableTypes: { id: QuestionType; label: string; desc: string }[] = [
    { id: 'mcq', label: 'Multiple Choice (MCQ)', desc: 'Standard 4-option questions with explanations' },
    { id: 'short_answer', label: 'Short Answer', desc: 'Brief written answers evaluated by AI' },
    { id: 'long_answer', label: 'Long Answer / Essay', desc: 'Detailed explanations graded with AI rubrics' },
  ];
  const totalQ = attempts.reduce((sum, a) => sum + a.totalQuestions, 0);
  const correctQ = attempts.reduce((sum, a) => sum + a.correctCount, 0);
  const accuracy = totalQ ? Math.round((correctQ / totalQ) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bento-card bg-slate-50 border-slate-200 p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Sparkles className="w-6 h-6 text-indigo-400" /><div>
          <h1 className="text-xl font-black text-slate-900">AI Quiz Generator</h1>
          <p className="text-xs text-slate-600">Create a quiz from your study material.</p>
        </div></div>
        <span className="status-chip active">Gemini</span>
      </div>
      {error && <div className="bg-red-950/60 border border-red-800 p-4 rounded-xl text-red-300 text-xs flex gap-3"><AlertCircle className="w-5 h-5" />{error}</div>}

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="bento-card bg-slate-50 border-slate-200 p-6 space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-400" />1. Study material</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSourceMode('doc')} className={`px-4 py-2 rounded-lg border text-xs ${sourceMode === 'doc' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>Uploaded document</button>
            <button type="button" onClick={() => setSourceMode('topic')} className={`px-4 py-2 rounded-lg border text-xs ${sourceMode === 'topic' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>Topic</button>
          </div>
          {sourceMode === 'doc' ? <div className="space-y-3">
            <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md" onChange={handlePdfUpload} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPdf} className="w-full p-5 rounded-xl border border-dashed border-indigo-500/50 bg-indigo-950/20 text-xs text-left">
              <Upload className="inline w-4 h-4 mr-2" />{isUploadingPdf ? 'Uploading and parsing…' : 'Upload PDF / document'}
            </button>
            {documents.length ? <select value={selectedDocId} onChange={(e) => setSelectedDocId(e.target.value)} className="w-full bg-slate-100 border rounded-xl px-4 py-2.5 text-xs text-slate-900">{documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.name}</option>)}</select> : <div className="text-xs text-slate-600 text-center">No documents yet. Upload a PDF or open the materials store.</div>}
            {documents.length === 0 && <button type="button" onClick={onOpenDocuments} className="mx-auto flex items-center gap-2 text-xs text-indigo-500"><Cloud className="w-4 h-4" />Open materials store</button>}
            {documents.find((d) => d.id === selectedDocId) && <div className="p-3 rounded-xl bg-slate-100 border text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Ready: {documents.find((d) => d.id === selectedDocId)?.name}{onDeleteDocument && <button type="button" className="ml-auto text-red-500" onClick={() => onDeleteDocument(selectedDocId)}><Trash2 className="w-4 h-4" /></button>}</div>}
          </div> : <input value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="Enter a subject or topic" className="w-full bg-slate-100 border rounded-xl px-4 py-2.5 text-xs text-slate-900" />}
        </div>

        <div className="bento-card bg-slate-50 border-slate-200 p-6 space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2"><Settings className="w-4 h-4 text-indigo-400" />2. Difficulty and volume</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div><label className="text-xs text-slate-600">Difficulty</label><div className="flex gap-2 mt-2">{(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => <button key={d} type="button" onClick={() => setDifficulty(d)} className={`px-3 py-2 rounded-lg border text-xs capitalize ${difficulty === d ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>{d}</button>)}</div></div>
            <div><label className="text-xs text-slate-600">Questions: {numQuestions}</label><input type="range" min={3} max={100} value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} className="w-full accent-indigo-500 mt-3" /></div>
          </div>
          {totalQ > 0 && <div className="text-xs text-slate-600 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-400" />Recent accuracy: {accuracy}%</div>}
        </div>

        <div className="bento-card bg-slate-50 border-slate-200 p-6 space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2"><HelpCircle className="w-4 h-4 text-indigo-400" />3. Question formats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{availableTypes.map((t) => <button type="button" key={t.id} onClick={() => toggleType(t.id)} className={`p-3 rounded-xl border text-left ${selectedTypes.includes(t.id) ? 'bg-indigo-950/30 border-indigo-500' : 'bg-slate-100'}`}><span className="flex gap-2 text-xs font-semibold">{selectedTypes.includes(t.id) ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4" />}{t.label}</span><span className="text-[11px] text-slate-600 ml-6">{t.desc}</span></button>)}</div>
        </div>

        <div className="bento-card bg-slate-50 border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-400" /><div><h2 className="text-sm font-bold">Exam mode</h2><p className="text-[11px] text-slate-600">Timer and optional negative marking</p></div></div><input type="checkbox" checked={isExamMode} onChange={(e) => setIsExamMode(e.target.checked)} /></div>
          {isExamMode && <div className="border-t pt-3 grid sm:grid-cols-2 gap-4"><label className="text-xs">Seconds per question<input type="number" min={15} max={300} value={timeLimitPerQuestion} onChange={(e) => setTimeLimitPerQuestion(Number(e.target.value) || 60)} className="block w-full mt-2 border rounded px-3 py-2 text-xs" /></label><label className="text-xs flex items-center gap-2"><input type="checkbox" checked={negativeMarking} onChange={(e) => setNegativeMarking(e.target.checked)} />Negative marking</label></div>}
        </div>

        <button type="submit" disabled={isLoading || (sourceMode === 'doc' && !selectedDocId) || (sourceMode === 'topic' && !customTopic.trim())} className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2">
          {isLoading ? <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating with Gemini…</> : <><Sparkles className="w-5 h-5" />Generate quiz</>}
        </button>
      </form>
    </div>
  );
};
