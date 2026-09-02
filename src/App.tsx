/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { QuizGenerator } from './components/QuizGenerator';
import { QuizRunner } from './components/QuizRunner';
import { QuizResults } from './components/QuizResults';
import { DocumentManager } from './components/DocumentManager';
import { FlashcardsAndNotes } from './components/FlashcardsAndNotes';
import { PracticeRoom } from './components/PracticeRoom';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { AiQuizFlow } from './components/AiQuizFlow';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { FriendsModal } from './components/FriendsModal';

import { 
  UserProfile, 
  DocumentItem, 
  QuizAttempt, 
  Flashcard, 
  StudyNote, 
  Badge, 
  Question, 
  QuizConfig, 
  UserAnswer,
  FriendUser
} from './types';

import { 
  SAMPLE_DOCUMENTS, 
  SAMPLE_QUESTIONS, 
  SAMPLE_FLASHCARDS, 
  SAMPLE_BADGES, 
  SAMPLE_ATTEMPTS 
} from './data/sampleData';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('ai-quiz-flow');

  // Profile state
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('smart_quiz_profile');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      id: 'user_101',
      name: 'Siddharth Yadav',
      email: 'siddharth@example.com',
      xp: 450,
      level: 3,
      streakDays: 4,
      lastActiveDate: new Date().toISOString().split('T')[0],
      bookmarks: ['q1', 'q2'],
      wrongQuestionIds: ['q4'],
      lowConfidenceQuestionIds: ['q2'],
      unlockedBadges: ['badge-streak-3', 'badge-quiz-master'],
    };
  });

  // Documents state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);

  // Active Quiz taking state
  const [activeQuiz, setActiveQuiz] = useState<{
    title: string;
    docName?: string;
    questions: Question[];
    config: QuizConfig;
  } | null>(null);

  const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(attempts[0] || null);

  // Auth modal & Friends modal
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [friendsList, setFriendsList] = useState<FriendUser[]>([]);

  const handleToggleFriend = (user: FriendUser) => {
    setFriendsList((prev) => {
      const exists = prev.some((f) => f.id === user.id);
      if (exists) {
        return prev.filter((f) => f.id !== user.id);
      } else {
        return [...prev, { ...user, isAdded: true }];
      }
    });
  };

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist profile
  useEffect(() => {
    localStorage.setItem('smart_quiz_profile', JSON.stringify(profile));
  }, [profile]);
