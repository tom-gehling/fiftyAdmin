import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '@/shared/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    PasswordModule,
  ],
  template: `
    <p-dialog
      header="Sign In"
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '400px' }"
      [draggable]="false"
      [resizable]="false">

      <div class="flex flex-col gap-4 pt-2">
        <div>
          <label for="lp-email" class="block font-medium mb-2">Email</label>
          <input pInputText id="lp-email" type="text" placeholder="Email address" class="w-full" [(ngModel)]="email" />
        </div>

        <div>
          <label for="lp-password" class="block font-medium mb-2">Password</label>
          <p-password id="lp-password" [(ngModel)]="password" placeholder="Password" [toggleMask]="true"
            [fluid]="true" [feedback]="false"></p-password>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <p-checkbox [(ngModel)]="rememberMe" id="lp-remember" binary></p-checkbox>
            <label for="lp-remember">Remember me</label>
          </div>
        </div>

        <div *ngIf="error" class="text-red-500 text-sm text-center">{{ error }}</div>

        <p-button label="Sign In" styleClass="w-full" [loading]="loading" (click)="onSubmit()"></p-button>
      </div>
    </p-dialog>
  `
})
export class LoginPanelComponent {
  @Output() loggedIn = new EventEmitter<void>();

  visible = false;
  email = '';
  password = '';
  rememberMe = false;
  loading = false;
  error: string | null = null;

  constructor(private auth: AuthService) {}

  open() {
    this.email = '';
    this.password = '';
    this.error = null;
    this.visible = true;
  }

  async onSubmit() {
    if (!this.email || !this.password) {
      this.error = 'Please fill in all fields';
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      await this.auth.loginEmailPassword(this.email, this.password, this.rememberMe);
      this.visible = false;
      this.loggedIn.emit();
    } catch (err: any) {
      this.error = err.message ?? 'Login failed';
    } finally {
      this.loading = false;
    }
  }
}
