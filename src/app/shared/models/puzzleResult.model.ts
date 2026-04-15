import { GameType } from './puzzle.model';

export interface PuzzleResult {
  resultId?: string;
  userId: string;
  gameType: GameType;
  dateKey: string;
  puzzleId: string;
  status: 'completed' | 'abandoned';
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  attempts?: number;
  usedHint?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UserGameStats {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string;
  totalPlays: number;
}
