import React, { useState } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export const FeatureChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: "Hi! Ask me anything about how Smart Exam Preparation works." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);
    try {
      const res = await fetch('/api/features-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const reply = res.ok ? data.reply : "Sorry, I couldn't answer that right now.";
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: "Couldn't reach the server. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {isOpen && (
        <div className="mb-3 w-80 max-w-[90vw] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-white">Ask about features</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 max-h-80 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-xs rounded-xl px-3 py-2 max-w-[85%] ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white ml-auto'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="text-xs rounded-xl px-3 py-2 bg-slate-800 text-slate-400 w-fit">
                Thinking...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 p-3 border-t border-slate-800">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 rounded-xl text-white"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl flex items-center justify-center transition-colors"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
};
