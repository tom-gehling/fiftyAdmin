import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  documentId
} from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from '@/shared/services/auth.service';
import { AppUser } from '@/shared/models/user.model';

@Injectable({ providedIn: 'root' })
export class UserSearchService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  /**
   * Search for users within the current user's followers and following lists.
   * Searches by displayName (case-insensitive partial match).
   */
  searchFollowersFollowing(searchTerm: string, limit: number = 10): Observable<AppUser[]> {
    const currentUid = this.auth.currentUserId;
    if (!currentUid) return of([]);

    return from(this.getFollowersFollowingUids(currentUid)).pipe(
      switchMap(uids => {
        if (uids.length === 0) return of([]);
        return this.getUsersByIds(uids);
      }),
      map(users => {
        if (!searchTerm.trim()) return users.slice(0, limit);

        const term = searchTerm.toLowerCase();
        return users
          .filter(u =>
            u.displayName?.toLowerCase().includes(term) ||
            u.email?.toLowerCase().includes(term)
          )
          .slice(0, limit);
      })
    );
  }

  /**
   * Get all followers and following UIDs for a user.
   */
  private async getFollowersFollowingUids(uid: string): Promise<string[]> {
    const uidSet = new Set<string>();

    // Get following
    const followingRef = collection(this.firestore, `users/${uid}/following`);
    const followingSnap = await getDocs(followingRef);
    followingSnap.docs.forEach(d => {
      const data = d.data();
      if (data['followedUid']) uidSet.add(data['followedUid']);
    });

    // Get followers
    const followersRef = collection(this.firestore, `users/${uid}/followers`);
    const followersSnap = await getDocs(followersRef);
    followersSnap.docs.forEach(d => {
      const data = d.data();
      if (data['followerUid']) uidSet.add(data['followerUid']);
    });

    // Remove self
    uidSet.delete(uid);

    return Array.from(uidSet);
  }

  /**
   * Get users by their UIDs.
   * Firestore 'in' queries are limited to 30 items, so we batch if needed.
   */
  getUsersByIds(uids: string[]): Observable<AppUser[]> {
    if (uids.length === 0) return of([]);

    return from(this.fetchUsersByIds(uids));
  }

  private async fetchUsersByIds(uids: string[]): Promise<AppUser[]> {
    const users: AppUser[] = [];
    const usersRef = collection(this.firestore, 'users');

    // Batch in groups of 30 (Firestore 'in' query limit)
    const batches: string[][] = [];
    for (let i = 0; i < uids.length; i += 30) {
      batches.push(uids.slice(i, i + 30));
    }

    for (const batch of batches) {
      const q = query(usersRef, where(documentId(), 'in', batch));
      const snap = await getDocs(q);
      snap.docs.forEach(d => {
        const data = d.data();
        users.push({
          uid: d.id,
          email: data['email'] ?? null,
          displayName: data['displayName'] ?? null,
          photoUrl: data['photoUrl'] ?? null,
          createdAt: data['createdAt']
            ? new Date((data['createdAt'] as any).seconds * 1000)
            : new Date(),
          isMember: data['isMember'] ?? false,
          isAnon: data['isAnon'] ?? false,
          followers: data['followers'] ?? [],
          following: data['following'] ?? [],
          loginCount: data['loginCount'] ?? 0
        });
      });
    }

    return users;
  }

  /**
   * Get a single user by UID.
   */
  async getUserById(uid: string): Promise<AppUser | undefined> {
    const userRef = doc(this.firestore, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return undefined;

    const data = userSnap.data();
    return {
      uid: userSnap.id,
      email: data['email'] ?? null,
      displayName: data['displayName'] ?? null,
      photoUrl: data['photoUrl'] ?? null,
      createdAt: data['createdAt']
        ? new Date((data['createdAt'] as any).seconds * 1000)
        : new Date(),
      isMember: data['isMember'] ?? false,
      isAnon: data['isAnon'] ?? false,
      followers: data['followers'] ?? [],
      following: data['following'] ?? [],
      loginCount: data['loginCount'] ?? 0
    };
  }

  /**
   * Get suggested users (followers/following without search term).
   */
  getSuggestedUsers(limit: number = 5): Observable<AppUser[]> {
    return this.searchFollowersFollowing('', limit);
  }
}