// Register service worker for notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) =>
        console.warn('Service worker registration failed:', err)
      );
    }
  }, []);
  // Fetch initial documents from backend
  useEffect(() => {
    fetch('/api/documents')
      .then((res) => res.json())
      .then((data) => {
        if (data.documents && data.documents.length > 0) {
          setDocuments(data.documents);
        }
      })
      .catch((err) => console.warn('Backend documents fetch notice:', err));
  }, []);

  // Upload file handler
  const handleUploadFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to parse file');
      }

      setDocuments((prev) => [data.document, ...prev]);
    } catch (err: any) {
      setError(err.message || 'File upload failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDriveLinkImport = async (url: string, title?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/drive/import-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to import from Google Drive');
      }
      setDocuments((prev) => [data.document, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Google Drive import failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete document handler
  const handleDeleteDocument = async (docId: string) => {
    try {
      await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Backend delete document notice:', err);
    }
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  // Import text directly
  const handleImportDriveText = async (title: string, content: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/documents/import-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, sourceType: 'drive' }),
      });
      const data = await res.json();
      if (data.success && data.document) {
        setDocuments((prev) => [data.document, ...prev]);
      }
    } catch (err: any) {
      console.error('Import text failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Quiz Generation Handler
  const handleGenerateQuiz = async (config: QuizConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate quiz');
      }

      if (!data.questions || data.questions.length === 0) {
        throw new Error('AI produced 0 questions. Please try again.');
      }

      setActiveQuiz({
        title: data.quizTitle || 'Smart AI Quiz',
        docName: data.documentName,
        questions: data.questions,
        config,
      });

      setActiveTab('quiz-runner');
    } catch (err: any) {
      setError(err.message || 'Quiz generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Finish Quiz Handler
  const handleFinishQuiz = (
    answers: Record<string, UserAnswer>,
    totalTimeSeconds: number,
    isExamMode: boolean
  ) => {
    if (!activeQuiz) return;

    const questions = activeQuiz.questions;
    let correctCount = 0;
    const wrongIds: string[] = [];
    const lowConfIds: string[] = [];

    questions.forEach((q) => {
      const ans = answers[q.id];
      if (ans && ans.isCorrect) {
        correctCount += 1;
      } else {
        wrongIds.push(q.id);
      }

      if (ans) {
        const score = ans.scorePercentage ?? (ans.isCorrect ? 100 : 0);
        if (score < 50 || ans.confidence === 'low') {
          lowConfIds.push(q.id);
        }
      } else {
        lowConfIds.push(q.id);
      }
    });

    const scorePct = Math.round((correctCount / questions.length) * 100);
    const xpEarned = correctCount * 25 + (scorePct === 100 ? 50 : 0);

    const newAttempt: QuizAttempt = {
      id: 'attempt_' + Date.now(),
      quizTitle: activeQuiz.title,
      documentName: activeQuiz.docName,
      date: new Date().toISOString().split('T')[0],
      score: scorePct,
      totalQuestions: questions.length,
      correctCount,
      timeSpentSeconds: totalTimeSeconds,
      isExamMode,
      answers,
      questions,
      xpEarned,
    };

    setAttempts((prev) => [newAttempt, ...prev]);
    setLastAttempt(newAttempt);

    // Update user profile XP, wrong question bank, low confidence items
    setProfile((prev) => {
      const updatedXp = prev.xp + xpEarned;
      const updatedLevel = Math.floor(updatedXp / 200) + 1;

      // merge wrong question ids
      const newWrongBank = Array.from(new Set([...prev.wrongQuestionIds, ...wrongIds]));
      const newLowConfBank = Array.from(new Set([...prev.lowConfidenceQuestionIds, ...lowConfIds]));

      return {
        ...prev,
        xp: updatedXp,
        level: updatedLevel,
        wrongQuestionIds: newWrongBank,
        lowConfidenceQuestionIds: newLowConfBank,
      };
    });

    setActiveQuiz(null);
    setActiveTab('quiz-results');
  };

  // Retry wrong questions handler
  const handleRetryWrongQuestions = () => {
    setActiveTab('practice');
  };

  // Retry low-confidence questions handler
  const handleRetryLowConfidence = () => {
    const lowConfQs = SAMPLE_QUESTIONS.filter((q) => profile.lowConfidenceQuestionIds.includes(q.id));
    const targetQs = lowConfQs.length > 0 ? lowConfQs : SAMPLE_QUESTIONS.slice(0, 3);

    setActiveQuiz({
      title: 'Targeted Revision: Low Confidence Review',
      questions: targetQs,
      config: {
        numQuestions: targetQs.length,
        difficulty: 'medium',
        questionTypes: ['mcq'],
      },
    });
    setActiveTab('quiz-runner');
  };

  // Generate Flashcards & Notes from Mistakes
  const handleGenerateMistakeNotesAndFlashcards = async () => {
    setIsLoading(true);
    try {
      const wrongQuestions = lastAttempt 
        ? lastAttempt.questions.filter((q) => {
            const ans = lastAttempt.answers[q.id];
            return !ans || ans.isCorrect === false;
          })
        : SAMPLE_QUESTIONS.slice(0, 3);

      const targetList = wrongQuestions.length > 0 ? wrongQuestions : SAMPLE_QUESTIONS.slice(0, 3);

      const res = await fetch('/api/generate-mistake-notes-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wrongQuestions: targetList.map((q) => ({
            question: q.question,
            correctAnswer: q.correctAnswer,
            userAnswer: lastAttempt?.answers[q.id]?.userAnswer || 'Wrong Choice',
            explanation: q.explanation,
          })),
          quizTitle: lastAttempt?.quizTitle || 'Exam Misconception Analysis',
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.flashcards && data.flashcards.length > 0) {
          const newFlashcards: Flashcard[] = data.flashcards.map((f: any, i: number) => ({
            id: `f_mistake_${Date.now()}_${i}`,
            front: f.front,
            back: f.back,
            topic: f.topic || 'Exam Missed Concept',
            difficulty: f.difficulty || 'medium',
          }));
          setFlashcards((prev) => [...newFlashcards, ...prev]);
        }

        if (data.studyNote) {
          const newNote: StudyNote = {
            id: `note_mistake_${Date.now()}`,
            title: data.studyNote.title || 'Targeted Weak Concepts Note',
            documentName: lastAttempt?.quizTitle || 'Mistake Practice Material',
            date: new Date().toISOString().split('T')[0],
            summary: data.studyNote.summary || '',
            keyTakeaways: data.studyNote.keyTakeaways || [],
            keyTerms: data.studyNote.keyTerms || [],
            contentMarkdown: data.studyNote.contentMarkdown || '',
          };
          setNotes((prev) => [newNote, ...prev]);
        }
      }
      setActiveTab('notes-cards');
    } catch (err) {
      console.error('Mistake flashcards/notes generation error:', err);
      setActiveTab('notes-cards');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Flashcards handler
  const handleGenerateFlashcards = async (docId?: string, count: number = 6) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId || documents[0]?.id, count }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to generate flashcards');
        return;
      }
      if (data.success && data.flashcards) {
        setFlashcards(data.flashcards);
      }
    } catch (err) {
      setError('Could not reach the server. Please try again.');
      console.error('Flashcard error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Notes handler
  const handleGenerateNotes = async (docId?: string) => {
    setIsLoading(true);
    try {
      const targetDoc = documents.find((d) => d.id === docId) || documents[0];
      const res = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: targetDoc?.id,
          topic: targetDoc?.name,
        }),
      });

      const data = await res.json();
      if (data.success && data.notes) {
        const newNote: StudyNote = {
          id: 'note_' + Date.now(),
          title: data.notes.title || 'Study Note',
          documentName: targetDoc?.name || 'General Material',
          date: new Date().toISOString().split('T')[0],
          summary: data.notes.summary || '',
          keyTakeaways: data.notes.keyTakeaways || [],
          keyTerms: data.notes.keyTerms || [],
          contentMarkdown: data.notes.contentMarkdown || '',
        };
        setNotes((prev) => [newNote, ...prev]);
      }
    } catch (err) {
      console.error('Notes generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle bookmark
  const handleToggleBookmark = (questionId: string) => {
    setProfile((prev) => {
      const isBookmarked = prev.bookmarks.includes(questionId);
      const newBookmarks = isBookmarked
        ? prev.bookmarks.filter((id) => id !== questionId)
        : [...prev.bookmarks, questionId];
      return { ...prev, bookmarks: newBookmarks };
    });
  };

  // Request notification permission
  const handleRequestNotifications = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  if (window.location.pathname === '/reset-password') {
    return <ResetPasswordPage />;
  }

  if (showLanding) {
    return <AiQuizFlow onNavigate={(tab) => { setShowLanding(false); setActiveTab(tab); }} onAuthSuccess={(user) => { onSaveProfile({ name: user.name, email: user.email }); setShowLanding(false); }} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profile}
        onOpenAuth={() => setIsAuthOpen(true)}
        onQuickGenerate={() => setActiveTab('quiz-gen')}
        onOpenFriends={() => setIsFriendsOpen(true)}
        onRequestNotifications={handleRequestNotifications}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Router */}
        {activeTab === 'analytics' && (
          <Dashboard
            profile={profile}
            attempts={attempts}
            documents={documents}
            onStartQuizGen={() => setActiveTab('quiz-gen')}
            onOpenDocuments={() => setActiveTab('documents')}
            onOpenNotesAndCards={() => setActiveTab('notes-cards')}
            onOpenPractice={() => setActiveTab('practice')}
            onOpenAnalytics={() => setActiveTab('analytics')}
            onRetryWrongQuestions={handleRetryWrongQuestions}
            onRetryLowConfidence={handleRetryLowConfidence}
            onOpenAttemptDetail={(att) => {
              setLastAttempt(att);
              setActiveTab('quiz-results');
            }}
          />
        )}

        {activeTab === "ai-quiz-flow" && <AiQuizFlow onNavigate={setActiveTab} />}

        {activeTab === 'quiz-gen' && (
          <QuizGenerator
            documents={documents}
            attempts={attempts}
            onGenerateQuiz={handleGenerateQuiz}
            onUploadFile={handleUploadFile}
            onDeleteDocument={handleDeleteDocument}
            onOpenDocuments={() => setActiveTab('documents')}
            isLoading={isLoading}
            error={error}
          />
        )}

        {activeTab === 'quiz-runner' && activeQuiz && (
          <QuizRunner
            quizTitle={activeQuiz.title}
            documentName={activeQuiz.docName}
            questions={activeQuiz.questions}
            config={activeQuiz.config}
            bookmarkedIds={profile.bookmarks}
            onToggleBookmark={handleToggleBookmark}
            onFinishQuiz={handleFinishQuiz}
            onExit={() => setActiveTab('analytics')}
          />
        )}

        {activeTab === 'quiz-results' && lastAttempt && (
          <QuizResults
            attempt={lastAttempt}
            onRetryWrong={handleRetryWrongQuestions}
            onRetryLowConfidence={handleRetryLowConfidence}
            onGenerateFlashcards={handleGenerateMistakeNotesAndFlashcards}
            onOpenPractice={(type) => {
              setActiveTab('practice');
            }}
            onOpenAnalytics={() => setActiveTab('analytics')}
            onReturnDashboard={() => setActiveTab('analytics')}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentManager
            documents={documents}
            onUploadFile={handleUploadFile}
            onImportDriveText={handleImportDriveText}
            onImportDriveLink={handleDriveLinkImport}
            onDeleteDocument={handleDeleteDocument}
            onSelectDocForQuiz={(doc) => {
              setActiveTab('quiz-gen');
            }}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'notes-cards' && (
          <FlashcardsAndNotes
            flashcards={flashcards}
            notes={notes}
            documents={documents}
            onGenerateFlashcards={handleGenerateFlashcards}
            onGenerateNotes={handleGenerateNotes}
            onUploadFile={handleUploadFile}
            isLoading={isLoading}
            error={error}
          />
        )}

        {activeTab === 'practice' && (
          <PracticeRoom
            attempts={attempts}
            onStartTargetedQuiz={(title, questions, config) => {
              setActiveQuiz({
                title,
                questions,
                config,
              });
              setActiveTab('quiz-runner');
            }}
          />
        )}


        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            profile={profile}
            attempts={attempts}
            badges={badges}
          />

        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 text-slate-500 text-xs py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p>© 2026 Smart Exam Preparation.</p>
          <div className="flex items-center space-x-4">
            <span className="text-indigo-400 font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-950 border border-indigo-900">
              Phase 1–8 Roadmap Fully Integrated
            </span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        profile={profile}
        onSaveProfile={(updated) => setProfile((prev) => ({ ...prev, ...updated }))}
      />

      {/* Friends Modal */}
      <FriendsModal
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
        friendsList={friendsList}
        onToggleFriend={handleToggleFriend}
      />
    </div>
  );
}
