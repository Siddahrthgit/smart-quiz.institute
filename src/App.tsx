/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { LoginPage } from './pages/LoginPage';
import { UploadExamPage } from './pages/UploadExamPage';
import { PerformancePage } from './pages/PerformancePage';
import { LandingPage } from './components/LandingPage';
import { getOrCreateGuestId } from './lib/ownerAuth';

type ReattemptState = {
  docId: string;
  branch: string;
  subject: string;
  parentAttemptId: string;
  questions: any[];
} | null;

type Page = 'home' | 'login' | 'exam' | 'review';

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('smart_quiz_token'));
  const [isGuest, setIsGuest] = useState<boolean>(() => !localStorage.getItem('smart_quiz_token') && !!localStorage.getItem('smart_quiz_guest_id'));
  const [page, setPage] = useState<Page>(() => (localStorage.getItem('smart_quiz_token') || localStorage.getItem('smart_quiz_guest_id') ? 'exam' : 'home'));
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [reattempt, setReattempt] = useState<ReattemptState>(null);

  function handleAuthed(newToken: string) {
    localStorage.setItem('smart_quiz_token', newToken);
    setToken(newToken);
    setIsGuest(false);
    setPage('exam');
  }

  function handleContinueAsGuest() {
    getOrCreateGuestId();
    setIsGuest(true);
    setPage('exam');
  }

  function handleExamFinished(newAttemptId: string) {
    setAttemptId(newAttemptId);
    setReattempt(null);
    setPage('review');
  }

  function handleReattempt(next: ReattemptState) {
    setReattempt(next);
    setPage('exam');
  }

  function handleUploadNew() {
    setReattempt(null);
    setAttemptId(null);
    setPage('exam');
  }

  function handleStartStudying() {
    setPage(token || isGuest ? 'exam' : 'login');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <button type="button" onClick={() => setPage('home')} className="flex items-center gap-3 text-left" aria-label="StudyPDF home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white shadow-sm">S</span>
            <span>
              <span className="block text-base font-bold tracking-tight text-slate-900">StudyPDF</span>
              <span className="block text-[11px] text-slate-500">Make your own mock test</span>
            </span>
          </button>
          <nav className="flex items-center gap-2">
            <button type="button" onClick={() => setPage('home')} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">Home</button>
            <button type="button" onClick={handleStartStudying} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500">Start studying</button>
          </nav>
        </div>
      </header>

      <main>
        {page === 'home' && <LandingPage onGetStarted={handleStartStudying} />}
        {page === 'login' && <LoginPage onAuthed={handleAuthed} onContinueAsGuest={handleContinueAsGuest} onBackToHome={() => setPage('home')} />}
        {page === 'exam' && <UploadExamPage key={reattempt ? reattempt.parentAttemptId : 'fresh'} onFinished={handleExamFinished} reattempt={reattempt} />}
        {page === 'review' && attemptId && <PerformancePage attemptId={attemptId} onReattempt={handleReattempt} onUploadNew={handleUploadNew} />}
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-500">
        StudyPDF · Turn your own study material into practice exams
      </footer>
    </div>
  );
}
