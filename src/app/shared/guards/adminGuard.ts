import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService) {}

  canActivate(): Observable<boolean> {
    return this.auth.initialized$.pipe(
      filter(init => init),          // wait for Firebase to initialize
      take(1),
      switchMap(() => this.auth.isAdmin$), // return the admin status directly
      take(1),
      map(isAdmin => !!isAdmin)      // ensure boolean
    );
  }
}
