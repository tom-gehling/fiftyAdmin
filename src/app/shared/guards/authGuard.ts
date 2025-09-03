// src/app/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.auth.user$.pipe(
        take(1),
      map(user => {
        if (user && !user.isAnonymous) {
          return true; // logged in, allow access
        } else {
          this.router.navigate(['/login']); // redirect to login
          return false;
        }
      })
    );
  }
}
