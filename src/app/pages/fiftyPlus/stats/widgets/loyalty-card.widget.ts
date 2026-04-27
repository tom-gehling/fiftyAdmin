import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserStatsSummary } from '@/shared/models/userStats.model';

@Component({
    standalone: true,
    selector: 'app-stats-loyalty-card',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="card p-4 sm:p-6 fiftyBorder h-full overflow-hidden" style="background: rgb(40, 40, 40); border-radius: 1rem;">
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-2xl font-semibold m-0">Loyalty</h3>
                <i class="pi pi-bolt" style="color: var(--fifty-neon-green);"></i>
            </div>

            <div class="flex items-center gap-3 py-3 min-w-0">
                <div class="text-7xl font-bold leading-none flex-shrink-0" style="color: var(--fifty-neon-green);">{{ data().weeklyStreak }}</div>
                <div class="min-w-0">
                    <div class="text-base font-medium">week streak</div>
                    <div class="text-sm text-gray-400 break-words">{{ streakCopy() }}</div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-3 border-t" style="border-color: rgba(76, 251, 171, 0.25);">
                <div>
                    <div class="text-3xl font-semibold">{{ data().longestWeeklyStreak }}</div>
                    <div class="text-sm uppercase tracking-wide text-gray-400">Longest streak</div>
                </div>
                <div>
                    <div class="text-3xl font-semibold">{{ data().totalWeeksPlayed }}</div>
                    <div class="text-sm uppercase tracking-wide text-gray-400">Weeks played</div>
                </div>
            </div>

            <div class="mt-4 text-base text-gray-300">
                {{ originCopy() }}
            </div>
        </div>
    `
})
export class LoyaltyCardWidget {
    private _data = signal<UserStatsSummary | null>(null);
    @Input({ required: true }) set summary(v: UserStatsSummary) {
        this._data.set(v);
    }

    data = computed(() => this._data() ?? ({ weeklyStreak: 0, longestWeeklyStreak: 0, totalWeeksPlayed: 0, firstQuizCompletedAt: null } as UserStatsSummary));

    streakCopy = computed(() => {
        const s = this.data().weeklyStreak;
        if (s >= 20) return 'Legendary commitment.';
        if (s >= 10) return 'Diabolical effort.';
        if (s >= 4) return "You've got the habit.";
        if (s >= 1) return 'Building momentum.';
        return 'Jump back in this week.';
    });

    originCopy = computed(() => {
        const first = this.data().firstQuizCompletedAt;
        if (!first) return 'Welcome to the Fifty.';
        const weeks = Math.max(1, Math.round((Date.now() - new Date(first).getTime()) / (7 * 24 * 60 * 60 * 1000)));
        return `You've been quizzing with us for ${weeks} weeks.`;
    });
}
