import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { Subscription, filter } from 'rxjs';

import { AuthService, AppUser } from '@/shared/services/auth.service';

const ROUTE_LABELS: Record<string, string> = {
  'find-a-venue': 'Find a Venue',
  'weekly-quiz': "This Week's Quiz",
  'fiftyshop': 'Fifty Shop',
  'contact-us': 'Contact Us',
};

@Component({
  selector: 'app-public-topbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    BreadcrumbModule,
    MenuModule,
    ButtonModule,
  ],
  template: `
    <nav class="public-topbar">
      <!-- Left: Breadcrumbs -->
      <p-breadcrumb [model]="breadcrumbItems" [home]="breadcrumbHome" styleClass="public-breadcrumb" />

      <!-- Right: Nav links + Profile -->
      <div class="topbar-right">
        <!-- Desktop nav links -->
        <div class="nav-links">
          <a routerLink="/weekly-quiz" routerLinkActive="active-link" class="nav-link">This Week's Quiz</a>
          <a routerLink="/login" class="nav-link">Fifty+</a>
          <a routerLink="/find-a-venue" routerLinkActive="active-link" class="nav-link">Find a Venue</a>
          <a href="https://theweeklyfifty.com.au/pshop/" target="_blank" class="nav-link">Fifty Shop</a>
        </div>

        <!-- Profile icon -->
        <p-menu #profileMenu [popup]="true" [model]="profileItems" />
        <button type="button" class="profile-btn" (click)="profileMenu.toggle($event)">
          <i class="pi" [ngClass]="user ? 'pi-user-check' : 'pi-user'"></i>
          <span *ngIf="user" class="profile-name">{{ user.displayName || user.email }}</span>
        </button>

        <!-- Mobile hamburger -->
        <button type="button" class="hamburger-btn" (click)="mobileMenuOpen = !mobileMenuOpen">
          <i class="pi" [ngClass]="mobileMenuOpen ? 'pi-times' : 'pi-bars'"></i>
        </button>
      </div>
    </nav>

    <!-- Mobile menu dropdown -->
    <div class="mobile-menu" *ngIf="mobileMenuOpen" (click)="mobileMenuOpen = false">
      <a routerLink="/weekly-quiz" class="mobile-link">This Week's Quiz</a>
      <a routerLink="/login" class="mobile-link">Fifty+</a>
      <a routerLink="/find-a-venue" class="mobile-link">Find a Venue</a>
      <a href="https://theweeklyfifty.com.au/pshop/" target="_blank" class="mobile-link">Fifty Shop</a>
      <div class="mobile-divider"></div>
      <a *ngIf="!user" routerLink="/login" class="mobile-link">Login / Sign Up</a>
      <ng-container *ngIf="user">
        <a [routerLink]="['/profile', user.uid]" class="mobile-link">Profile</a>
        <a (click)="logout()" class="mobile-link" style="cursor:pointer">Logout</a>
      </ng-container>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
    }

    .public-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 1.5rem;
      background: transparent;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(251, 226, 223, 0.15);
    }

    /* Breadcrumb overrides */
    :host ::ng-deep .public-breadcrumb {
      background: transparent !important;
      border: none !important;
      padding: 0 !important;
    }

    :host ::ng-deep .public-breadcrumb .p-breadcrumb-list {
      gap: 0.25rem;
    }

    :host ::ng-deep .public-breadcrumb .p-menuitem-link,
    :host ::ng-deep .public-breadcrumb .p-menuitem-text,
    :host ::ng-deep .public-breadcrumb .p-menuitem-icon,
    :host ::ng-deep .public-breadcrumb .p-breadcrumb-separator {
      color: var(--fifty-pink, #fbe2df) !important;
      opacity: 0.85;
      font-size: 0.9rem;
    }

    :host ::ng-deep .public-breadcrumb .p-menuitem-link:hover .p-menuitem-text,
    :host ::ng-deep .public-breadcrumb .p-menuitem-link:hover .p-menuitem-icon {
      opacity: 1;
    }

    /* Right section */
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .nav-link {
      color: var(--fifty-pink, #fbe2df);
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.85;
      transition: opacity 0.2s ease;
    }

    .nav-link:hover,
    .nav-link.active-link {
      opacity: 1;
    }

    .profile-btn {
      background: rgba(251, 226, 223, 0.15);
      border: 1px solid rgba(251, 226, 223, 0.3);
      color: var(--fifty-pink, #fbe2df);
      border-radius: 1.25rem;
      padding: 0.35rem 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      transition: background 0.2s ease;
      font-size: 1rem;
    }

    .profile-btn:hover {
      background: rgba(251, 226, 223, 0.25);
    }

    .profile-name {
      font-size: 0.75rem;
      font-weight: 600;
      max-width: 8rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hamburger-btn {
      display: none;
      background: transparent;
      border: none;
      color: var(--fifty-pink, #fbe2df);
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem;
    }

    /* Mobile menu */
    .mobile-menu {
      display: none;
      position: fixed;
      top: 3rem;
      left: 0;
      right: 0;
      z-index: 999;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      padding: 1rem 1.5rem;
      flex-direction: column;
      gap: 0.75rem;
    }

    .mobile-link {
      color: var(--fifty-pink, #fbe2df);
      text-decoration: none;
      font-size: 1rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 0.5rem 0;
    }

    .mobile-divider {
      height: 1px;
      background: rgba(251, 226, 223, 0.2);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .nav-links {
        display: none;
      }

      .profile-btn {
        display: none;
      }

      .hamburger-btn {
        display: flex;
      }

      .mobile-menu {
        display: flex;
      }
    }
  `]
})
export class PublicTopbarComponent implements OnInit, OnDestroy {
  breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: '/home' };
  breadcrumbItems: MenuItem[] = [];
  profileItems: MenuItem[] = [];
  user: AppUser | null = null;
  mobileMenuOpen = false;

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.updateBreadcrumbs(this.router.url);

    this.subs.push(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(e => {
          this.updateBreadcrumbs(e.urlAfterRedirects);
          this.mobileMenuOpen = false;
        })
    );

    this.subs.push(
      this.authService.user$.subscribe(user => {
        this.user = user;
        this.buildProfileMenu();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  logout(): void {
    this.authService.logout();
  }

  private updateBreadcrumbs(url: string): void {
    const path = url.split('?')[0].split('#')[0].replace(/^\//, '');
    const label = ROUTE_LABELS[path];
    this.breadcrumbItems = label ? [{ label }] : [{ label: path }];
  }

  private buildProfileMenu(): void {
    if (this.user) {
      this.profileItems = [
        { label: 'Profile', icon: 'pi pi-user', command: () => this.router.navigate(['/profile', this.user!.uid]) },
        { label: 'Logout', icon: 'pi pi-sign-out', command: () => this.authService.logout() },
      ];
    } else {
      this.profileItems = [
        { label: 'Login / Sign Up', icon: 'pi pi-sign-in', command: () => this.router.navigate(['/login']) },
      ];
    }
  }
}
