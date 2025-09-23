import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  docData,
  collectionData,
  collection,
  deleteDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class QuizResultsService {
  private firestore = inject(Firestore);

  /** Save a completed quiz result: users/{uid}/quizResults/{quizId} */
  async saveResult(uid: string, quizId: string, payload: any) {
    const ref = doc(this.firestore, `users/${uid}/quizResults/${quizId}`);
    await setDoc(ref, payload, { merge: true });
  }

  getResult(uid: string, quizId: string): Observable<any> {
    return docData(doc(this.firestore, `users/${uid}/quizResults/${quizId}`), { idField: 'quizId' });
  }

  getAllResults(uid: string): Observable<any[]> {
    return collectionData(collection(this.firestore, `users/${uid}/quizResults`), { idField: 'quizId' });
  }

  async deleteResult(uid: string, quizId: string) {
    await deleteDoc(doc(this.firestore, `users/${uid}/quizResults/${quizId}`));
  }
}
