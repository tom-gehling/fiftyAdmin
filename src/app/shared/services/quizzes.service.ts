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
    CollectionReference,
    query,
    where,
    getDocs
} from '@angular/fire/firestore';
import { defer, from, map, Observable } from 'rxjs';
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
                Quiz | undefined>
            ;
        });
    }

    getQuizByQuizId(quizId: string): Observable<Quiz | undefined> {
  const quizzesRef = collection(this.firestore, this.collectionName);
  const q = query(quizzesRef, where('quizId', '==', quizId));

  return from(getDocs(q)).pipe(
    map(snapshot => {
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return { ...(doc.data() as Quiz), id: doc.id };
    })
  );
}

    getActiveQuiz(): Observable<Quiz | undefined> {
  const now = new Date();
  return this.getAllQuizzes().pipe(
    map(quizzes =>
      quizzes
        .filter(q =>
          q.quizType === QuizTypeEnum.Weekly &&
          q.deploymentDate != null &&
          (q.deploymentDate instanceof Date ? q.deploymentDate : q.deploymentDate.toDate()) <= now
        )
        .sort((a, b) => {
          const aTime = a.deploymentDate instanceof Date ? a.deploymentDate.getTime() : a.deploymentDate?.toDate().getTime() ?? 0;
          const bTime = b.deploymentDate instanceof Date ? b.deploymentDate.getTime() : b.deploymentDate?.toDate().getTime() ?? 0;
          return bTime - aTime;
        })[0]
    )
  );
}

getArchiveQuizzes(getHeader: boolean = false): Observable<any[]> {
  const now = new Date();
  return this.getAllQuizzes().pipe(
    map(quizzes => {
      const pastQuizzes = quizzes
        .filter(q =>
          q.quizType === QuizTypeEnum.Weekly &&
          q.deploymentDate != null &&
          (q.deploymentDate instanceof Date ? q.deploymentDate : q.deploymentDate.toDate()) < now
        );

      const activeQuiz = pastQuizzes
        .sort((a, b) => {
          const aTime = a.deploymentDate instanceof Date ? a.deploymentDate.getTime() : a.deploymentDate?.toDate().getTime() ?? 0;
          const bTime = b.deploymentDate instanceof Date ? b.deploymentDate.getTime() : b.deploymentDate?.toDate().getTime() ?? 0;
          return bTime - aTime;
        })[0];

      const archiveQuizzes = pastQuizzes
        .filter(q => q.id !== activeQuiz?.id)
        .sort((a, b) => {
          const aTime = a.deploymentDate instanceof Date ? a.deploymentDate.getTime() : a.deploymentDate?.toDate().getTime() ?? 0;
          const bTime = b.deploymentDate instanceof Date ? b.deploymentDate.getTime() : b.deploymentDate?.toDate().getTime() ?? 0;
          return bTime - aTime;
        });

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

getQuestionQuizzes(getHeader: boolean = false): Observable<any[]> {
  return this.getAllQuizzes().pipe(
    map(quizzes => {
      const list = quizzes.filter(q => q.quizType === QuizTypeEnum.QuestionType);
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

async getNextQuizId(quizType: QuizTypeEnum): Promise<number> {
  const quizCollection: CollectionReference = collection(this.firestore, this.collectionName);
  const snapshot = await firstValueFrom(collectionData(quizCollection, { idField: 'id' }));

  // Define starting ranges per type
  let startNumber = 1;
  switch (quizType) {
    case QuizTypeEnum.Weekly:
      startNumber = 1;
      break;
    case QuizTypeEnum.FiftyPlus:
      startNumber = 10000;
      break;
    case QuizTypeEnum.Collab:
      startNumber = 20000;
      break;
    case QuizTypeEnum.QuestionType:
    startNumber = 30000;
    break;
  }

  if (!snapshot || snapshot.length === 0) {
    return startNumber;
  }

  const quizIds = (snapshot as Quiz[])
    .filter(q => q.quizType === quizType)      // only consider quizzes of the same type
    .map(q => Number(q.quizId))
    .filter(id => !isNaN(id) && id >= startNumber);

  return quizIds.length === 0 ? startNumber : Math.max(...quizIds) + 1;
}


}
