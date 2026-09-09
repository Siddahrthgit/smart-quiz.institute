/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LoginPage } from './pages/LoginPage';
import { UploadExamPage } from './pages/UploadExamPage';
import { PerformancePage } from './pages/PerformancePage';
import { getOrCreateGuestId } from './lib/ownerAuth';

type ReattemptState = {
  docId: string;
  branch: string;
  subject: string;
  parentAttemptId: string;
  questions: any[];
} | null;

// Only 3 pages: Login/Signup -> Upload+Exam -> Performance Review.
// A logged-in user OR a guest (isolated by a local guestId) can use pages 2 and 3.
export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('smart_quiz_token'));
  const [isGuest, setIsGuest] = useState<boolean>(() => !localStorage.getItem('smart_quiz_token') && !!localStorage.getItem('smart_quiz_guest_id'));
  const [page, setPage] = useState<'login' | 'exam' | 'review'>(() => (token || isGuest ? 'exam' : 'login'));
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

  function handleReattempt(r: ReattemptState) {
    setReattempt(r);
    setPage('exam');
  }

  function handleUploadNew() {
    setReattempt(null);
    setAttemptId(null);
    setPage('exam');
  }

  if (page === 'login') {
    return <LoginPage onAuthed={handleAuthed} onContinueAsGuest={handleContinueAsGuest} />;
  }

  if (page === 'exam') {
    return <UploadExamPage key={reattempt ? reattempt.parentAttemptId : 'fresh'} onFinished={handleExamFinished} reattempt={reattempt} />;
  }

  return (
    <PerformancePage attemptId={attemptId!} onReattempt={handleReattempt} onUploadNew={handleUploadNew} />
  );
}
