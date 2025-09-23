import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, switchMap, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.auth.initialized$.pipe(
      filter(init => init),               // wait for Firebase to initialize
      take(1),
      switchMap(() => this.auth.isAdmin$), // return admin status
      take(1),
      map(isAdmin => {
        if (!isAdmin) this.router.navigate(['/members']); // redirect if not admin
        return !!isAdmin;
      })
    );
  }
}
