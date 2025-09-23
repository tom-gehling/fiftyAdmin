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
  docData
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  private firestore = inject(Firestore);

  /** Ensure a users/{uid} document exists and increments loginCount */
  async createOrUpdateOnLogin(uid: string, data: { displayName?: string; email?: string; photoURL?: string }) {
    const userRef = doc(this.firestore, `users/${uid}`);
    await setDoc(userRef, {
      ...data,
      lastLoginAt: serverTimestamp(),
      loginCount: increment(1)
    }, { merge: true });
  }

  getUser(uid: string): Observable<any> {
    return docData(doc(this.firestore, `users/${uid}`), { idField: 'uid' });
  }

  async updateUser(uid: string, patch: Partial<any>) {
    const userRef = doc(this.firestore, `users/${uid}`);
    await updateDoc(userRef, patch);
  }

  async deleteUser(uid: string) {
    await deleteDoc(doc(this.firestore, `users/${uid}`));
  }

  /** Follow/unfollow helpers -- keeps counts in sync */
  async followUser(uid: string, followedUid: string) {
    const followingRef = doc(this.firestore, `users/${uid}/following/${followedUid}`);
    await setDoc(followingRef, { followedUid, followedAt: serverTimestamp() });
    await updateDoc(doc(this.firestore, `users/${uid}`), { followingCount: increment(1) });
    await updateDoc(doc(this.firestore, `users/${followedUid}`), { followersCount: increment(1) });
  }

  async unfollowUser(uid: string, followedUid: string) {
    await deleteDoc(doc(this.firestore, `users/${uid}/following/${followedUid}`));
    await updateDoc(doc(this.firestore, `users/${uid}`), { followingCount: increment(-1) });
    await updateDoc(doc(this.firestore, `users/${followedUid}`), { followersCount: increment(-1) });
  }
}
