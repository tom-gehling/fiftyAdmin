import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Subscription } from 'rxjs';
import { TagInvite } from '@/shared/models/tagInvite.model';
import { TagInviteService } from '@/shared/services/tag-invite.service';
import { NotifyService } from '@/shared/services/notify.service';

@Component({
    standalone: true,
    selector: 'app-tag-invites-widget',
    imports: [CommonModule, ButtonModule],
    template: `
        <ng-container *ngIf="invites.length > 0">
            <div class="card p-4 sm:p-6 fiftyBorder flex flex-col gap-4" style="background: rgb(40, 40, 40); border-radius: 1rem;">
                <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center rounded-full" style="width: 2.5rem; height: 2.5rem; background: rgba(76, 251, 171, 0.15); border: 1px solid var(--fifty-neon-green);">
                        <i class="pi pi-users" style="color: var(--fifty-neon-green);"></i>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-lg font-semibold text-surface-900 dark:text-surface-0">You've been tagged</span>
                        <span class="text-sm text-gray-400">Hit accept and the score's on your stats.</span>
                    </div>
                </div>

                <ul class="list-none p-0 m-0 flex flex-col gap-3">
                    <li *ngFor="let invite of invites" class="flex items-center justify-between gap-3 p-3" style="background: rgba(255,255,255,0.04); border-radius: 0.75rem;">
                        <div class="flex flex-col min-w-0">
                            <span class="font-medium truncate">
                                <strong>{{ invite.inviterDisplayName }}</strong> tagged you on their {{ invite.score }}/{{ invite.total }}
                            </span>
                            <span class="text-xs text-gray-400">Quiz #{{ invite.quizId }}</span>
                        </div>
                        <div class="flex gap-2 flex-shrink-0">
                            <button class="px-3 py-1 rounded text-sm font-semibold" [disabled]="busy[invite.resultId]" (click)="respond(invite, false)" style="background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8);">Nah</button>
                            <button class="px-3 py-1 rounded text-sm font-semibold" [disabled]="busy[invite.resultId]" (click)="respond(invite, true)" style="background: var(--fifty-neon-green); color: #1a1a1a;">Count it</button>
                        </div>
                    </li>
                </ul>
            </div>
        </ng-container>
    `
})
export class TagInvitesWidget implements OnInit, OnDestroy {
    private inviteService = inject(TagInviteService);
    private notify = inject(NotifyService);
    private sub?: Subscription;

    invites: TagInvite[] = [];
    busy: Record<string, boolean> = {};

    ngOnInit() {
        this.sub = this.inviteService.pendingInvites$().subscribe((invites) => {
            this.invites = invites;
        });
    }

    ngOnDestroy() {
        this.sub?.unsubscribe();
    }

    async respond(invite: TagInvite, accept: boolean): Promise<void> {
        if (this.busy[invite.resultId]) return;
        this.busy[invite.resultId] = true;
        try {
            await this.inviteService.respond(invite.resultId, accept);
            this.notify.success(accept ? 'Locked in' : 'All good');
        } catch (err: any) {
            console.error('Failed to respond to tag invite', err);
            this.notify.error(err?.message || "Couldn't update that one");
        } finally {
            this.busy[invite.resultId] = false;
        }
    }
}
