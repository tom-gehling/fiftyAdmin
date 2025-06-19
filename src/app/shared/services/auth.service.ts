import { Injectable, inject } from '@angular/core';
import {
    Auth,
    signInAnonymously,
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

    get currentUserId(): string | null {
        return this.auth.currentUser?.uid ?? null;
    }
}
