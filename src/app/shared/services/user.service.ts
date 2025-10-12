import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  docData,
  collection,
  query,
  where,
  getDocs
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { QuizResultsService } from './quiz-result.service';

@Injectable({ providedIn: 'root' })
export class UserService {
  private firestore = inject(Firestore);
  private quizResultsService = inject(QuizResultsService);

  /** Ensure a users/{uid} document exists and increments loginCount */
  async createOrUpdateOnLogin(uid: string, data: { displayName?: string; email?: string; photoURL?: string }) {
    const userRef = doc(this.firestore, `users/${uid}`);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // First time user — create with createdAt and counters
      await setDoc(userRef, {
        ...data,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        loginCount: 1,
        followersCount: 0,
        followingCount: 0
      });
    } else {
      // Returning user — just update login info
      await updateDoc(userRef, {
        ...data,
        lastLoginAt: serverTimestamp(),
        loginCount: increment(1)
      });
    }
  }

  /** Basic user observable */
  getUser(uid: string): Observable<any> {
    return docData(doc(this.firestore, `users/${uid}`), { idField: 'uid' });
  }

  /** Update user profile fields */
  async updateUser(uid: string, patch: Partial<any>) {
    const userRef = doc(this.firestore, `users/${uid}`);
    await updateDoc(userRef, patch);
  }

  /** Delete user doc */
  async deleteUser(uid: string) {
    await deleteDoc(doc(this.firestore, `users/${uid}`));
  }

  /** Follow/unfollow helpers */
  async followUser(uid: string, followedUid: string) {
    if (uid === followedUid) return; // Prevent self-follow
    const followingRef = doc(this.firestore, `users/${uid}/following/${followedUid}`);
    await setDoc(followingRef, { followedUid, followedAt: serverTimestamp() });
    await updateDoc(doc(this.firestore, `users/${uid}`), { followingCount: increment(1) });
    await updateDoc(doc(this.firestore, `users/${followedUid}`), { followersCount: increment(1) });
  }

  async unfollowUser(uid: string, followedUid: string) {
    if (uid === followedUid) return; // Prevent self-unfollow weirdness
    await deleteDoc(doc(this.firestore, `users/${uid}/following/${followedUid}`));
    await updateDoc(doc(this.firestore, `users/${uid}`), { followingCount: increment(-1) });
    await updateDoc(doc(this.firestore, `users/${followedUid}`), { followersCount: increment(-1) });
  }

  /** 🔹 Get full quiz-related stats for a user */
  async getUserStats(uid: string): Promise<{ completedCount: number; averageScore: number }> {
    const results = await this.quizResultsService.getUserResults(uid).toPromise();
    const completed = results?.filter(r => r.status === 'completed' && r.score != null) ?? [];
    const completedCount = completed.length;
    const averageScore = completedCount
      ? completed.reduce((sum, r) => sum + (r.score ?? 0), 0) / completedCount
      : 0;

    return { completedCount, averageScore };
  }

  /** (Optional) Fetch followers count directly from subcollection */
  async getFollowersCount(uid: string): Promise<number> {
    const q = query(collection(this.firestore, `users/${uid}/followers`));
    const snap = await getDocs(q);
    return snap.size;
  }

  /** (Optional) Fetch following count directly from subcollection */
  async getFollowingCount(uid: string): Promise<number> {
    const q = query(collection(this.firestore, `users/${uid}/following`));
    const snap = await getDocs(q);
    return snap.size;
  }
}
