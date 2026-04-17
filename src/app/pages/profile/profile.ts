import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Location } from '@angular/common';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { AuthService } from '@/shared/services/auth.service';
import { UserService } from '@/shared/services/user.service';
import { NotifyService } from '@/shared/services/notify.service';

@Component({
    standalone: true,
    selector: 'app-profile-page',
    imports: [FormsModule, DatePipe, ButtonModule, InputTextModule, CheckboxModule],
    template: `
        <div class="flex items-center justify-center py-16 px-4" style="min-height: calc(100vh - 4rem)">
            <div class="w-full max-w-2xl rounded-xl" style="background: #111; border: 1px solid rgba(255,255,255,0.08)">

                <!-- Header -->
                <div class="px-8 pt-8 pb-6" style="border-bottom: 1px solid rgba(255,255,255,0.08)">
                    <div class="flex items-center gap-4 mb-5">
                        <div class="flex items-center justify-center rounded-full font-bold text-xl flex-shrink-0"
                            style="width: 56px; height: 56px; background: var(--primary-color); color: #1a1a1a">
                            {{ initials }}
                        </div>
                        <div>
                            <h2 class="text-2xl font-semibold m-0">{{ displayName || 'Your Profile' }}</h2>
                            @if (isMember) {
                                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mt-1"
                                    style="background: rgba(76,251,171,0.15); color: var(--primary-color); border: 1px solid var(--primary-color)">
                                    <i class="pi pi-check-circle text-xs"></i> Fifty+ Member
                                </span>
                            }
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <div class="text-xs mb-1" style="color: rgba(255,255,255,0.45)">Joined</div>
                            <div class="text-sm font-medium">{{ joinedAt ? (joinedAt | date: 'mediumDate') : '—' }}</div>
                        </div>
                        <div>
                            <div class="text-xs mb-1" style="color: rgba(255,255,255,0.45)">Followers</div>
                            <div class="text-sm font-medium">{{ followers }}</div>
                        </div>
                        <div>
                            <div class="text-xs mb-1" style="color: rgba(255,255,255,0.45)">Following</div>
                            <div class="text-sm font-medium">{{ following }}</div>
                        </div>
                    </div>
                </div>

                <!-- Form fields -->
                <div class="px-8 py-6 flex flex-col gap-6">

                    <!-- Display Name -->
                    <div>
                        <label class="block text-sm font-medium mb-2" style="color: rgba(255,255,255,0.65)">Display Name</label>
                        <input pInputText type="text" class="w-full" [(ngModel)]="displayName" placeholder="Enter display name" />
                    </div>

                    <!-- Account -->
                    <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.5rem">
                        <h3 class="text-base font-semibold mb-4 m-0">Account</h3>
                        <div class="flex flex-col gap-2">
                            <p class="text-sm m-0" style="color: rgba(255,255,255,0.5)">Forgot your password? Send a reset link to <strong style="color: rgba(255,255,255,0.75)">{{ email }}</strong>.</p>
                            <div class="flex items-center gap-3">
                                <p-button label="Send Password Reset Email" icon="pi pi-envelope" [outlined]="true"
                                    [loading]="sendingReset" (click)="onSendReset()"></p-button>
                                @if (resetSuccess) {
                                    <span class="text-sm" style="color: var(--primary-color)">{{ resetSuccess }}</span>
                                }
                                @if (resetError) {
                                    <span class="text-sm text-red-400">{{ resetError }}</span>
                                }
                            </div>
                        </div>
                    </div>

                    <!-- Fifty+ Membership -->
                    @if (isMember) {
                        <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.5rem">
                            <h3 class="text-base font-semibold mb-1 m-0">Fifty+ Membership</h3>
                            <p class="text-sm mb-4 m-0" style="color: rgba(255,255,255,0.5)">Manage your subscription, update payment details, or cancel.</p>
                            <div class="flex items-center gap-3">
                                <p-button label="Manage Billing" icon="pi pi-credit-card" [outlined]="true"
                                    [loading]="loadingPortal" (click)="onManageBilling()"></p-button>
                                @if (portalError) {
                                    <span class="text-sm text-red-400">{{ portalError }}</span>
                                }
                            </div>
                        </div>
                    }

                    <!-- Preferences -->
                    <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.5rem">
                        <h3 class="text-base font-semibold mb-4 m-0">Preferences</h3>
                        <div class="flex items-center gap-3">
                            <p-checkbox [(ngModel)]="disableStats" [binary]="true" inputId="disableStats"></p-checkbox>
                            <label for="disableStats" class="text-sm cursor-pointer" style="color: rgba(255,255,255,0.75)">
                                Don't record my quiz stats
                            </label>
                        </div>
                    </div>

                    <!-- Team Settings -->
                    <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.5rem">
                        <h3 class="text-base font-semibold mb-4 m-0">Team Settings</h3>
                        <div class="flex flex-col gap-4">
                            <div>
                                <label class="block text-sm font-medium mb-2" style="color: rgba(255,255,255,0.65)">Default Team Name</label>
                                <input pInputText type="text" class="w-full" [(ngModel)]="defaultTeamName" placeholder="Quizzy McQuizzFace" />
                            </div>
                            <div>
                                <label class="block text-sm font-medium mb-2" style="color: rgba(255,255,255,0.65)">Default Team Members</label>
                                <input pInputText type="text" class="w-full" [(ngModel)]="defaultTeamMembersText" />
                                <p class="text-xs mt-1 m-0" style="color: rgba(255,255,255,0.35)">Separate names with commas.</p>
                            </div>
                        </div>
                    </div>

                    

                    

                </div>

                <!-- Footer: Cancel / Save -->
                <div class="px-8 pb-8 flex items-center justify-end gap-3" style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.5rem">
                    @if (saveSuccess) {
                        <span class="text-sm mr-auto" style="color: var(--primary-color)">{{ saveSuccess }}</span>
                    }
                    @if (saveError) {
                        <span class="text-sm mr-auto text-red-400">{{ saveError }}</span>
                    }
                    <p-button label="Cancel" [outlined]="true" (click)="onCancel()"></p-button>
                    <p-button label="Save" icon="pi pi-check" [loading]="saving" (click)="onSave()"></p-button>
                </div>

            </div>
        </div>
    `
})
export class ProfilePage implements OnInit {
    private auth = inject(Auth);
    private location = inject(Location);
    private functions = inject(Functions);
    private authService = inject(AuthService);
    private userService = inject(UserService);
    private notify = inject(NotifyService);

