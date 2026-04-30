import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, query, where, orderBy } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, of, switchMap } from 'rxjs';
import { AuthService } from '@/shared/services/auth.service';
import { TagInvite } from '@/shared/models/tagInvite.model';

@Injectable({ providedIn: 'root' })
export class TagInviteService {
    private firestore = inject(Firestore);
    private functions = inject(Functions);
    private auth = inject(AuthService);

    /**
     * Stream of pending tag invites for the currently signed-in user.
     * Backed by the `tagInvites` collection (Firestore rules restrict reads to the invitee).
     */
    pendingInvites$(): Observable<TagInvite[]> {
        return this.auth.user$.pipe(
            switchMap((user) => {
                if (!user?.uid) return of([] as TagInvite[]);
                const ref = collection(this.firestore, 'tagInvites');
                const q = query(ref, where('invitedUid', '==', user.uid), orderBy('invitedAt', 'desc'));
                return collectionData(q, { idField: 'inviteId' }) as Observable<TagInvite[]>;
            })
        );
    }

    /**
     * Accept or decline a tag invite. Server-side handler updates the canonical
     * QuizResult and removes the invite doc atomically.
     */
    async respond(resultId: string, accept: boolean): Promise<void> {
        const callable = httpsCallable<{ resultId: string; accept: boolean }, { success: boolean; accepted: boolean }>(this.functions, 'respondToTagInvite');
        await callable({ resultId, accept });
    }
}
