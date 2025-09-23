import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  collectionData
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SubmissionsService {
  private firestore = inject(Firestore);

  async createSubmission(payload: any) {
    const col = collection(this.firestore, 'submissions');
    const docRef = await addDoc(col, payload);
    return docRef.id;
  }

  async updateSubmission(submissionId: string, payload: Partial<any>) {
    await updateDoc(doc(this.firestore, `submissions/${submissionId}`), payload);
  }

  async deleteSubmission(submissionId: string) {
    await deleteDoc(doc(this.firestore, `submissions/${submissionId}`));
  }

  getAllSubmissions(): Observable<any[]> {
    return collectionData(collection(this.firestore, 'submissions'), { idField: 'submissionId' });
  }
}
