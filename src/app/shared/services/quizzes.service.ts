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
    CollectionReference
} from '@angular/fire/firestore';
import { defer, map, Observable } from 'rxjs';
import { Quiz } from '../models/quiz.model';
import { QuizTypeEnum } from '../enums/QuizTypeEnum';
import { firstValueFrom } from 'rxjs';

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

    getAllPremiumQuiz(): Observable<Quiz | undefined> {
        return this.getAllQuizzes().pipe(
            map(quizzes => quizzes.find(q => q.isPremium))
        );
    }

    getAllActiveQuiz(): Observable<Quiz | undefined> {
        return this.getAllQuizzes().pipe(
            map(quizzes => quizzes.find(q => q.isActive))
        );
    }

    getQuizById(id: string): Observable<Quiz | undefined> {
        return defer(() => {
            const quizDocRef = doc(this.firestore, this.collectionName, id);
            return docData(quizDocRef, { idField: 'id' }) as Observable<
                Quiz | undefined
            >;
        });
    }

    getActiveQuiz(): Observable<Quiz | undefined> {
        const now = new Date();
        return this.getAllQuizzes().pipe(
            map(quizzes => 
            quizzes
                .filter(q => q.quizType == QuizTypeEnum.Weekly && q.deploymentDate != null && q.deploymentDate <= now)
                .sort((a, b) => (b.deploymentDate!.getTime() - a.deploymentDate!.getTime()))[0]
            )
        );
    }

getArchiveQuizzes(getHeader: boolean = false): Observable<any[]> {
  const now = new Date();
  return this.getAllQuizzes().pipe(
    map(quizzes => {
      // only past weekly quizzes
      const pastQuizzes = quizzes.filter(
        q => q.quizType === QuizTypeEnum.Weekly && q.deploymentDate != null && q.deploymentDate < now
      );

      // find active quiz
      const activeQuiz = pastQuizzes
        .sort((a, b) => b.deploymentDate!.getTime() - a.deploymentDate!.getTime())[0];

      // all other past quizzes excluding the active quiz
      const archiveQuizzes = pastQuizzes.filter(q => q.id !== activeQuiz?.id)
        .sort((a, b) => b.deploymentDate!.getTime() - a.deploymentDate!.getTime());

      if (getHeader) {
        return archiveQuizzes.map(q => ({ quizId: q.quizId, quizTitle: q.quizTitle }));
      }

      return archiveQuizzes;
    })
  );
}

getExclusives(getHeader: boolean = false): Observable<any[]> {
  return this.getAllQuizzes().pipe(
    map(quizzes => {
      const list = quizzes.filter(q => q.quizType === QuizTypeEnum.FiftyPlus);
      return getHeader
        ? list.map(q => ({ quizId: q.quizId, quizTitle: q.quizTitle }))
        : list;
    })
  );
}

getCollaborations(getHeader: boolean = false): Observable<any[]> {
  return this.getAllQuizzes().pipe(
    map(quizzes => {
      const list = quizzes.filter(q => q.quizType === QuizTypeEnum.Collab);
      return getHeader
        ? list.map(q => ({ quizId: q.quizId, quizTitle: q.quizTitle }))
        : list;
    })
  );
}

    async createQuiz(data: Quiz, userId: string | null = null): Promise<string> {
        if (!data.creationTime) {
            (data.creationTime as any) = Timestamp.now();
        }

        if (userId) {
            (data as any).createdBy = userId;
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

async getNextQuizId(): Promise<number> {
  const quizCollection: CollectionReference = collection(this.firestore, this.collectionName);
  const snapshot = await firstValueFrom(collectionData(quizCollection, { idField: 'id' }));

  if (!snapshot || snapshot.length === 0) {
    return 1; // start from 1 if no quizzes exist
  }

  const quizIds = (snapshot as Quiz[])
    .map(q => Number(q.quizId))
    .filter(id => !isNaN(id));

  return quizIds.length === 0 ? 1 : Math.max(...quizIds) + 1;
}

}
