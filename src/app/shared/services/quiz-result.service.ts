import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  collectionData,
  docData,
  addDoc,
  updateDoc,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable, defer, firstValueFrom } from 'rxjs';
import { QuizResult, QuizAnswer } from '../models/quizResult.model';

@Injectable({ providedIn: 'root' })
export class QuizResultsService {
  private firestore = inject(Firestore);
  private collectionName = 'quizResults'; // top-level collection

  /** Create a new result (in-progress) */
  async createResult(quizId: string, userId: string, totalQuestions: number): Promise<string> {
    const result: QuizResult = {
      quizId,
      userId,
      status: 'in_progress',
      startedAt: new Date(),
      totalQuestions,
      answers: [],
    };

    const resultsCollection = collection(this.firestore, this.collectionName);
    const docRef = await addDoc(resultsCollection, result);
    return docRef.id;
  }

  /** Add or update an answer in a result */
  async addAnswer(resultId: string, answer: QuizAnswer) {
    const resultDoc = doc(this.firestore, this.collectionName, resultId);
    const snapshot = await firstValueFrom(docData(resultDoc));

    let currentAnswers: QuizAnswer[] = (snapshot as any)?.answers ?? [];

    // Replace existing answer for the same questionId
    const index = currentAnswers.findIndex(a => a.questionId === answer.questionId);
    if (index > -1) {
      currentAnswers[index] = answer;
    } else {
      currentAnswers.push(answer);
    }

    await updateDoc(resultDoc, { answers: currentAnswers });
  }

  /** Complete a quiz result */
  async completeResult(resultId: string) {
    const resultDoc = doc(this.firestore, this.collectionName, resultId);
    const snapshot = await firstValueFrom(docData(resultDoc));

    const result = snapshot as QuizResult;
    if (!result) throw new Error('Result not found');

    // Calculate score
    const score = result.answers.filter(a => a.correct).length;

    await updateDoc(resultDoc, {
      status: 'completed',
      completedAt: new Date(),
      score,
    });
  }

  /** Get all results for a user */
  getUserResults(userId: string): Observable<QuizResult[]> {
    return defer(() => {
      const q = query(collection(this.firestore, this.collectionName), where('userId', '==', userId));
      return collectionData(q, { idField: 'resultId' }) as Observable<QuizResult[]>;
    });
  }

  /** Get all results for a quiz */
  getQuizResults(quizId: string): Observable<QuizResult[]> {
    return defer(() => {
      const q = query(collection(this.firestore, this.collectionName), where('quizId', '==', quizId));
      return collectionData(q, { idField: 'resultId' }) as Observable<QuizResult[]>;
    });
  }

  /** Get a single result by ID */
  getResultById(resultId: string): Observable<QuizResult | undefined> {
    return defer(() => {
      const resultDoc = doc(this.firestore, this.collectionName, resultId);
      return docData(resultDoc, { idField: 'resultId' }) as Observable<QuizResult | undefined>;
    });
  }

    /** 
   * Get summarized quiz score history for a user.
   * Returns an array of { quizId, score } objects for completed quizzes only.
   */
  async getUserQuizScoreHistory(userId: string): Promise<{ quizId: number; score: number | null }[]> {
    const q = query(
      collection(this.firestore, this.collectionName),
      where('userId', '==', userId),
      where('status', '==', 'completed'),
      where('quizId', '<=', 1000)
    );

    const snapshot = await firstValueFrom(collectionData(q, { idField: 'resultId' }));
    const results = snapshot as QuizResult[];

    // Convert to { quizId, score }
    const scores = results.map(r => ({
      quizId: Number(r.quizId),
      score: r.score ?? null
    }));

    // Sort by quizId (useful for chart order)
    return scores.sort((a, b) => a.quizId - b.quizId);
  }

}
