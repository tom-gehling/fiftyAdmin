import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, switchMap, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate() {
    return this.auth.initialized$.pipe(
      filter(init => init),        // wait until Firebase finishes initializing
      take(1),
      switchMap(() => this.auth.user$.pipe(take(1))),
      map(user => {
        if (user && !user.isAnonymous) return true;
        this.router.navigate(['/login']);
        return false;
      })
    );
  }
}
