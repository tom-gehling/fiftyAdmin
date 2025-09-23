export interface AppUser {
  uid: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  createdAt: Date;
  isAdmin?: boolean;
  isMember: boolean;
  isAnon: boolean;
  followers: string[];
  following: string[];
  loginCount: number;
}
// Subcollection: following
export interface UserFollowing {
  followedUid: string;
  followedAt: Date;
}

// Subcollection: followers (optional if you want reverse lookup)
export interface UserFollower {
  followerUid: string;
  followedAt: Date;
}

// Subcollection: quizResults
export interface QuizResult {
  quizId: string;
  score: number;
  totalQuestions: number;
  attemptedAt: Date;
  questions: Record<string, { correct: boolean; timestamp: Date }>;
}

// Subcollection: quizSessions
export interface QuizSession {
  sessionId?: string;
  quizId: string;
  status: 'in_progress' | 'completed';
  startedAt: Date;
  completedAt?: Date;
  currentQuestionIndex: number;
}
