import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  collection,
  addDoc,
  setDoc,
  updateDoc,
  docData,
  collectionData,
  deleteDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class QuizSessionsService {
  private firestore = inject(Firestore);

  /** Start new session (use generated id by addDoc or pass a sessionId and use setDoc) */
  async startSession(uid: string, sessionId: string | null, quizId: string) {
    if (sessionId) {
      // explicit sessionId
      const ref = doc(this.firestore, `users/${uid}/quizSessions/${sessionId}`);
      await setDoc(ref, {
        quizId,
        status: 'in_progress',
        startedAt: serverTimestamp(),
        completedAt: null,
        currentQuestionIndex: 0
      });
      return sessionId;
    } else {
      // let Firestore generate id
      const col = collection(this.firestore, `users/${uid}/quizSessions`);
      const docRef = await addDoc(col, {
        quizId,
        status: 'in_progress',
        startedAt: serverTimestamp(),
        completedAt: null,
        currentQuestionIndex: 0
      });
      return docRef.id;
    }
  }

  /** Record a question interaction (event) */
  async recordQuestionEvent(uid: string, sessionId: string, questionId: string, correct: boolean) {
    const eventsCol = collection(this.firestore, `users/${uid}/quizSessions/${sessionId}/events`);
    await addDoc(eventsCol, {
      questionId,
      correct,
      timestamp: serverTimestamp()
    });
  }

  /** Optionally write per-question result directly into session document (merge) */
  async setQuestionInSession(uid: string, sessionId: string, questionId: string, payload: { correct: boolean; timestamp?: any }) {
    const sessionRef = doc(this.firestore, `users/${uid}/quizSessions/${sessionId}`);
    // use nested field: questions.<questionId>
    await updateDoc(sessionRef, {
      [`questions.${questionId}`]: {
        correct: payload.correct,
        timestamp: payload.timestamp ?? serverTimestamp()
      }
    });
  }

  async updateCurrentIndex(uid: string, sessionId: string, index: number) {
    const ref = doc(this.firestore, `users/${uid}/quizSessions/${sessionId}`);
    await updateDoc(ref, { currentQuestionIndex: index });
  }

  async completeSession(uid: string, sessionId: string, summary?: any) {
    const ref = doc(this.firestore, `users/${uid}/quizSessions/${sessionId}`);
    const payload: any = {
      status: 'completed',
      completedAt: serverTimestamp()
    };
    if (summary) {
      payload.summary = summary;
    }
    await updateDoc(ref, payload);
  }

  getSession(uid: string, sessionId: string): Observable<any> {
    return docData(doc(this.firestore, `users/${uid}/quizSessions/${sessionId}`), { idField: 'sessionId' });
  }

  getAllSessions(uid: string): Observable<any[]> {
    return collectionData(collection(this.firestore, `users/${uid}/quizSessions`), { idField: 'sessionId' });
  }

  async deleteSession(uid: string, sessionId: string) {
    await deleteDoc(doc(this.firestore, `users/${uid}/quizSessions/${sessionId}`));
  }
}
