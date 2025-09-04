import { Injectable, inject } from '@angular/core';
import {
    Auth,
    signInAnonymously,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
} from '@angular/fire/auth';
import { browserLocalPersistence, browserSessionPersistence, setPersistence, updatePassword, updateProfile } from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private auth = inject(Auth);
    public user$ = new BehaviorSubject<User | null>(null);

    constructor() {
        onAuthStateChanged(this.auth, (user) => this.user$.next(user));
        // this.ensureAnonymousLogin();
    }

    async ensureAnonymousLogin() {
        if (!this.auth.currentUser) {
            await signInAnonymously(this.auth);
        }
    }

    async loginEmailPassword(email: string, password: string, rememberMe: boolean = false) {
        await setPersistence(this.auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        const cred = await signInWithEmailAndPassword(this.auth, email, password);
        if (!cred.user.displayName) {
            const fallbackName = email.split('@')[0];
            await updateProfile(cred.user, { displayName: fallbackName });
        }
        return cred.user;
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
        // await this.ensureAnonymousLogin(); // fallback to anonymous after logout
    }

    get currentUserId(): string | null {
        return this.auth.currentUser?.uid ?? null;
    }

    get isAnonymous(): boolean {
        return this.auth.currentUser?.isAnonymous ?? true;
    }
}
