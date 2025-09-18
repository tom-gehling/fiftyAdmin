import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, switchMap, take, map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  canActivate(): Observable<boolean> {
    return this.auth.initialized$.pipe(
      filter(init => init),                  // wait for Firebase to initialize
      take(1),
      switchMap(() => this.auth.user$),      // get current user
      take(1),
      map(user => !!user && !user.isAnonymous) // only allow authenticated users
    );
  }
}
