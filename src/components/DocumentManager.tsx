import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Cloud, 
  Bot, 
  Send, 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Plus, 
  MessageSquare,
  Zap,
  ExternalLink
} from 'lucide-react';
import { DocumentItem, ChatMessage } from '../types';

interface DocumentManagerProps {
  documents: DocumentItem[];
  onUploadFile: (file: File) => Promise<void>;
  onImportDriveText: (title: string, content: string) => Promise<void>;
  onSelectDocForQuiz: (doc: DocumentItem) => void;
  onDeleteDocument?: (docId: string) => void;
  isLoading: boolean;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents,
  onUploadFile,
  onImportDriveText,
  onSelectDocForQuiz,
  onDeleteDocument,
  isLoading,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'materials' | 'drive' | 'chatbot'>('materials');
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  
  // File upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Drive import state
  const [driveToken, setDriveToken] = useState<string>('');
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isFetchingDrive, setIsFetchingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Custom text paste import
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');

  // AI Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: 'Hello! I am your Smart Quiz AI Study Tutor. Select a document and ask me any question about your study material!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputChat, setInputChat] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadError(null);
      try {
        await onUploadFile(file);
      } catch (err: any) {
        setUploadError(err.message || 'File upload failed');
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadError(null);
      try {
        await onUploadFile(file);
      } catch (err: any) {
        setUploadError(err.message || 'File upload failed');
      }
    }
  };

  const handleFetchDriveFiles = async () => {
    if (!driveToken.trim()) {
      setDriveError('Please enter a Google Drive OAuth Access Token or click connect below.');
      return;
    }
    setIsFetchingDrive(true);
    setDriveError(null);

    try {
      const res = await fetch('/api/drive/files', {
        headers: { Authorization: driveToken.startsWith('Bearer ') ? driveToken : `Bearer ${driveToken}` },
      });
      const data = await res.json();
      if (data.error) {
        setDriveError(data.error);
      } else {
        setDriveFiles(data.files || []);
      }
    } catch (err: any) {
      setDriveError(err.message || 'Failed to fetch Google Drive files');
    } finally {
      setIsFetchingDrive(false);
    }
  };

  const handlePasteImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim()) return;
    await onImportDriveText(pasteTitle || 'Pasted Material', pasteContent);
    setPasteTitle('');
    setPasteContent('');
    setActiveSubTab('materials');
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputChat.trim() || isSendingChat) return;

    const userMsg: ChatMessage = {
      id: 'user_' + Date.now(),
      sender: 'user',
      text: inputChat,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputChat('');
    setIsSendingChat(true);

    try {
      const res = await fetch('/api/doc-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDoc?.id,
          message: userMsg.text,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const aiMsg: ChatMessage = {
          id: 'ai_' + Date.now(),
          sender: 'ai',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsSendingChat(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header & Sub-Tab Switcher */}
      <div className="bento-card bg-slate-900 border-slate-800 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Study Materials & Google Drive</h1>
            <p className="text-xs text-slate-400">
              Upload PDF documents, connect Google Drive, or ask the AI Chatbot questions about your files.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveSubTab('materials')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeSubTab === 'materials' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              My Materials ({documents.length})
            </button>
            <button
              onClick={() => setActiveSubTab('drive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeSubTab === 'drive' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Google Drive
            </button>
            <button
              onClick={() => setActiveSubTab('chatbot')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeSubTab === 'chatbot' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              AI Doc Chatbot
            </button>
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="bg-red-950/60 border border-red-800 p-4 rounded-xl text-xs text-red-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* SubTab 1: Materials & Upload */}
      {activeSubTab === 'materials' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Upload Dropzone Column */}
          <div className="md:col-span-1 space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all space-y-3 ${
                dragOver
                  ? 'border-indigo-400 bg-indigo-950/40'
                  : 'border-slate-700 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Click to Upload or Drag & Drop</p>
                <p className="text-[11px] text-slate-400 mt-1">Supports PDF, TXT, and MD files (Up to 20MB)</p>
              </div>

              {isLoading && (
                <div className="pt-2 flex items-center justify-center space-x-2 text-xs text-indigo-400">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Parsing Text & Summary...</span>
                </div>
              )}
            </div>

            {/* Quick Paste Form */}
            <div className="bento-card bg-slate-900 border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>Quick Paste Text</span>
                </h3>
                <span className="status-chip active">Instant Parse</span>
              </div>
              <form onSubmit={handlePasteImportSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Note Title (e.g., Organic Chem Ch 4)"
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <textarea
                  rows={4}
                  placeholder="Paste study notes or article text here..."
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!pasteContent.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Save Material
                </button>
              </form>
            </div>
          </div>

          {/* Materials List Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Available Study Documents ({documents.length})</span>
              </h2>
              <span className="status-chip checked">Indexed Documents</span>
            </div>

            {documents.length === 0 ? (
              <div className="bento-card bg-slate-900 border-slate-800 p-8 text-center text-slate-400 text-xs space-y-2">
                <p>No materials uploaded yet.</p>
                <p>Upload a PDF above or use Google Drive import to start.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bento-card bg-slate-900 border-slate-800 p-5 space-y-3 hover:border-indigo-500/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 rounded-xl bg-slate-800 text-indigo-400 border border-slate-700">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{doc.name}</h3>
                          <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-0.5">
                            <span className="uppercase font-mono text-indigo-400">{doc.type}</span>
                            <span>•</span>
                            <span className="font-mono">{doc.sizeFormatted}</span>
                            <span>•</span>
                            <span>{doc.wordCount} words</span>
                            <span>•</span>
                            <span>{doc.uploadDate}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onSelectDocForQuiz(doc)}
                          className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all shadow"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Quiz from This</span>
                        </button>

                        {onDeleteDocument && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${doc.name}"?`)) {
                                onDeleteDocument(doc.id);
                              }
                            }}
                            title="Delete PDF / Document"
                            className="p-2 rounded-xl bg-slate-800 hover:bg-red-950/60 border border-slate-700 hover:border-red-800/80 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {doc.summary && (
                      <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs text-slate-300">
                        <span className="font-bold text-indigo-300 block mb-1">AI Executive Summary:</span>
                        <p>{doc.summary}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SubTab 2: Google Drive Integration */}
      {activeSubTab === 'drive' && (
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Cloud className="w-5 h-5 text-indigo-400" />
                <span>Google Drive Integration</span>
              </h2>
              <p className="text-xs text-slate-400">
                Directly connect your Google Drive account to import study notes, lecture PDFs, and slide decks.
              </p>
            </div>
            <span className="status-chip active">OAuth Ready</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-semibold block">Google OAuth Access Token:</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Paste Google OAuth Access Token or connect via AI Studio..."
                  value={driveToken}
                  onChange={(e) => setDriveToken(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  onClick={handleFetchDriveFiles}
                  disabled={isFetchingDrive}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isFetchingDrive ? 'Fetching...' : 'Fetch Drive Files'}
                </button>
              </div>
            </div>

            {driveError && (
              <div className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800/40 p-3 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{driveError}</span>
              </div>
            )}
          </div>

          {driveFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Drive Files Found ({driveFiles.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {driveFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 flex items-center justify-between"
                  >
                    <div className="overflow-hidden space-y-1">
                      <p className="text-xs font-bold text-slate-200 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{file.mimeType}</p>
                    </div>
                    <button
                      onClick={async () => {
                        await onImportDriveText(file.name, `Content from Drive file: ${file.name}`);
                        setActiveSubTab('materials');
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] px-3 py-1.5 rounded-lg"
                    >
                      Import
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SubTab 3: AI Document Chatbot */}
      {activeSubTab === 'chatbot' && (
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Ask Your Document (AI Tutor)</h2>
                <p className="text-xs text-slate-400">
                  Currently answering questions for: <span className="text-indigo-300 font-semibold">{selectedDoc?.name || 'All Materials'}</span>
                </p>
              </div>
            </div>

            {documents.length > 1 && (
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Chat history */}
          <div className="h-96 overflow-y-auto bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-xl p-3.5 rounded-2xl leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span className="text-[9px] opacity-60 block text-right mt-1 font-mono">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {isSendingChat && (
              <div className="flex items-center space-x-2 text-xs text-indigo-400 font-medium p-2">
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span>AI Tutor is thinking...</span>
              </div>
            )}
          </div>

          {/* Chat input form */}
          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              placeholder="Ask a question about your study material (e.g. 'Explain the self-attention mechanism in simple terms')..."
              value={inputChat}
              onChange={(e) => setInputChat(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputChat.trim() || isSendingChat}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center space-x-1.5"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
