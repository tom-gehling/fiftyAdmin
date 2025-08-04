import { Injectable, inject } from '@angular/core';
import {
    Auth,
    signInAnonymously,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
} from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private auth = inject(Auth);
    public user$ = new BehaviorSubject<User | null>(null);

    constructor() {
        onAuthStateChanged(this.auth, (user) => this.user$.next(user));
        this.ensureAnonymousLogin();
    }

    async ensureAnonymousLogin() {
        if (!this.auth.currentUser) {
            await signInAnonymously(this.auth);
        }
    }

    async loginEmailPassword(email: string, password: string) {
        return signInWithEmailAndPassword(this.auth, email, password);
    }

    async logout() {
        await signOut(this.auth);
        await this.ensureAnonymousLogin(); // fallback to anonymous after logout
    }

    get currentUserId(): string | null {
        return this.auth.currentUser?.uid ?? null;
    }

    get isAnonymous(): boolean {
        return this.auth.currentUser?.isAnonymous ?? true;
    }
}
