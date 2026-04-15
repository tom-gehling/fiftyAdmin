import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  collectionData,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable, defer } from 'rxjs';
import { GameType } from '../models/puzzle.model';
import { PuzzleResult, UserGameStats } from '../models/puzzleResult.model';
import { DailySeedService } from './daily-seed.service';

@Injectable({ providedIn: 'root' })
export class PuzzleResultService {
  private firestore = inject(Firestore);
  private seed = inject(DailySeedService);
  private readonly col = 'puzzleResults';
  private readonly statsCol = 'userGameStats';

  /** Deterministic doc ID — prevents duplicate plays per user per game per day */
  getDocId(userId: string, gameType: GameType, dateKey: string): string {
    return `${userId}_${gameType}_${dateKey}`;
  }

  /** Check if a user has already played a game today. Single doc read — no query needed. */
  async getTodayResult(userId: string, gameType: GameType, dateKey?: string): Promise<PuzzleResult | null> {
    const key = dateKey ?? this.seed.getTodayKey();
    const docId = this.getDocId(userId, gameType, key);
    const ref = doc(this.firestore, this.col, docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { ...snap.data() as PuzzleResult, resultId: snap.id };
  }

  /** Save (or update) a puzzle result. Idempotent via setDoc merge. */
  async saveResult(result: PuzzleResult): Promise<void> {
    const docId = this.getDocId(result.userId, result.gameType, result.dateKey);
    const ref = doc(this.firestore, this.col, docId);
    const { resultId: _ignored, ...data } = result;
    await setDoc(ref, data, { merge: true });
  }

  /** Admin: get all results for a game on a specific day */
  getResultsByDay(gameType: GameType, dateKey: string): Observable<PuzzleResult[]> {
    return defer(() => {
      const q = query(
        collection(this.firestore, this.col),
        where('gameType', '==', gameType),
        where('dateKey', '==', dateKey)
      );
      return collectionData(q, { idField: 'resultId' }) as Observable<PuzzleResult[]>;
    });
  }

  /** User: get their full history for a specific game */
  getUserHistory(userId: string, gameType: GameType): Observable<PuzzleResult[]> {
    return defer(() => {
      const q = query(
        collection(this.firestore, this.col),
        where('userId', '==', userId),
        where('gameType', '==', gameType)
      );
      return collectionData(q, { idField: 'resultId' }) as Observable<PuzzleResult[]>;
    });
  }

  // ---------------------------------------------------------------------------
  // Country Jumble streak tracking
  // ---------------------------------------------------------------------------

  async getUserGameStats(userId: string): Promise<UserGameStats | null> {
    const ref = doc(this.firestore, this.statsCol, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as UserGameStats;
  }

  async updateStreak(userId: string, dateKey: string): Promise<UserGameStats> {
    const ref = doc(this.firestore, this.statsCol, userId);
    const snap = await getDoc(ref);

    let stats: UserGameStats;
    if (!snap.exists()) {
      stats = { userId, currentStreak: 1, longestStreak: 1, lastPlayedDate: dateKey, totalPlays: 1 };
    } else {
      stats = snap.data() as UserGameStats;
      const yesterday = this.getYesterdayKey(dateKey);
      const alreadyPlayedToday = stats.lastPlayedDate === dateKey;

      if (alreadyPlayedToday) {
        // No-op — already counted this day
        return stats;
      } else if (stats.lastPlayedDate === yesterday) {
        stats.currentStreak += 1;
      } else {
        stats.currentStreak = 1;
      }
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
      stats.lastPlayedDate = dateKey;
      stats.totalPlays = (stats.totalPlays ?? 0) + 1;
    }

    await setDoc(ref, stats);
    return stats;
  }

  private getYesterdayKey(dateKey: string): string {
    const d = new Date(dateKey + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
