import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserHighlights } from '@/shared/models/userStats.model';

@Component({
    standalone: true,
    selector: 'app-stats-highlights',
    imports: [CommonModule, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card p-4 sm:p-6 fiftyBorder h-full overflow-hidden" style="background: rgb(40, 40, 40); border-radius: 1rem;">
            <div class="flex items-center justify-between mb-1">
                <h3 class="text-2xl font-semibold m-0">Highlights</h3>
                <i class="pi pi-sparkles" style="color: var(--fifty-neon-green);"></i>
            </div>
            <p class="text-base text-gray-400 mb-4">Mastermind moments and the ones that got away.</p>

            <ng-container *ngIf="highlights?.hardGotRight?.length">
                <div class="text-sm uppercase tracking-wide mb-2" style="color: var(--fifty-neon-green);">Hardest you nailed</div>
                <div class="space-y-2 mb-4">
                    <a *ngFor="let h of highlights.hardGotRight" [routerLink]="['/fiftyPlus/archives', h.quizId]" class="flex items-center justify-between gap-3 p-3 rounded-lg no-underline transition-colors" style="background: rgba(76, 251, 171, 0.07); border: 1px solid rgba(76, 251, 171, 0.2);">
                        <div class="flex-1 min-w-0">
                            <div class="text-base font-medium break-words">Quiz #{{ h.quizId }} · {{ h.questionId }}</div>
                            <div class="text-sm text-gray-400 break-words">Only {{ h.globalCorrectRate | number: '1.0-1' }}% of players got this right.</div>
                        </div>
                        <i class="pi pi-arrow-right text-sm flex-shrink-0" style="color: var(--fifty-neon-green);"></i>
                    </a>
                </div>
            </ng-container>

            <ng-container *ngIf="highlights?.easyGotWrong?.length">
                <div class="text-sm uppercase tracking-wide text-gray-400 mb-2">We'll let these slide</div>
                <div class="space-y-2">
                    <a *ngFor="let e of highlights.easyGotWrong" [routerLink]="['/fiftyPlus/archives', e.quizId]" class="flex items-center justify-between gap-3 p-3 rounded-lg no-underline transition-colors" style="background: rgba(251, 226, 223, 0.05); border: 1px solid rgba(251, 226, 223, 0.18);">
                        <div class="flex-1 min-w-0">
                            <div class="text-base font-medium break-words">Quiz #{{ e.quizId }} · {{ e.questionId }}</div>
                            <div class="text-sm text-gray-400 break-words">{{ e.globalCorrectRate | number: '1.0-1' }}% of players got this one. Happens to everyone.</div>
                        </div>
                        <i class="pi pi-arrow-right text-sm text-gray-400 flex-shrink-0"></i>
                    </a>
                </div>
            </ng-container>

            <div *ngIf="!highlights?.hardGotRight?.length && !highlights?.easyGotWrong?.length" class="text-center text-gray-400 py-6">Highlights unlock once you've answered a few quizzes.</div>
        </div>
    `
})
export class HighlightsWidget {
    @Input({ required: true }) highlights!: UserHighlights;
}
