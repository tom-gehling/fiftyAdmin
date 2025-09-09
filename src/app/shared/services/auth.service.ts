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
import { browserLocalPersistence, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private auth = inject(Auth);

    // current user observable
    public user$ = new BehaviorSubject<User | null>(null);

    // track if Firebase has finished initializing
    public initialized$ = new BehaviorSubject(false);

    constructor() {
        onAuthStateChanged(this.auth, (user) => {
            this.user$.next(user);
            this.initialized$.next(true); // auth state restored
        });
    }

    // login with email/password and persistence
    async loginEmailPassword(email: string, password: string, rememberMe: boolean = false) {
        await setPersistence(this.auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        const cred = await signInWithEmailAndPassword(this.auth, email, password);

        if (!cred.user.displayName) {
            const fallbackName = email.split('@')[0];
            await updateProfile(cred.user, { displayName: fallbackName });
        }

        this.user$.next(cred.user);
        return cred.user;
    }

    // optional: anonymous login (only call if needed)
    async loginAnonymous() {
        if (!this.auth.currentUser) {
            const cred = await signInAnonymously(this.auth);
            this.user$.next(cred.user);
            return cred.user;
        }
        return this.auth.currentUser;
    }

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
    }

    get currentUserId(): string | null {
        return this.auth.currentUser?.uid ?? null;
    }

    get isAnonymous(): boolean {
        return this.auth.currentUser?.isAnonymous ?? true;
    }
}
