import React, { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  FileText, 
  RotateCw, 
  CheckCircle2, 
  BrainCircuit, 
  Plus, 
  Bookmark, 
  BookOpen, 
  Check, 
  HelpCircle,
  Copy,
  Upload
} from 'lucide-react';
import { Flashcard, StudyNote, DocumentItem } from '../types';

interface FlashcardsAndNotesProps {
  flashcards: Flashcard[];
  notes: StudyNote[];
  documents: DocumentItem[];
  onGenerateFlashcards: (docId?: string) => Promise<void>;
  onGenerateNotes: (docId?: string) => Promise<void>;
  onUploadFile: (file: File) => Promise<void>;
  isLoading: boolean;
}

export const FlashcardsAndNotes: React.FC<FlashcardsAndNotesProps> = ({
  flashcards,
  notes,
  documents,
  onGenerateFlashcards,
  onGenerateNotes,
  onUploadFile,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'flashcards' | 'notes' | 'upload'>('flashcards');
  const [isDragging, setIsDragging] = useState(false);

  // Flashcards state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');

  const currentCard = flashcards[cardIndex] || flashcards[0];

  const handleNextCard = () => {
    setIsFlipped(false);
    setCardIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Mode Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Flashcards & Study Notes</h1>
            <p className="text-xs text-slate-400">
              Spaced repetition flashcards and AI-generated executive summaries for high-yield revision.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('flashcards')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'flashcards' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Flashcards ({flashcards.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'notes' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Study Notes ({notes.length})
          </button>
          <button onClick={() => setActiveTab('upload')} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Upload Material</button>
        </div>
      </div>

      {/* Mode 1: Interactive Flashcards */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400 font-medium">Generate from:</span>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => onGenerateFlashcards(selectedDocId)}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating Cards...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate New Flashcards</span>
                </>
              )}
            </button>
          </div>

          {flashcards.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs space-y-3">
              <Layers className="w-8 h-8 text-indigo-400 mx-auto" />
              <p>No flashcards generated yet.</p>
              <button
                onClick={() => onGenerateFlashcards(selectedDocId)}
                className="text-indigo-400 hover:underline font-semibold"
              >
                Click here to generate flashcards from your study material →
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Card Flip Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="relative h-72 md:h-80 w-full cursor-pointer perspective-1000 group"
              >
                <div
                  className={`w-full h-full rounded-2xl p-8 border transition-all duration-500 transform flex flex-col justify-between shadow-2xl ${
                    isFlipped
                      ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-indigo-500/50 text-indigo-100'
                      : 'bg-slate-900 border-slate-800 text-white hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-slate-800 text-indigo-300 border border-slate-700 font-mono">
                      {isFlipped ? 'ANSWER / CONCEPT BACK' : 'QUESTION / CONCEPT FRONT'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Card {cardIndex + 1} of {flashcards.length}
                    </span>
                  </div>

                  <div className="text-center my-auto space-y-3">
                    <h2 className="text-lg md:text-xl font-bold leading-relaxed">
                      {isFlipped ? currentCard.back : currentCard.front}
                    </h2>
                    <p className="text-[11px] text-slate-400 italic">
                      {isFlipped ? '(Click card to flip back)' : '(Click card to reveal answer)'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="capitalize text-indigo-400 font-semibold">{currentCard.topic}</span>
                    <RotateCw className="w-4 h-4 text-slate-400 group-hover:rotate-180 transition-transform duration-500" />
                  </div>
                </div>
              </div>

              {/* Spaced Repetition Rating Buttons */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                <span className="text-xs text-slate-400 font-medium block text-center">
                  Spaced Repetition Rating (Phase 2):
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={handleNextCard}
                    className="py-2.5 rounded-xl bg-red-950/60 border border-red-800/80 hover:bg-red-900/60 text-red-300 font-semibold text-xs transition-colors text-center"
                  >
                    Hard (Review 1d)
                  </button>
                  <button
                    onClick={handleNextCard}
                    className="py-2.5 rounded-xl bg-amber-950/60 border border-amber-800/80 hover:bg-amber-900/60 text-amber-300 font-semibold text-xs transition-colors text-center"
                  >
                    Good (Review 2d)
                  </button>
                  <button
                    onClick={handleNextCard}
                    className="py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 hover:bg-emerald-900/60 text-emerald-300 font-semibold text-xs transition-colors text-center"
                  >
                    Easy (Review 4d)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: AI Generated Study Notes */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => onGenerateNotes(selectedDocId)}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow flex items-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Notes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Study Notes</span>
                </>
              )}
            </button>
          </div>

          {notes.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs space-y-3">
              <FileText className="w-8 h-8 text-indigo-400 mx-auto" />
              <p>No study notes generated yet.</p>
              <button
                onClick={() => onGenerateNotes(selectedDocId)}
                className="text-indigo-400 hover:underline font-semibold"
              >
                Synthesize high-yield study notes with Gemini AI →
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {notes.map((note) => (
                <div key={note.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">{note.title}</h2>
                    <p className="text-xs text-indigo-400 font-mono">Generated from: {note.documentName} • {note.date}</p>
                  </div>

                  {/* Summary */}
                  <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                    <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Executive Summary</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{note.summary}</p>
                  </div>

                  {/* Key Takeaways */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Key Takeaways</h3>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {note.keyTakeaways.map((takeaway, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{takeaway}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Key Terms */}
                  {note.keyTerms && note.keyTerms.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Key Terminology Dictionary</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {note.keyTerms.map((kt, i) => (
                          <div key={i} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs">
                            <span className="font-bold text-indigo-300 block mb-1">{kt.term}</span>
                            <p className="text-slate-300 text-[11px] leading-relaxed">{kt.definition}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Upload Material</h3>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) onUploadFile(file); }}
            onClick={() => document.getElementById('upload-material-input')?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center space-y-3 transition-all cursor-pointer group ${isDragging ? 'border-indigo-400 bg-indigo-950/30' : 'border-indigo-500/40 hover:border-indigo-400 bg-indigo-950/20 hover:bg-indigo-950/30'}`}
          >
            <input id="upload-material-input" type="file" accept=".pdf,.txt" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onUploadFile(file); }} />
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-200">Drag & drop your PDF or TXT file here</p>
              <p className="text-[10px] text-indigo-400 font-semibold underline">or click to browse</p>
              <p className="text-[10px] text-slate-400">Supports PDF, TXT up to 20MB</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); document.getElementById('upload-material-input')?.click(); }} disabled={isLoading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow disabled:opacity-50">
              {isLoading ? 'Uploading...' : 'Choose File'}
            </button>
          </div>
          {documents.length > 0 && (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-slate-200 block truncate">{doc.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{doc.sizeFormatted}</span>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