    private uid = '';
    private snapshot = { displayName: '', defaultTeamName: '', defaultTeamMembersText: '', disableStats: false };

    displayName = '';
    email = '';
    joinedAt: Date | null = null;
    isMember = false;
    followers = 0;
    following = 0;

    defaultTeamName = '';
    defaultTeamMembersText = '';
    disableStats = false;

    saving = false;
    saveSuccess: string | null = null;
    saveError: string | null = null;

    sendingReset = false;
    resetSuccess: string | null = null;
    resetError: string | null = null;

    loadingPortal = false;
    portalError: string | null = null;

    get initials(): string {
        return (this.displayName || this.email || '?').slice(0, 1).toUpperCase();
    }

    async ngOnInit() {
        onAuthStateChanged(this.auth, async user => {
            if (!user) return;

            this.uid = user.uid;
            this.displayName = user.displayName || '';
            this.email = user.email || '';

            this.authService.isMember$.subscribe(val => {
                this.isMember = !!val;
            });

            const userDoc = await firstValueFrom(this.userService.getUser(user.uid));
            this.joinedAt = (userDoc?.createdAt as any)?.toDate?.() ?? new Date();
            this.followers = userDoc?.followersCount ?? 0;
            this.following = userDoc?.followingCount ?? 0;
            this.defaultTeamName = userDoc?.defaultTeamName ?? '';
            this.defaultTeamMembersText = (userDoc?.defaultTeamMembers ?? []).join(', ');
            this.disableStats = userDoc?.disableStats ?? false;

            this.saveSnapshot();
        });
    }

    private saveSnapshot() {
        this.snapshot = {
            displayName: this.displayName,
            defaultTeamName: this.defaultTeamName,
            defaultTeamMembersText: this.defaultTeamMembersText,
            disableStats: this.disableStats,
        };
    }

    onCancel() {
        this.displayName = this.snapshot.displayName;
        this.defaultTeamName = this.snapshot.defaultTeamName;
        this.defaultTeamMembersText = this.snapshot.defaultTeamMembersText;
        this.disableStats = this.snapshot.disableStats;
        this.location.back();
    }

    async onSave() {
        if (!this.uid) return;
        this.saving = true;
        this.saveSuccess = null;
        this.saveError = null;

        try {
            const defaultTeamMembers = this.defaultTeamMembersText
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            const patch: any = {
                defaultTeamName: this.defaultTeamName,
                defaultTeamMembers,
                disableStats: this.disableStats,
            };

            await this.userService.updateUser(this.uid, patch);

            if (this.displayName.trim() !== this.snapshot.displayName) {
                await this.authService.updateDisplayName(this.displayName.trim());
            }

            this.saveSnapshot();
            this.notify.success('Profile updated successfully');
            this.location.back();
        } catch (err: any) {
            this.saveError = err.message ?? 'Failed to save profile.';
        } finally {
            this.saving = false;
        }
    }

    async onSendReset() {
        if (!this.email) return;
        this.sendingReset = true;
        this.resetSuccess = null;
        this.resetError = null;

        try {
            await this.authService.sendPasswordReset(this.email);
            this.resetSuccess = 'Reset email sent. Check your inbox.';
        } catch (err: any) {
            this.resetError = err.message ?? 'Failed to send reset email.';
        } finally {
            this.sendingReset = false;
        }
    }

    async onManageBilling() {
        this.loadingPortal = true;
        this.portalError = null;

        try {
            const createPortalSession = httpsCallable<{ returnUrl: string }, { url: string }>(this.functions, 'createPortalSession');
            const result = await createPortalSession({ returnUrl: window.location.href });
            window.location.href = result.data.url;
        } catch (err: any) {
            this.portalError = err.message ?? 'Could not open billing portal.';
            this.loadingPortal = false;
        }
    }
}
