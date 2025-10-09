import { Component, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { Popover, PopoverModule } from 'primeng/popover';

@Component({
  selector: 'topbar-widget',
  standalone: true,
  imports: [RouterModule, ButtonModule, RippleModule, PopoverModule],
  template: `
      <div class="flex items-center justify-between px-6 py-3 w-full">
        <!-- Left: Logo -->
        <a routerLink="/" class="flex items-center space-x-2">
          <img
            src="assets/logos/logo.png"
            alt="My Logo"
            class="h-10 w-auto object-contain"
          />
        </a>

        <!-- Right: Desktop nav + buttons -->
        <div class="hidden lg:flex items-center gap-10">
          <nav class="flex gap-8 items-center">
            <a (click)="scrollTo('home')" pRipple class="text-xl font-medium text-surface-900 dark:text-surface-0 hover:text-primary">Home</a>
            <a (click)="scrollTo('features')" pRipple class="text-xl font-medium text-surface-900 dark:text-surface-0 hover:text-primary">The Fifty</a>
            <a (click)="scrollTo('highlights')" pRipple class="text-xl font-medium text-surface-900 dark:text-surface-0 hover:text-primary">Shop</a>
            <a (click)="scrollTo('pricing')" pRipple class="text-xl font-medium text-surface-900 dark:text-surface-0 hover:text-primary">Contact Us</a>
          </nav>
          <button
            pButton
            pRipple
            label="Login"
            routerLink="/auth/login"
            [rounded]="true"
            class="font-semibold"
          ></button>
        </div>

        <!-- Right: Mobile hamburger -->
        <button
          pButton
          pRipple
          type="button"
          icon="pi pi-bars"
          [text]="true"
          [rounded]="true"
          class="lg:hidden ml-auto text-xl"
          (click)="mobilePopover.toggle($event)"
        ></button>
      </div>

      <!-- Popover placed OUTSIDE flex container so it doesn't affect spacing -->
      <p-popover #mobilePopover>
        <div class="flex flex-col gap-4 p-4 w-56 bg-surface-0 dark:bg-surface-900">
          <a (click)="navigateAndClose('home')" pRipple class="text-lg text-surface-900 dark:text-surface-0">Home</a>
          <a (click)="navigateAndClose('features')" pRipple class="text-lg text-surface-900 dark:text-surface-0">The Fifty</a>
          <a (click)="navigateAndClose('highlights')" pRipple class="text-lg text-surface-900 dark:text-surface-0">Shop</a>
          <a (click)="navigateAndClose('pricing')" pRipple class="text-lg text-surface-900 dark:text-surface-0">Contact Us</a>
          <button
            pButton
            pRipple
            label="Login"
            routerLink="/auth/login"
            [rounded]="true"
            class="mt-2"
            (click)="mobilePopover.hide()"
          ></button>
        </div>
      </p-popover>
  `,
  styles: [`
    :host ::ng-deep .p-popover {
      border-radius: 1rem;
      overflow: hidden;
      box-shadow: 0 10px 20px rgba(0,0,0,0.15);
    }
  `]
})
export class TopbarWidget {
  @ViewChild('mobilePopover') mobilePopover!: Popover;

  constructor(private router: Router) {}

  scrollTo(fragment: string) {
    this.router.navigate(['/landing'], { fragment });
  }

  navigateAndClose(fragment: string) {
    this.scrollTo(fragment);
    this.mobilePopover.hide();
  }
}
