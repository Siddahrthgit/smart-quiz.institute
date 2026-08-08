export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'match' | 'short_answer' | 'long_answer';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'adaptive';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // For MCQ & True/False
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
  sourceSnippet?: string;
  matchPairs?: { left: string; right: string }[]; // For matching type
}

export interface QuizConfig {
  documentId?: string;
  documentName?: string;
  documentText?: string;
  topic?: string;
  numQuestions: number;
  difficulty: Difficulty;
  questionTypes: QuestionType[];
  timeLimitPerQuestion?: number; // in seconds, 0 = no limit
  isExamMode?: boolean;
  negativeMarking?: boolean;
}

export interface UserAnswer {
  questionId: string;
  userAnswer: string | Record<string, string>;
  isCorrect?: boolean;
  confidence?: 'high' | 'medium' | 'low';
  timeSpentSeconds: number;
  aiFeedback?: string;
  scorePercentage?: number;
}

export interface QuizAttempt {
  id: string;
  quizTitle: string;
  documentName?: string;
  date: string;
  score: number; // percentage 0-100
  totalQuestions: number;
  correctCount: number;
  timeSpentSeconds: number;
  isExamMode: boolean;
  answers: Record<string, UserAnswer>;
  questions: Question[];
  xpEarned: number;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: 'pdf' | 'txt' | 'md' | 'drive' | 'text';
  uploadDate: string;
  sizeFormatted: string;
  content: string;
  summary?: string;
  wordCount: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  lastReviewed?: string;
  intervalDays?: number;
  easeFactor?: number;
  reviewCount?: number;
}

export interface StudyNote {
  id: string;
  title: string;
  documentName: string;
  date: string;
  summary: string;
  keyTakeaways: string[];
  keyTerms: { term: string; definition: string }[];
  contentMarkdown: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlockedAt?: string;
  progress: number; // 0 to 100
  category: 'streak' | 'accuracy' | 'mastery' | 'exam';
}

export interface FriendUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
  streakDays: number;
  xp: number;
  accuracyPercentage: number;
  examImprovementPercentage: number; // e.g. +18% on re-exams
  lastExamTitle?: string;
  lastExamScore?: number;
  isAdded: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  streakDays: number;
  lastActiveDate: string;
  bookmarks: string[]; // Question IDs
  wrongQuestionIds: string[]; // Question IDs to retry
  lowConfidenceQuestionIds: string[]; // Question IDs
  unlockedBadges: string[];
  friends?: FriendUser[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  sources?: string[];
}
