import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  FileText, 
  Settings, 
  HelpCircle, 
  Cloud, 
  Clock, 
  ShieldAlert, 
  Shuffle, 
  Zap, 
  CheckSquare, 
  Square,
  AlertCircle,
  Upload,
  FileUp,
  CheckCircle2,
  Trash2,
  TrendingUp
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
  profile,
  attempts = [],
  documents,
  onGenerateQuiz,
  onUploadFile,
  onDeleteDocument,
  onOpenDocuments,
  isLoading,
  error,
}) => {
  const [sourceMode, setSourceMode] = useState<'doc' | 'topic'>('doc');
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [isUploadingPdf, setIsUploadingPdf] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (documents.length > 0 && (!selectedDocId || !documents.some((d) => d.id === selectedDocId))) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    'mcq',
    'true_false',
    'fill_blank',
  ]);

  const [isExamMode, setIsExamMode] = useState<boolean>(false);
  const [negativeMarking, setNegativeMarking] = useState<boolean>(false);
  const [timeLimitPerQuestion, setTimeLimitPerQuestion] = useState<number>(60); // 60s per question in exam mode

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadFile) return;
    setIsUploadingPdf(true);
    try {
      await onUploadFile(file);
    } catch (err) {
      console.error('PDF upload error:', err);
    } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalQ = attempts.reduce((acc, a) => acc + a.totalQuestions, 0);
  const correctQ = attempts.reduce((acc, a) => acc + a.correctCount, 0);
  const previewAccuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;

  const toggleType = (type: QuestionType) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length === 1) return; // Keep at least 1
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config: QuizConfig = {
      documentId: sourceMode === 'doc' ? selectedDocId : undefined,
      topic: sourceMode === 'topic' ? customTopic : undefined,
      numQuestions,
      difficulty,
      questionTypes: selectedTypes,
      isExamMode,
      negativeMarking: isExamMode ? negativeMarking : false,
      timeLimitPerQuestion: isExamMode ? timeLimitPerQuestion : 0,
    };
    onGenerateQuiz(config);
  };

  const availableTypes: { id: QuestionType; label: string; desc: string }[] = [
    { id: 'mcq', label: 'Multiple Choice (MCQ)', desc: 'Standard 4-option questions with explanations' },
    { id: 'true_false', label: 'True / False', desc: 'Fast concept verification questions' },
    { id: 'fill_blank', label: 'Fill in the Blanks', desc: 'Identify key terminology and concepts' },
    { id: 'match', label: 'Match the Following', desc: 'Connect terms with correct definitions' },
    { id: 'short_answer', label: 'Short Answer', desc: 'Brief written answers evaluated by AI' },
    { id: 'long_answer', label: 'Long Answer / Essay', desc: 'Detailed explanations graded with AI rubrics' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bento-card bg-slate-900 border-slate-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">AI Quiz Generator</h1>
            <p className="text-xs text-slate-400">
              Configure AI parameters to generate personalized quizzes from your study material.
            </p>
          </div>
        </div>
        <span className="status-chip active">
          Gemini 3.6 Flash
        </span>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-800/80 p-4 rounded-xl text-red-300 text-xs flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Source Material Selection */}
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>1. Select Study Material Source</span>
            </h2>
            <span className="status-chip checked">Step 1 of 3</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => setSourceMode('doc')}
              className={`p-4 rounded-xl border text-left transition-all ${
                sourceMode === 'doc'
                  ? 'bg-indigo-950/40 border-indigo-500 text-white'
                  : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold text-xs mb-1 flex items-center justify-between">
                <span>Uploaded Documents / Drive</span>
                {sourceMode === 'doc' && <Zap className="w-3.5 h-3.5 text-indigo-400" />}
              </div>
              <p className="text-[11px] opacity-80">Use text from PDF, TXT, or Google Drive notes</p>
            </button>

            <button
              type="button"
              onClick={() => setSourceMode('topic')}
              className={`p-4 rounded-xl border text-left transition-all ${
                sourceMode === 'topic'
                  ? 'bg-indigo-950/40 border-indigo-500 text-white'
                  : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold text-xs mb-1 flex items-center justify-between">
                <span>Custom Topic Prompt</span>
                {sourceMode === 'topic' && <Zap className="w-3.5 h-3.5 text-indigo-400" />}
              </div>
              <p className="text-[11px] opacity-80">Enter any academic subject or exam topic</p>
            </button>
          </div>

          {sourceMode === 'doc' ? (
            <div className="space-y-4 pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handlePdfUpload}
                className="hidden"
              />

              {/* PDF Upload Banner Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-xl bg-indigo-950/20 hover:bg-indigo-950/40 border border-dashed border-indigo-500/40 hover:border-indigo-400 cursor-pointer transition-all flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    {isUploadingPdf ? (
                      <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {isUploadingPdf ? 'Uploading & Parsing PDF...' : 'Upload PDF / Document to Generate Quiz'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Click to select or drag and drop any PDF textbook, lecture slides, or notes
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isUploadingPdf}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex-shrink-0"
                >
                  {isUploadingPdf ? 'Parsing...' : 'Select PDF File'}
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-center space-y-1">
                  <p className="text-xs text-slate-400">No documents in store yet. Upload a PDF above or import from Drive.</p>
                  <button
                    type="button"
                    onClick={onOpenDocuments}
                    className="inline-flex items-center space-x-1.5 text-xs text-indigo-400 hover:underline font-semibold"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Open Drive / Materials Store</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Select Target PDF / Document:</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {documents.length} document(s) available
                    </span>
                  </div>

                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        📄 {doc.name} ({doc.type.toUpperCase()} • {doc.sizeFormatted} • {doc.wordCount} words)
                      </option>
                    ))}
                  </select>

                  {/* Show Selected Document Card Info */}
                  {documents.find((d) => d.id === selectedDocId) && (
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-slate-200">
                        <span className="flex items-center gap-1.5 text-indigo-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Ready for Quiz Generation:</span>
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {documents.find((d) => d.id === selectedDocId)?.wordCount} words
                          </span>
                          {onDeleteDocument && (
                            <button
                              type="button"
                              onClick={() => {
                                const targetDoc = documents.find((d) => d.id === selectedDocId);
                                if (targetDoc && window.confirm(`Are you sure you want to delete "${targetDoc.name}"?`)) {
                                  onDeleteDocument(targetDoc.id);
                                }
                              }}
                              className="text-slate-400 hover:text-red-400 p-1 hover:bg-red-950/40 rounded transition-colors"
                              title="Delete PDF / Document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {documents.find((d) => d.id === selectedDocId)?.summary && (
                        <p className="text-[11px] text-slate-400 italic line-clamp-2">
                          "{documents.find((d) => d.id === selectedDocId)?.summary}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              <label className="text-xs text-slate-400 block font-medium">Enter Academic Subject / Topic:</label>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g. Organic Chemistry Functional Groups, World War II History, Python Async Architecture..."
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              {totalQ > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Your recent performance</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-300">{attempts.length} quizzes</span>
                    <span className="text-emerald-400 font-bold">{previewAccuracy}% accuracy</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Difficulty & Question Count */}
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>2. Difficulty & Question Volume</span>
            </h2>
            <span className="status-chip checked">Step 2 of 3</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Difficulty selector */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium">Difficulty Level:</label>
              <div className="grid grid-cols-2 gap-2">
                {(['easy', 'medium', 'hard', 'adaptive'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize border transition-colors ${
                      difficulty === d
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {d === 'adaptive' ? '⚡ Adaptive' : d}
                  </button>
                ))}
              </div>
            </div>

            {/* Question count */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-400 font-medium">Number of Questions:</label>
                <span className="text-indigo-400 font-bold font-mono text-sm">{numQuestions}</span>
              </div>
              <input
                type="range"
                min={3}
                max={20}
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>3 Quick</span>
                <span>10 Standard</span>
                <span>20 Full Test</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Types */}
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              <span>3. Question Formats (Multi-select)</span>
            </h2>
            <span className="status-chip checked">Step 3 of 3</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {availableTypes.map((t) => {
              const isSelected = selectedTypes.includes(t.id);
              return (
                <div
                  key={t.id}
                  onClick={() => toggleType(t.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-3 ${
                    isSelected
                      ? 'bg-indigo-950/30 border-indigo-500/80 text-white'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="mt-0.5">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{t.label}</p>
                    <p className="text-[11px] opacity-75 leading-tight">{t.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase 6 Exam Mode Options */}
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Phase 6 - Exam Mode</h2>
                <p className="text-[11px] text-slate-400">Strict countdown timer, negative marking, and no instant answer reveals</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isExamMode}
                onChange={(e) => setIsExamMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {isExamMode && (
            <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-300 font-medium flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Timer per Question (seconds):</span>
                </label>
                <input
                  type="number"
                  min={15}
                  max={300}
                  value={timeLimitPerQuestion}
                  onChange={(e) => setTimeLimitPerQuestion(parseInt(e.target.value) || 60)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-2 text-xs font-mono"
                />
              </div>

              <div className="flex items-center space-x-3 pt-6">
                <input
                  type="checkbox"
                  id="negative-marking"
                  checked={negativeMarking}
                  onChange={(e) => setNegativeMarking(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 bg-slate-800 border-slate-700"
                />
                <label htmlFor="negative-marking" className="text-xs text-slate-300 cursor-pointer">
                  Enable Negative Marking (-0.25 per wrong answer)
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading || (sourceMode === 'doc' && !selectedDocId) || (sourceMode === 'topic' && !customTopic.trim())}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating AI Quiz with Gemini...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Generate Study Planner Now</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
