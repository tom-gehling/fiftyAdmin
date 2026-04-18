import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthModalService {
    visible$ = new BehaviorSubject<boolean>(false);
    mode$ = new BehaviorSubject<'login' | 'register'>('login');

    open(mode: 'login' | 'register' = 'login') {
        this.mode$.next(mode);
        this.visible$.next(true);
    }

    close() {
        this.visible$.next(false);
    }
}
