import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    collection,
    collectionData,
    doc,
    docData,
    addDoc,
    updateDoc,
    deleteDoc,
    Timestamp,
} from '@angular/fire/firestore';
import { defer, Observable } from 'rxjs';
import { Quiz } from '../../models/quiz.model';

@Injectable({
    providedIn: 'root',
})
export class QuizzesService {
    private firestore = inject(Firestore);
    private collectionName = 'quizzes';

    getAllQuizzes(): Observable<Quiz[]> {
        return defer(() => {
            const quizCollection = collection(
                this.firestore,
                this.collectionName
            );
            return collectionData(quizCollection, {
                idField: 'id',
            }) as Observable<Quiz[]>;
        });
    }

    getQuizById(id: string): Observable<Quiz | undefined> {
        return defer(() => {
            const quizDocRef = doc(this.firestore, this.collectionName, id);
            return docData(quizDocRef, { idField: 'id' }) as Observable<
                Quiz | undefined
            >;
        });
    }

    async createQuiz(data: Quiz): Promise<string> {
        if (!data.creationTime) {
            (data.creationTime as any) = Timestamp.now();
        }

        const quizCollection = collection(this.firestore, this.collectionName);
        const docRef = await addDoc(quizCollection, data);
        return docRef.id;
    }

    async updateQuiz(id: string, data: Quiz): Promise<void> {
        const quizDoc = doc(this.firestore, this.collectionName, id);
        const { id: _, ...updateData } = data;
        await updateDoc(quizDoc, updateData);
    }

    async deleteQuiz(id: string): Promise<void> {
        const quizDoc = doc(this.firestore, this.collectionName, id);
        await deleteDoc(quizDoc);
    }
}
