import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  collectionData,
  docData,
  query,
  where,
  limit,
} from '@angular/fire/firestore';
import { Observable, defer, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Puzzle } from '../models/puzzle.model';

@Injectable({ providedIn: 'root' })
export class PuzzleService {
  private firestore = inject(Firestore);
  private readonly col = 'puzzles';

  /** Get the active puzzle for a game type on a specific date. Returns null if none scheduled. */
  getTodayPuzzle(gameType: 'movieEmoji' | 'rushHour', dateKey: string): Observable<Puzzle | null> {
    return defer(() => {
      const q = query(
        collection(this.firestore, this.col),
        where('gameType', '==', gameType),
        where('dateKey', '==', dateKey),
        where('isActive', '==', true),
        limit(1)
      );
      return (collectionData(q, { idField: 'id' }) as Observable<Puzzle[]>).pipe(
        map(docs => docs[0] ?? null),
        catchError(() => of(null))
      );
    });
  }

  getAllPuzzles(gameType: string): Observable<Puzzle[]> {
    return defer(() => {
      const q = query(
        collection(this.firestore, this.col),
        where('gameType', '==', gameType)
      );
      return collectionData(q, { idField: 'id' }) as Observable<Puzzle[]>;
    });
  }

  getPuzzle(id: string): Observable<Puzzle | undefined> {
    return defer(() => {
      const ref = doc(this.firestore, this.col, id);
      return docData(ref, { idField: 'id' }) as Observable<Puzzle | undefined>;
    });
  }

  async createPuzzle(puzzle: Partial<Puzzle>): Promise<string> {
    const ref = await addDoc(collection(this.firestore, this.col), {
      ...puzzle,
      createdAt: new Date(),
    });
    return ref.id;
  }

  async updatePuzzle(id: string, changes: Partial<Puzzle>): Promise<void> {
    const ref = doc(this.firestore, this.col, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(ref, changes as any);
  }

  async deletePuzzle(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, this.col, id));
  }
}
