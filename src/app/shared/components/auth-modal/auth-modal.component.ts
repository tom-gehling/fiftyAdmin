import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '@/shared/services/auth.service';
import { AuthModalService } from '@/shared/services/auth-modal.service';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-auth-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, CheckboxModule, DialogModule, DividerModule, InputTextModule, PasswordModule],
    template: `
        <p-dialog
            [(visible)]="visible"
            [modal]="true"
            [dismissableMask]="true"
            [closable]="true"
            [style]="{ width: 'min(480px, 95vw)' }"
            [contentStyle]="{ padding: '0', borderRadius: '53px', overflow: 'hidden' }"
            [showHeader]="false"
            (onHide)="onHide()"
        >
            <div class="bg-surface-0 dark:bg-surface-900 py-10 px-8 sm:px-12" style="border-radius: 53px">

                <!-- Logo -->
                <div class="text-center mb-6">
                    <img src="/assets/logos/logo.png" alt="Fifty+" class="mx-auto mb-3" style="width: 50%; height: auto;" />
                </div>

                <!-- Login form -->
                @if (!isRegisterMode) {
                    <div>
                        <label class="block text-surface-900 dark:text-surface-0 text-lg font-medium mb-2">Email</label>
                        <input pInputText type="text" placeholder="Email address" class="w-full mb-5" [(ngModel)]="email" (keyup.enter)="onSubmit()" />

                        <label class="block text-surface-900 dark:text-surface-0 font-medium text-lg mb-2">Password</label>
                        <p-password [(ngModel)]="password" placeholder="Password" [toggleMask]="true" styleClass="mb-3" [fluid]="true" [feedback]="false" (keyup.enter)="onSubmit()"></p-password>

                        <div class="flex items-center justify-between mb-6">
                            <div class="flex items-center">
                                <p-checkbox [(ngModel)]="rememberMe" id="modalRememberMe" binary class="mr-2"></p-checkbox>
                                <label for="modalRememberMe" class="text-sm">Remember me</label>
                            </div>
                            <span class="text-sm cursor-pointer text-primary">Forgot password?</span>
                        </div>

                        <p-button label="Sign In" styleClass="w-full mb-4" [loading]="loading" (click)="onSubmit()"></p-button>

                        <p-divider align="center"><span class="text-surface-500 text-sm px-2">or</span></p-divider>

                        <p-button label="Continue with Google" icon="pi pi-google" styleClass="w-full mb-3" [outlined]="true" [loading]="loadingGoogle" (click)="onGoogleSignIn()"></p-button>
                        <p-button label="Continue with Apple" icon="pi pi-apple" styleClass="w-full mb-4" [outlined]="true" [loading]="loadingApple" (click)="onAppleSignIn()"></p-button>

                        @if (error) {
                            <p class="text-red-500 text-center text-sm mb-4">{{ error }}</p>
                        }

                        <div class="mb-6"></div>

                        <p class="text-center text-surface-300 text-xl font-bold">
                            New to The Weekly Fifty?
                            <a class="text-primary cursor-pointer font-medium" (click)="switchMode('register')">  Create an account</a>
                        </p>
                    </div>
                }

                <!-- Register form -->
                @if (isRegisterMode) {
                    <div>
                        <label class="block text-surface-900 dark:text-surface-0 text-lg font-medium mb-2">Display Name</label>
                        <input pInputText type="text" placeholder="Your name (can be changed later)" class="w-full mb-5" [(ngModel)]="displayName" />

                        <label class="block text-surface-900 dark:text-surface-0 text-lg font-medium mb-2">Email</label>
                        <input pInputText type="text" placeholder="Email address" class="w-full mb-5" [(ngModel)]="email" />

                        <label class="block text-surface-900 dark:text-surface-0 font-medium text-lg mb-2">Password</label>
                        <p-password [(ngModel)]="password" placeholder="Password" [toggleMask]="true" styleClass="mb-5" [fluid]="true" [feedback]="true"></p-password>

                        <label class="block text-surface-900 dark:text-surface-0 font-medium text-lg mb-2">Confirm Password</label>
                        <p-password [(ngModel)]="confirmPassword" placeholder="Confirm password" [toggleMask]="true" styleClass="mb-6" [fluid]="true" [feedback]="false"></p-password>

                        <p-button label="Create Account" styleClass="w-full mb-4" [loading]="loading" (click)="onSubmit()"></p-button>

                        <p-divider align="center"><span class="text-surface-500 text-sm px-2">or</span></p-divider>

                        <p-button label="Continue with Google" icon="pi pi-google" styleClass="w-full mb-3" [outlined]="true" [loading]="loadingGoogle" (click)="onGoogleSignIn()"></p-button>
                        <p-button label="Continue with Apple" icon="pi pi-apple" styleClass="w-full mb-4" [outlined]="true" [loading]="loadingApple" (click)="onAppleSignIn()"></p-button>

                        @if (error) {
                            <p class="text-red-500 text-center text-sm mb-4">{{ error }}</p>
                        }

                        <p class="text-center text-surface-500 text-sm">
                            Already have an account?
                            <a class="text-primary cursor-pointer font-medium" (click)="switchMode('login')"> Sign in</a>
                        </p>
                    </div>
                }
            </div>
        </p-dialog>
    `,
})
export class AuthModalComponent implements OnInit {
    visible = false;
    isRegisterMode = false;

    email = '';
    password = '';
    confirmPassword = '';
    displayName = '';
    rememberMe = false;
    loading = false;
    loadingGoogle = false;
    loadingApple = false;
    error: string | null = null;

    constructor(
        private auth: AuthService,
        private authModal: AuthModalService
    ) {}

    ngOnInit() {
        this.authModal.visible$.subscribe((v) => (this.visible = v));
        this.authModal.mode$.subscribe((m) => {
            this.isRegisterMode = m === 'register';
            this.resetForm();
        });
    }

    onHide() {
        this.authModal.close();
        this.resetForm();
    }

    switchMode(mode: 'login' | 'register') {
        this.authModal.mode$.next(mode);
        this.resetForm();
    }

    private resetForm() {
        this.email = '';
        this.password = '';
        this.confirmPassword = '';
        this.displayName = '';
        this.error = null;
    }

    async onSubmit() {
        this.loading = true;
        this.error = null;

        try {
            if (!this.email || !this.password) {
                this.error = 'Please fill in all required fields';
                return;
            }

            if (this.isRegisterMode) {
                if (this.password !== this.confirmPassword) {
                    this.error = 'Passwords do not match';
                    return;
                }
                if (this.password.length < 6) {
                    this.error = 'Password must be at least 6 characters';
                    return;
                }
                const user = await this.auth.registerEmailPassword(this.email, this.password, this.displayName || undefined, this.rememberMe);
                if (!user) return;
            } else {
                const user = await this.auth.loginEmailPassword(this.email, this.password, this.rememberMe);
                if (!user) return;
            }

            this.authModal.close();
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
            this.authModal.close();
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
            this.authModal.close();
        } catch (err: any) {
            this.error = err.message ?? 'Apple sign-in failed';
        } finally {
            this.loadingApple = false;
        }
    }
}
