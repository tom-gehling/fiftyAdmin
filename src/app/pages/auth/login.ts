import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { AppFloatingConfigurator } from '../../layout/component/app.floatingconfigurator';
import { AuthService } from '@/shared/services/auth.service';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    PasswordModule,
    FormsModule,
    RippleModule,
    AppFloatingConfigurator
  ],
  template: `
    <app-floating-configurator />
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
      <div class="flex flex-col items-center justify-center">
        <div
          style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
          <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
            <div class="text-center mb-8">
              <img
  src="/assets/logos/fiftyAdminLogo.png"
  alt="Fifty Admin Logo"
  class="mx-auto mb-4"
  style="width: 30vw; max-width: 200px; height: auto;"
/>
            </div>

            <!-- Mode Toggle -->
            <div class="flex justify-center mb-6">
              <div class="flex bg-surface-100 dark:bg-surface-800 rounded-lg p-1">
                <button
                  type="button"
                  [class.bg-primary]="!isRegisterMode"
                  [class.text-white]="!isRegisterMode"
                  [class.text-surface-600]="isRegisterMode"
                  class="px-6 py-2 rounded-md font-medium transition-colors"
                  (click)="isRegisterMode = false">
                  Sign In
                </button>
                <button
                  type="button"
                  [class.bg-primary]="isRegisterMode"
                  [class.text-white]="isRegisterMode"
                  [class.text-surface-600]="!isRegisterMode"
                  class="px-6 py-2 rounded-md font-medium transition-colors"
                  (click)="isRegisterMode = true">
                  Register
                </button>
              </div>
            </div>

            <div>
              <!-- Social Sign-In Buttons -->
              <div class="mb-6">
                <p-button 
                  label="Continue with Google" 
                  icon="pi pi-google" 
                  styleClass="w-full mb-3" 
                  [outlined]="true"
                  [loading]="loadingGoogle" 
                  (click)="onGoogleSignIn()">
                </p-button>
                <p-button 
                  label="Continue with Apple" 
                  icon="pi pi-apple" 
                  styleClass="w-full" 
                  [outlined]="true"
                  [loading]="loadingApple" 
                  (click)="onAppleSignIn()">
                </p-button>
              </div>

              <!-- Divider -->
              <div class="flex items-center my-6">
                <div class="flex-1 border-t border-surface-300 dark:border-surface-700"></div>
                <span class="px-4 text-surface-500 text-sm">or</span>
                <div class="flex-1 border-t border-surface-300 dark:border-surface-700"></div>
              </div>

              <!-- Display Name (only for registration) -->
              <div *ngIf="isRegisterMode" class="mb-6">
                <label for="displayName"
                  class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Display Name</label>
                <input pInputText id="displayName" type="text" placeholder="Your name (optional)"
                  class="w-full" [(ngModel)]="displayName" />
              </div>

              <label for="email1"
                class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
              <input pInputText id="email1" type="text" placeholder="Email address"
                class="w-full mb-8" [(ngModel)]="email" />

              <label for="password1"
                class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Password</label>
              <p-password id="password1" [(ngModel)]="password" placeholder="Password" [toggleMask]="true"
                styleClass="mb-4" [fluid]="true" [feedback]="isRegisterMode"></p-password>

              <!-- Confirm Password (only for registration) -->
              <div *ngIf="isRegisterMode" class="mb-4">
                <label for="confirmPassword1"
                  class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Confirm Password</label>
                <p-password id="confirmPassword1" [(ngModel)]="confirmPassword" placeholder="Confirm password" [toggleMask]="true"
                  styleClass="mb-4" [fluid]="true" [feedback]="false"></p-password>
              </div>

              <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                <div class="flex items-center">
                  <p-checkbox [(ngModel)]="rememberMe" id="rememberme1" binary class="mr-2"></p-checkbox>
                  <label for="rememberme1">Remember me</label>
                </div>
                <span *ngIf="!isRegisterMode" class="font-medium no-underline ml-2 text-right cursor-pointer text-primary">Forgot password?</span>
              </div>

              <p-button 
                [label]="isRegisterMode ? 'Create Account' : 'Sign In'" 
                styleClass="w-full" 
                [loading]="loading" 
                (click)="onSubmit()">
              </p-button>

              <div *ngIf="error" class="text-red-500 mt-2 text-center">{{ error }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class Login {
  email: string = '';
  password: string = '';
  confirmPassword: string = '';
  displayName: string = '';
  rememberMe: boolean = false;
  loading = false;
  loadingGoogle = false;
  loadingApple = false;
  error: string | null = null;
  isRegisterMode: boolean = false;

  constructor(private auth: AuthService, private router: Router) { }

  async onSubmit() {
    this.loading = true;
    this.error = null;

    try {
      // Validation
      if (!this.email || !this.password) {
        this.error = 'Please fill in all required fields';
        this.loading = false;
        return;
      }

      if (this.isRegisterMode) {
        // Registration validation
        if (this.password !== this.confirmPassword) {
          this.error = 'Passwords do not match';
          this.loading = false;
          return;
        }

        if (this.password.length < 6) {
          this.error = 'Password must be at least 6 characters';
          this.loading = false;
          return;
        }

        // Register new user
        const user = await this.auth.registerEmailPassword(
          this.email,
          this.password,
          this.displayName || undefined,
          this.rememberMe
        );

        if (!user) return;
      } else {
        // Login existing user
        const user = await this.auth.loginEmailPassword(this.email, this.password, this.rememberMe);

        if (!user) return;
      }

      // Get admin/member status (from Firestore/UserService)
      const isAdmin = await firstValueFrom(this.auth.isAdmin$);
      const isMember = await firstValueFrom(this.auth.isMember$);

      if (isAdmin) {
        this.router.navigate(['/fiftyPlus']);
      } else if (isMember) {
        this.router.navigate(['/fiftyPlus']);
      } else {
        this.router.navigate(['/landing']); // fallback for non-fiftyPlus
      }
    } catch (err: any) {
      this.error = err.message ?? (this.isRegisterMode ? 'Registration failed' : 'Login failed');
    } finally {
      this.loading = false;
    }
  }

  async onGoogleSignIn() {
    this.loadingGoogle = true;
    this.error = null;

    try {
      const user = await this.auth.signInWithGoogle();
      if (!user) return;

      // Navigate based on user role
      const isAdmin = await firstValueFrom(this.auth.isAdmin$);
      const isMember = await firstValueFrom(this.auth.isMember$);

      if (isAdmin) {
        this.router.navigate(['/fiftyPlus']);
      } else if (isMember) {
        this.router.navigate(['/fiftyPlus']);
      } else {
        this.router.navigate(['/landing']);
      }
    } catch (err: any) {
      this.error = err.message ?? 'Google sign-in failed';
    } finally {
      this.loadingGoogle = false;
    }
  }

  async onAppleSignIn() {
    this.loadingApple = true;
    this.error = null;

    try {
      const user = await this.auth.signInWithApple();
      if (!user) return;

      // Navigate based on user role
      const isAdmin = await firstValueFrom(this.auth.isAdmin$);
      const isMember = await firstValueFrom(this.auth.isMember$);

      if (isAdmin) {
        this.router.navigate(['/fiftyPlus']);
      } else if (isMember) {
        this.router.navigate(['/fiftyPlus']);
      } else {
        this.router.navigate(['/landing']);
      }
    } catch (err: any) {
      this.error = err.message ?? 'Apple sign-in failed';
    } finally {
      this.loadingApple = false;
    }
  }
}
