import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment
} from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Observable, from, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { QuizSubmission, UserSubmissionStats, TaggedUser } from '@/shared/models/quizSubmission.model';

@Injectable({ providedIn: 'root' })
export class QuizSubmissionService {
  private firestore = inject(Firestore);
  private storage = inject(Storage);

  private submissionsRef = collection(this.firestore, 'quizSubmissions');

  /**
   * Create a new quiz submission and propagate stats to submitter and tagged users.
   */
  async createSubmission(submission: Partial<QuizSubmission>): Promise<string> {
    const submissionData = {
      ...submission,
      taggedUsers: submission.taggedUsers ?? [],
      customFields: submission.customFields ?? {},
      submittedAt: serverTimestamp()
    };

    const docRef = await addDoc(this.submissionsRef, submissionData);

    // Update stats for submitter
    if (submission.submitterId && submission.score !== undefined && submission.quizId !== undefined) {
      await this.updateUserStats(submission.submitterId, {
        score: submission.score,
        quizId: submission.quizId,
        wasTagged: false
      });

      // Update stats for each tagged user
      if (submission.taggedUsers?.length) {
        await Promise.all(
          submission.taggedUsers.map(user =>
            this.updateUserStats(user.uid, {
              score: submission.score!,
              quizId: submission.quizId!,
              wasTagged: true
            })
          )
        );
      }
    }

    return docRef.id;
  }

  /**
   * Update an existing submission.
   */
  async updateSubmission(submissionId: string, data: Partial<QuizSubmission>): Promise<void> {
    const docRef = doc(this.firestore, 'quizSubmissions', submissionId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Delete a submission.
   */
  async deleteSubmission(submissionId: string): Promise<void> {
    const docRef = doc(this.firestore, 'quizSubmissions', submissionId);
    await deleteDoc(docRef);
  }

  /**
   * Get all submissions.
   */
  getAllSubmissions(): Observable<QuizSubmission[]> {
    return from(this.fetchAllSubmissions());
  }

  private async fetchAllSubmissions(): Promise<QuizSubmission[]> {
    const q = query(this.submissionsRef, orderBy('submittedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => this.mapDocToSubmission(d));
  }

  /**
   * Get submissions for a specific quiz.
   */
  getSubmissionsByQuiz(quizId: number): Observable<QuizSubmission[]> {
    return from(this.fetchSubmissionsByQuiz(quizId));
  }

  private async fetchSubmissionsByQuiz(quizId: number): Promise<QuizSubmission[]> {
    const q = query(
      this.submissionsRef,
      where('quizId', '==', quizId),
      orderBy('submittedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => this.mapDocToSubmission(d));
  }

  /**
   * Get submissions by a specific user (as submitter).
   */
  getSubmissionsByUser(userId: string): Observable<QuizSubmission[]> {
    return from(this.fetchSubmissionsByUser(userId));
  }

  private async fetchSubmissionsByUser(userId: string): Promise<QuizSubmission[]> {
    const q = query(
      this.submissionsRef,
      where('submitterId', '==', userId),
      orderBy('submittedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => this.mapDocToSubmission(d));
  }

  /**
   * Get a single submission by ID.
   */
  async getSubmissionById(submissionId: string): Promise<QuizSubmission | undefined> {
    const docRef = doc(this.firestore, 'quizSubmissions', submissionId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return undefined;
    return this.mapDocToSubmission(docSnap);
  }

  /**
   * Upload a submission photo to Firebase Storage.
   */
  async uploadSubmissionPhoto(file: File, quizId: number, userId: string): Promise<string> {
    const filePath = `submission-photos/${quizId}/${userId}/${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, filePath);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  /**
   * Get user submission stats.
   */
  async getUserSubmissionStats(uid: string): Promise<UserSubmissionStats | undefined> {
    const statsRef = doc(this.firestore, 'userSubmissionStats', uid);
    const statsSnap = await getDoc(statsRef);

    if (!statsSnap.exists()) return undefined;

    const data = statsSnap.data();
    return {
      uid: data['uid'],
      totalSubmissions: data['totalSubmissions'] ?? 0,
      totalTagged: data['totalTagged'] ?? 0,
      totalScore: data['totalScore'] ?? 0,
      averageScore: data['averageScore'] ?? 0,
      quizCount: data['quizCount'] ?? 0,
      lastSubmissionAt: data['lastSubmissionAt']
        ? new Date((data['lastSubmissionAt'] as any).seconds * 1000)
        : new Date()
    };
  }

  /**
   * Update user submission stats (called when a submission is created).
   */
  private async updateUserStats(
    uid: string,
    data: { score: number; quizId: number; wasTagged: boolean }
  ): Promise<void> {
    const statsRef = doc(this.firestore, 'userSubmissionStats', uid);
    const statsSnap = await getDoc(statsRef);

    if (!statsSnap.exists()) {
      // Create new stats document
      await setDoc(statsRef, {
        uid,
        totalSubmissions: data.wasTagged ? 0 : 1,
        totalTagged: data.wasTagged ? 1 : 0,
        totalScore: data.score,
        averageScore: data.score,
        quizCount: 1,
        lastSubmissionAt: serverTimestamp()
      });
    } else {
      // Update existing stats
      const current = statsSnap.data();
      const newSubmissions = data.wasTagged
        ? current['totalSubmissions'] ?? 0
        : (current['totalSubmissions'] ?? 0) + 1;
      const newTagged = data.wasTagged
        ? (current['totalTagged'] ?? 0) + 1
        : current['totalTagged'] ?? 0;
      const newTotalScore = (current['totalScore'] ?? 0) + data.score;
      const newQuizCount = (current['quizCount'] ?? 0) + 1;
      const newAverage = newTotalScore / newQuizCount;

      await updateDoc(statsRef, {
        totalSubmissions: newSubmissions,
        totalTagged: newTagged,
        totalScore: newTotalScore,
        averageScore: newAverage,
        quizCount: newQuizCount,
        lastSubmissionAt: serverTimestamp()
      });
    }
  }

  private mapDocToSubmission(docSnap: any): QuizSubmission {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      quizId: data['quizId'],
      quizDocId: data['quizDocId'],
      formId: data['formId'],
      submitterId: data['submitterId'],
      submitterName: data['submitterName'],
      teamName: data['teamName'],
      location: data['location'],
      score: data['score'],
      pictureUrl: data['pictureUrl'],
      taggedUsers: data['taggedUsers'] ?? [],
      customFields: data['customFields'] ?? {},
      submittedAt: data['submittedAt']
        ? new Date((data['submittedAt'] as any).seconds * 1000)
        : new Date()
    };
  }
}
