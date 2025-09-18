import { Injectable, inject } from '@angular/core';
import {
    Auth,
    signInAnonymously,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
    updateProfile,
    updatePassword
} from '@angular/fire/auth';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { browserLocalPersistence, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private auth = inject(Auth);
    private firestore = inject(Firestore);

    // Observables
    public user$ = new BehaviorSubject<User | null>(null);
    public isMember$ = new BehaviorSubject<boolean>(false);
    public isAdmin$ = new BehaviorSubject<boolean>(false);
    public initialized$ = new BehaviorSubject(false);

    constructor() {
        // Listen for Firebase auth changes
        onAuthStateChanged(this.auth, async (user) => {
            this.user$.next(user);

            if (user && !user.isAnonymous) {
                await this.checkAdminOrMember(user.email);
            } else {
                // Anonymous or logged out
                this.isAdmin$.next(false);
                this.isMember$.next(false);
            }

            this.initialized$.next(true);
        });
    }

    // Email/password login
    async loginEmailPassword(email: string, password: string, rememberMe: boolean = false) {
        await setPersistence(this.auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        const cred = await signInWithEmailAndPassword(this.auth, email, password);

        // Set fallback display name if missing
        if (!cred.user.displayName) {
            const fallbackName = email.split('@')[0];
            await updateProfile(cred.user, { displayName: fallbackName });
        }

        this.user$.next(cred.user);
        await this.checkAdminOrMember(cred.user.email);

        return cred.user;
    }

    // Optional anonymous login
    async loginAnonymous() {
        if (!this.auth.currentUser) {
            const cred = await signInAnonymously(this.auth);
            this.user$.next(cred.user);
            this.isAdmin$.next(false);
            this.isMember$.next(false);
            return cred.user;
        }
        return this.auth.currentUser;
    }

    // Update profile
    async updateDisplayName(displayName: string) {
        if (this.auth.currentUser) {
            await updateProfile(this.auth.currentUser, { displayName });
            this.user$.next({ ...this.auth.currentUser });
        }
    }

    async updatePassword(newPassword: string) {
        if (this.auth.currentUser) {
            await updatePassword(this.auth.currentUser, newPassword);
        }
    }

    async logout() {
        await signOut(this.auth);
        this.user$.next(null);
        this.isAdmin$.next(false);
        this.isMember$.next(false);
    }

    get currentUserId(): string | null {
        return this.auth.currentUser?.uid ?? null;
    }

    get isAnonymous(): boolean {
        return this.auth.currentUser?.isAnonymous ?? true;
    }

    /**
     * Check if user is an admin or a member
     */
    private async checkAdminOrMember(email: string | null) {
        if (!email) {
            this.isAdmin$.next(false);
            this.isMember$.next(false);
            return;
        }

        const q = query(collection(this.firestore, 'admins'), where('emailAddress', '==', email));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            // Admin user
            this.isAdmin$.next(true);
            this.isMember$.next(false);
        } else {
            // Authenticated but not admin → member
            this.isAdmin$.next(false);
            this.isMember$.next(true);
        }
    }
}
