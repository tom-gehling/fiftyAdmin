import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '@/shared/services/auth.service';
import { UserService } from '@/shared/services/user.service';
import { MembershipService } from '@/shared/services/membership.service';

@Component({
  standalone: true,
  selector: 'app-profile-page',
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule],
  template: `
    <div class="card p-6">
      <!-- User Name Header -->
      <h2 class="text-2xl font-semibold mb-4">{{ displayName || 'Guest User' }}</h2>

      <hr class="border-t mb-6" style="border-color: var(--fifty-neon-green);" />

      <!-- Profile Info -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
        <div>
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">Joined</div>
          <div class="text-lg font-semibold">{{ joinedAt ? (joinedAt | date: 'mediumDate') : '—' }}</div>
        </div>
        <div>
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">Member Status</div>
          <div class="text-lg font-semibold">{{ membershipType }}</div>
        </div>
        <div>
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">Followers</div>
          <div class="text-lg font-semibold">{{ followers }}</div>
        </div>
        <div>
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">Following</div>
          <div class="text-lg font-semibold">{{ following }}</div>
        </div>
      </div>

      <hr class="border-t mb-6" style="border-color: var(--fifty-neon-green);" />

      <!-- Display Name -->
      <div class="mb-4">
        <label for="displayName" class="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Display Name
        </label>
        <div class="flex gap-3">
          <input pInputText id="displayName" type="text" class="flex-1"
            [(ngModel)]="displayName" placeholder="Enter display name" />
          <p-button label="Save" icon="pi pi-check"
            [loading]="savingName" [disabled]="!displayName?.trim()"
            (click)="onSaveName()"></p-button>
        </div>
        <div *ngIf="nameSuccess" class="text-green-500 text-sm mt-2">{{ nameSuccess }}</div>
        <div *ngIf="nameError" class="text-red-500 text-sm mt-2">{{ nameError }}</div>
      </div>

      <!-- Password Reset -->
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">
          A password reset link will be sent to <strong>{{ email }}</strong>
        </p>
        <p-button label="Send Password Reset Email" icon="pi pi-envelope"
          [outlined]="true" [loading]="sendingReset"
          (click)="onSendReset()"></p-button>
        <div *ngIf="resetSuccess" class="text-green-500 text-sm mt-2">{{ resetSuccess }}</div>
        <div *ngIf="resetError" class="text-red-500 text-sm mt-2">{{ resetError }}</div>
      </div>
    </div>
  `
})
export class ProfilePage implements OnInit {
  private auth = inject(Auth);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private membershipService = inject(MembershipService);

  displayName = '';
  email = '';
  joinedAt: Date | null = null;
  membershipType = '';
  followers = 0;
  following = 0;

  savingName = false;
  nameSuccess: string | null = null;
  nameError: string | null = null;

  sendingReset = false;
  resetSuccess: string | null = null;
  resetError: string | null = null;

  async ngOnInit() {
    onAuthStateChanged(this.auth, async user => {
      if (!user) return;

      this.displayName = user.displayName || '';
      this.email = user.email || '';

      this.membershipService.membership$.subscribe(tier => {
        this.membershipType = tier;
      });

      const userDoc = await firstValueFrom(this.userService.getUser(user.uid));
      this.joinedAt = (userDoc?.createdAt as any)?.toDate?.() ?? new Date();
      this.followers = userDoc?.followersCount ?? 0;
      this.following = userDoc?.followingCount ?? 0;
    });
  }

  async onSaveName() {
    if (!this.displayName?.trim()) return;
    this.savingName = true;
    this.nameSuccess = null;
    this.nameError = null;

    try {
      await this.authService.updateDisplayName(this.displayName.trim());
      this.nameSuccess = 'Display name updated successfully.';
    } catch (err: any) {
      this.nameError = err.message ?? 'Failed to update display name.';
    } finally {
      this.savingName = false;
    }
  }

  async onSendReset() {
    if (!this.email) return;
    this.sendingReset = true;
    this.resetSuccess = null;
    this.resetError = null;

    try {
      await this.authService.sendPasswordReset(this.email);
      this.resetSuccess = 'Password reset email sent. Check your inbox.';
    } catch (err: any) {
      this.resetError = err.message ?? 'Failed to send reset email.';
    } finally {
      this.sendingReset = false;
    }
  }
}
