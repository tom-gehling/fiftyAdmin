import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, collectionData, docData, addDoc, updateDoc, query, where, serverTimestamp } from '@angular/fire/firestore';
import { Observable, defer, firstValueFrom } from 'rxjs';
import { QuizResult, QuizAnswer } from '../models/quizResult.model';
import { TaggedUser } from '../models/quizSubmission.model';

@Injectable({ providedIn: 'root' })
export class QuizResultsService {
    private firestore = inject(Firestore);
    private collectionName = 'quizResults'; // top-level collection

    /** Create a new result (in-progress) */
    async createResult(quizId: string, userId: string, totalQuestions: number, userHidden?: boolean): Promise<string> {
        const now = new Date();
        const result: QuizResult = {
            quizId,
            userId,
            status: 'in_progress',
            startedAt: now,
            lastActivityAt: now,
            total: totalQuestions,
            answers: [],
            ...(userHidden ? { userHidden: true } : {})
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
        const index = currentAnswers.findIndex((a) => a.questionId === answer.questionId);
        if (index > -1) {
            currentAnswers[index] = answer;
        } else {
            currentAnswers.push(answer);
        }

        await updateDoc(resultDoc, {
            answers: currentAnswers,
            lastActivityAt: serverTimestamp()
        });
    }

    /** Complete a quiz result */
    async completeResult(resultId: string) {
        const resultDoc = doc(this.firestore, this.collectionName, resultId);
        const snapshot = await firstValueFrom(docData(resultDoc));

        const result = snapshot as QuizResult;
        if (!result) throw new Error('Result not found');

        // Calculate score
        const score = result.answers.filter((a) => a.correct).length;

        await updateDoc(resultDoc, {
            status: 'completed',
            completedAt: new Date(),
            lastActivityAt: serverTimestamp(),
            closedAt: null,
            score
        });
    }

    /** Bump lastActivityAt — called on periodic heartbeats and visibility changes while a quiz is open */
    async heartbeat(resultId: string) {
        const resultDoc = doc(this.firestore, this.collectionName, resultId);
        await updateDoc(resultDoc, { lastActivityAt: serverTimestamp() });
    }

    /** Clear closedAt when a user returns to an in-progress session so the live viewer count picks them back up */
    async markResumed(resultId: string) {
        const resultDoc = doc(this.firestore, this.collectionName, resultId);
        await updateDoc(resultDoc, { closedAt: null, lastActivityAt: serverTimestamp() });
    }

    /**
     * Wipe an in-progress result back to a fresh state without deleting the doc.
     * Used by the in-quiz reset button to restart a partially-completed quiz —
     * stays within firestore.rules' update allowance (no delete rule exists).
     */
    async resetInProgressResult(resultId: string) {
        const resultDoc = doc(this.firestore, this.collectionName, resultId);
        await updateDoc(resultDoc, {
            answers: [],
            score: 0,
            startedAt: new Date(),
            lastActivityAt: serverTimestamp(),
            closedAt: null,
            status: 'in_progress'
        });
    }

    /** Get all results for a user */
    getUserResults(userId: string): Observable<QuizResult[]> {
        return defer(() => {
            const q = query(collection(this.firestore, this.collectionName), where('userId', '==', userId));
            return collectionData(q, { idField: 'resultId' }) as Observable<QuizResult[]>;
        });
    }

    /** Get results where the user was tagged AND accepted (i.e. team-play credit, but not owner). */
    getTaggedInResults(userId: string): Observable<QuizResult[]> {
        return defer(() => {
            const q = query(collection(this.firestore, this.collectionName), where('taggedUserIdsAccepted', 'array-contains', userId));
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

    /** Create a retro (manually recorded) result */
    async createRetroResult(quizId: string, userId: string, score: number, totalQuestions: number, taggedUsers: TaggedUser[]): Promise<string> {
        const result: QuizResult = {
            quizId,
            userId,
            status: 'completed',
            startedAt: new Date(),
            completedAt: new Date(),
            total: totalQuestions,
            score,
            answers: [],
            retro: true,
            taggedUsers
        };

        const resultsCollection = collection(this.firestore, this.collectionName);
        const docRef = await addDoc(resultsCollection, result);
        return docRef.id;
    }

    /**
     * Get summarized quiz score history for a user.
     * Returns an array of { quizId, score } objects for completed quizzes only.
     */
    async getUserQuizScoreHistory(userId: string): Promise<{ quizId: number; score: number | null }[]> {
        // Use a simpler query with only two where clauses (avoids needing composite index)
        const q = query(collection(this.firestore, this.collectionName), where('userId', '==', userId), where('status', '==', 'completed'));

        const snapshot = await firstValueFrom(collectionData(q, { idField: 'resultId' }));
        const results = snapshot as QuizResult[];

        // Filter for quizId <= 1000 in memory, and exclude user-hidden results
        const filteredResults = results.filter((r) => Number(r.quizId) <= 1000 && !r.userHidden);

        // Convert to { quizId, score }
        const scores = filteredResults.map((r) => ({
            quizId: Number(r.quizId),
            score: r.score ?? null
        }));

        // Sort by quizId (useful for chart order)
        return scores.sort((a, b) => a.quizId - b.quizId);
    }
}
