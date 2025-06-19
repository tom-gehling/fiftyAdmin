import { Injectable } from '@angular/core';
import { collectionData, Firestore } from '@angular/fire/firestore';
import { addDoc, collection } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { Quiz } from '../../models/quiz.model';

@Injectable({
    providedIn: 'root',
})
export class QuizzesService {
    private collectionName = 'quizzes';

    constructor(private firestore: Firestore) {}

    //create new quiz
    async createQuiz(data: Quiz): Promise<void> {
        const quizCollection = collection(this.firestore, this.collectionName);
        await addDoc(quizCollection, data);
    }

    //get quizzes
    getAllQuiz(): Observable<any[]> {
        const quizCollection = collection(this.firestore, this.collectionName);
        return collectionData(quizCollection, { idField: 'id' });
    }
}
