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
import { take } from 'rxjs';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RippleModule, AppFloatingConfigurator],
    template: `
        <app-floating-configurator />
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
                        <div class="text-center mb-8">
                            <!-- SVG Logo -->
                            <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Fifty Admin</div>
                            <span class="text-muted-color font-medium">Sign in to continue</span>
                        </div>

                        <div>
                            <label for="email1" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
                            <input pInputText id="email1" type="text" placeholder="Email address" class="w-full md:w-120 mb-8" [(ngModel)]="email" />

                            <label for="password1" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Password</label>
                            <p-password id="password1" [(ngModel)]="password" placeholder="Password" [toggleMask]="true" styleClass="mb-4" [fluid]="true" [feedback]="false"></p-password>

                            <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                                <div class="flex items-center">
                                    <p-checkbox [(ngModel)]="rememberMe" id="rememberme1" binary class="mr-2"></p-checkbox>
                                    <label for="rememberme1">Remember me</label>
                                </div>
                                <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary">Forgot password?</span>
                            </div>

                            <p-button 
                                label="Sign In" 
                                styleClass="w-full"
                                [loading]="loading"
                                (click)="onSubmit()"
                            ></p-button>

                            <div *ngIf="error" class="text-red-500 mt-2">{{ error }}</div>
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
    rememberMe: boolean = false;
    loading = false;
    error: string | null = null;

    constructor(private auth: AuthService, private router: Router) {}

    async onSubmit() {
    this.loading = true;
    this.error = null;

    try {
        const user = await this.auth.loginEmailPassword(this.email, this.password, this.rememberMe);

        if (!user) return;

        // Wait for admin/member status to be set
        const isAdmin = await this.auth.isAdmin$.pipe(take(1)).toPromise();
        const isMember = await this.auth.isMember$.pipe(take(1)).toPromise();

        if (isAdmin) {
            this.router.navigate(['/members']);
        } else if (isMember) {
            this.router.navigate(['/members']);
        } else {
            this.router.navigate(['/landing']); // fallback for non-members
        }
    } catch (err: any) {
        this.error = err.message ?? 'Login failed';
    } finally {
        this.loading = false;
    }
}

}
